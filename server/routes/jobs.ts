import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import platformLimits from '../../config/platform-limits.json' with { type: 'json' };
import { prisma } from '../../lib/prisma.ts';
import { cumulativeDisplayPercent, stepsRemaining } from '../../lib/progress-stages.ts';
import { chooseInitialResolution } from '../../lib/resolution.ts';
import { createJobForFingerprint, IntakeError } from '../../lib/job-intake.ts';
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

    // Generate presigned download URLs for output files
    const outputs = await Promise.all(
      job.outputs.map(async (out) => {
        const downloadUrl = await getPresignedDownloadUrl(out.storageKey).catch(
          () => '' // fallback if S3 SDK fails
        );
        return {
          segmentIndex: out.segmentIndex,
          downloadUrl,
          sizeBytes: out.sizeBytes,
        };
      })
    );

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
      errorMessage: job.errorMessage,
      queuePosition: queuePosition || undefined,
    });
  });
};

export default jobsRoutes;
