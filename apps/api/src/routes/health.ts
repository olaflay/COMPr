import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { prisma } from '../../../../lib/prisma.ts';
import { redisConnection } from '../../../../lib/queue.ts';
import { storageClient } from '../services/storage.ts';

const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', async (_request, reply) => {
    const [dbOk, redisOk, uploadsOk, outputsOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      redisConnection.ping().then((res) => res === 'PONG').catch(() => false),
      storageClient
        .send(new HeadBucketCommand({ Bucket: process.env.TIGRIS_UPLOADS_BUCKET || process.env.VECTEUS_UPLOADS_BUCKET || 'vecteus-uploads' }))
        .then(() => true)
        .catch(() => false),
      storageClient
        .send(new HeadBucketCommand({ Bucket: process.env.TIGRIS_OUTPUTS_BUCKET || process.env.VECTEUS_OUTPUTS_BUCKET || 'vecteus-outputs' }))
        .then(() => true)
        .catch(() => false),
    ]);

    const healthy = dbOk && redisOk && uploadsOk && outputsOk;
    return reply.code(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      checks: {
        database: dbOk,
        redis: redisOk,
        storageUploadsBucket: uploadsOk,
        storageOutputsBucket: outputsOk,
      },
    });
  });
};

export default healthRoutes;