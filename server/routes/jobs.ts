import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import platformLimits from '../../config/platform-limits.json' with { type: 'json' };
import { prisma } from '../../lib/prisma.ts';
import { cumulativeDisplayPercent, stepsRemaining } from '../../lib/progress-stages.ts';
import { chooseInitialResolution } from '../../lib/resolution.ts';
import { createJobForFingerprint, IntakeError } from '../../lib/job-intake.ts';
import { createBatchJobForFingerprint, BatchNotImplementedError } from '../../lib/batch-intake.ts';
import { getPresignedDownloadUrl } from '../services/storage.ts';
import { hashString } from '../../lib/crypto.ts';

const PRESET_VALUES = ['STATUS', 'CHAT', 'CUSTOM'] as const;
const DESTINATION_VALUES = ['WHATSAPP_NORMAL', 'WHATSAPP_HD', 'WHATSAPP_DOCUMENT', 'PREVIEW_WEB'] as const;

const createJobBodySchema = z.object({
  fileKey: z.string(),
  preset: z.enum(PRESET_VALUES),
  targetSizeMB: z.number().min(1).max(16).optional(),
  prioritizeDetail: z.boolean().optional(),
  destination: z.enum(DESTINATION_VALUES).optional(),
  fingerprint: z.string(),
});

// Scaffold only — see lib/batch-intake.ts. Body shape is settled ahead of
// the real implementation so the client contract doesn't have to change later.
const createBatchJobBodySchema = z.object({
  fileKeys: z.array(z.string()).min(2).max(10),
  preset: z.enum(PRESET_VALUES),
  targetSizeMB: z.number().min(1).max(16).optional(),
  prioritizeDetail: z.boolean().optional(),
  destination: z.enum(DESTINATION_VALUES).optional(),
  fingerprint: z.string(),
});

const jobsRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST /api/v1/jobs — Create job
  app.post('/api/v1/jobs', {
    schema: {
      body: createJobBodySchema,
    },
  }, async (request, reply) => {
    const { fileKey, preset, targetSizeMB, prioritizeDetail, destination, fingerprint } = request.body;

    try {
      const result = await createJobForFingerprint({
        fileKey,
        preset,
        targetSizeMB,
        prioritizeDetail,
        destination,
        fingerprint,
        ip: request.ip,
      });
      return reply.code(202).send(result);
    } catch (err) {
      if (err instanceof IntakeError) {
        return reply.code(err.statusCode).send({
          error: {
            code: err.code,
            message: err.message,
            ...(err.upsell !== undefined ? { upsell: err.upsell } : {}),
          },
        });
      }
      throw err;
    }
  });

  // POST /api/v1/jobs/batch — SCAFFOLD ONLY, not functional yet.
  // Always responds 501; see lib/batch-intake.ts for what real support needs.
  app.post('/api/v1/jobs/batch', {
    schema: {
      body: createBatchJobBodySchema,
    },
  }, async (request, reply) => {
    const { fileKeys, preset, targetSizeMB, prioritizeDetail, destination, fingerprint } = request.body;

    try {
      const result = await createBatchJobForFingerprint({
        fileKeys,
        preset,
        targetSizeMB,
        prioritizeDetail,
        destination,
        fingerprint,
        ip: request.ip,
      });
      return reply.code(202).send(result);
    } catch (err) {
      if (err instanceof BatchNotImplementedError) {
        return reply.code(err.statusCode).send({
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /api/v1/jobs/:jobId — Get job status
  app.get('/api/v1/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        outputs: true,
        sourceFile: true,
      },
    });

    if (!job) {
      return reply.code(404).send({
        error: { code: 'JOB_NOT_FOUND', message: `Job with ID ${jobId} not found` },
      });
    }

    const { fingerprint } = request.query as { fingerprint?: string };
    if (!fingerprint || hashString(fingerprint) !== job.fingerprintHash) {
      return reply.code(403).send({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this job' },
      });
    }

    // queuePosition is denormalized on Job.queuePosition, updated by workers
    const queuePosition = job.queuePosition || 0;

    const stageKey = job.status.toLowerCase();
    const isFailed = stageKey === 'failed';

    const progressPercent = isFailed ? 0 : cumulativeDisplayPercent(stageKey);
    const steps = isFailed ? 0 : stepsRemaining(stageKey);

    // Return app-relative download paths, NEVER storage URLs. The client must
    // not see Supabase presigned URLs (they embed the S3 access key id and
    // grant 24h direct access). Downloads go through the download route below,
    // which verifies ownership and redirects to a fresh server-side URL.
    const outputs = job.outputs.map((out) => ({
      id: out.id,
      segmentIndex: out.segmentIndex,
      downloadPath: `/api/v1/jobs/${job.id}/download/${out.id}?fingerprint=${encodeURIComponent(fingerprint)}`,
      sizeBytes: out.sizeBytes,
    }));

    let resolutionDropped = false;
    if (job.status === 'DONE' && job.mediaKind === 'VIDEO' && job.sourceFile && job.outputs.length > 0 && job.preset !== 'CUSTOM') {
      const sourceHeight = job.sourceFile.height || 0;
      const sourceWidth = job.sourceFile.width || 0;
      // Same preset cap the encode worker applies — sourced from the config
      // table, never hardcoded (AGENTS.md Q3).
      const presetMaxHeight = platformLimits[job.preset].maxResolution.height;
      const initialResolution = chooseInitialResolution(sourceWidth, sourceHeight, presetMaxHeight);

      const outputHeights = job.outputs.map((out) => out.height || 0);
      const hasDrop = outputHeights.some((h) => h > 0 && h < initialResolution.height);
      if (hasDrop) {
        resolutionDropped = true;
      }
    }

    return reply.send({
      jobId: job.id,
      status: job.status,
      stage: stageKey,
      progressPercent,
      stepsRemaining: steps,
      outputs,
      resolutionDropped,
      prioritizeDetail: job.prioritizeDetail,
      vmafScore: job.vmafScore ?? undefined,
      reencodeCount: job.reencodeCount ?? undefined,
      errorMessage: job.errorMessage,
      queuePosition: queuePosition || undefined,
    });
  });

  // GET /api/v1/jobs/:jobId/download/:outputId — server-mediated download.
  //
  // The client only ever holds an app-relative path. This route verifies the
  // fingerprint owns the job, looks up the output, and 302-redirects to a
  // fresh server-side presigned URL. Storage URLs never reach the frontend:
  // they embed the S3 access key id and would grant 24h direct access to
  // anyone who sees them (PRD §22, security.md).
  app.get('/api/v1/jobs/:jobId/download/:outputId', async (request, reply) => {
    const { jobId, outputId } = request.params as { jobId: string; outputId: string };
    const { fingerprint } = request.query as { fingerprint?: string };

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { outputs: true },
    });

    if (!job) {
      return reply.code(404).send({
        error: { code: 'JOB_NOT_FOUND', message: `Job with ID ${jobId} not found` },
      });
    }

    if (!fingerprint || hashString(fingerprint) !== job.fingerprintHash) {
      return reply.code(403).send({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this job' },
      });
    }

    const output = job.outputs.find((o) => o.id === outputId);
    if (!output) {
      return reply.code(404).send({
        error: { code: 'OUTPUT_NOT_FOUND', message: `Output ${outputId} not found on this job` },
      });
    }

    const downloadUrl = await getPresignedDownloadUrl(output.storageKey);
    // 302 (not 307): the presigned GET is a plain GET, no method/body to keep.
    return reply.code(302).redirect(downloadUrl);
  });
};

export default jobsRoutes;
