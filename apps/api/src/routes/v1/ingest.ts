import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '../../../lib/prisma.ts';
import { getPresignedUploadUrl } from '../../services/storage.ts';
import { mediaAnalysisQueue } from '../../../lib/queue.ts';
import { hashApiKey } from '../../plugins/api-auth.ts';

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
  'video/x-msvideo',
  'application/octet-stream',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

const presignBodySchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().refine(
    (v) => (ALLOWED_MIME_TYPES as readonly string[]).includes(v),
    { message: 'Unsupported media MIME type.' }
  ),
  sizeBytes: z.number().int().positive().max(500 * 1024 * 1024, {
    message: 'Maximum file size is 500MB.',
  }),
  targetVmaf: z.number().min(70).max(100).optional().default(92.0),
  maxBitrateKbps: z.number().int().positive().optional(),
  segmentDurationSec: z.number().int().positive().nullable().optional(),
  storageDestinationId: z.string().optional(),
});

const completeBodySchema = z.object({
  jobId: z.string().min(1),
});

const ingestRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST /v1/ingest/presign
  app.post('/v1/ingest/presign', {
    schema: {
      body: presignBodySchema,
    },
  }, async (request, reply) => {
    const rawKey = request.headers['x-vecteus-key'] || request.headers['x-vectis-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid X-Vecteus-Key header',
        },
      } as any);
    }

    let tenantId: string | null = null;
    try {
      const keyHash = hashApiKey(rawKey);
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
      });
      if (apiKeyRecord) {
        tenantId = apiKeyRecord.tenantId;
      }
    } catch (e) {}

    const { filename, mimeType, sizeBytes, targetVmaf, maxBitrateKbps, segmentDurationSec, storageDestinationId } = request.body;
    const mediaKind = mimeType.startsWith('image/') ? 'IMAGE' : 'VIDEO';
    const storageKey = `staging/vec_${Date.now()}_${randomBytes(4).toString('hex')}/${filename}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // 1. Create MediaFile record for source
    const mediaFile = await prisma.mediaFile.create({
      data: {
        storageKey,
        mimeType,
        sizeBytes,
        role: 'source',
        expiresAt,
      },
    });

    // 2. Create Job record
    const job = await prisma.job.create({
      data: {
        status: 'QUEUED',
        preset: 'CUSTOM',
        mediaKind,
        sourceFileId: mediaFile.id,
        fingerprintHash: rawKey,
        tenantId,
        ipHash: request.ip || '127.0.0.1',
        targetVmaf,
        maxBitrateKbps,
        segmentDurationSec,
        storageDestinationId,
      },
    });

    // 3. Issue S3 presigned upload URL directly to storage
    const uploadUrl = await getPresignedUploadUrl(storageKey, sizeBytes);

    return reply.code(200).send({
      jobId: job.id,
      uploadUrl,
      storageKey,
      expiresAt: expiresAt.toISOString(),
    });
  });

  // POST /v1/ingest/complete
  app.post('/v1/ingest/complete', {
    schema: {
      body: completeBodySchema,
    },
  }, async (request, reply) => {
    const rawKey = request.headers['x-vecteus-key'] || request.headers['x-vectis-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid X-Vecteus-Key header',
        },
      } as any);
    }

    const { jobId } = request.body;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { sourceFile: true },
    });

    if (!job) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: `Job ${jobId} not found`,
        },
      } as any);
    }

    // Idempotency: if already completed or failed, return accepted without re-enqueueing
    if (job.status === 'DONE' || job.status === 'FAILED') {
      return reply.code(202).send({
        jobId: job.id,
        status: job.status,
        queuePosition: 0,
      });
    }

    // Enqueue to BullMQ for asynchronous distributed processing
    await mediaAnalysisQueue.add(job.id, { jobId: job.id });

    return reply.code(202).send({
      jobId: job.id,
      status: 'QUEUED',
      queuePosition: 1,
    });
  });

  // GET /v1/jobs/:jobId
  app.get('/v1/jobs/:jobId', {
    schema: {
      params: z.object({
        jobId: z.string(),
      }),
    },
  }, async (request, reply) => {
    const rawKey = request.headers['x-vecteus-key'] || request.headers['x-vectis-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid X-Vecteus-Key header',
        },
      } as any);
    }

    const { jobId } = request.params;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { sourceFile: true, outputs: true },
    });

    if (!job) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: `Job ${jobId} not found`,
        },
      } as any);
    }

    const sourceSize = job.sourceFile?.sizeBytes ?? 0;
    const outputSize = job.outputs[0]?.sizeBytes ?? 0;
    const savingsPercent = sourceSize > 0 && outputSize > 0
      ? Math.round((1 - outputSize / sourceSize) * 1000) / 10
      : null;

    return reply.code(200).send({
      jobId: job.id,
      status: job.status,
      sourceSizeBytes: sourceSize,
      outputSizeBytes: outputSize > 0 ? outputSize : null,
      savingsPercent,
      vmafScore: job.vmafScore,
      errorMessage: job.errorMessage,
      completedAt: job.completedAt?.toISOString() ?? null,
    });
  });
};

export default ingestRoutes;
