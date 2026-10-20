import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { mediaAnalysisQueue, mediaEncodeQueue } from '../../lib/queue.ts';

const queueStatsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/v1/queue-stats', async () => {
    const [analysisCounts, encodeCounts] = await Promise.all([
      mediaAnalysisQueue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
      mediaEncodeQueue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
    ]);

    return {
      analysisQueue: analysisCounts,
      encodeQueue: encodeCounts,
    };
  });
};

export default queueStatsRoutes;
