import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { prisma } from '../../lib/prisma.ts';
import { redisConnection } from '../../lib/queue.ts';

const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', async (_request, reply) => {
    const [dbOk, redisOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      redisConnection.ping().then((res) => res === 'PONG').catch(() => false),
    ]);

    const healthy = dbOk && redisOk;
    return reply.code(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      checks: { database: dbOk, redis: redisOk },
    });
  });
};

export default healthRoutes;
