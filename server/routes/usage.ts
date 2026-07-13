/**
 * GET /api/v1/usage — PRD 18.
 *
 * Returns daily usage stats for the given fingerprint, including
 * isFirstJobToday to drive the reciprocity exemption (FR-11).
 */

import type { FastifyInstance } from 'fastify';

const FREE_DAILY_LIMIT = 5;

/** In-memory stand-in for Prisma UsageRecord — replace with DB in production. */
const usageByFingerprint = new Map<string, number>();
const fingerprintsSeen = new Set<string>();

export default async function usageRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/usage', async (request) => {
    const { fingerprint } = request.query as { fingerprint: string };
    const used = usageByFingerprint.get(fingerprint) ?? 0;
    const isFirstJob = !fingerprintsSeen.has(fingerprint);

    return {
      jobsUsedToday: used,
      jobsRemainingToday: Math.max(0, FREE_DAILY_LIMIT - used),
      isPremium: false,
      isFirstJobToday: isFirstJob,
    };
  });
}
