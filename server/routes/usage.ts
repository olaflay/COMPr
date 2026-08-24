import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { hashString } from '../../lib/crypto.ts';
import { grantShareBonus, fetchUsage, FREE_DAILY_LIMIT, remainingJobs, allowanceFor, todayStart } from '../../lib/quota.ts';

const fingerprintSchema = z.object({
  fingerprint: z.string().optional(),
});

// Short-TTL response cache for GET /usage. The dashboard calls this on every
// load and each call pays a full Nigeria->eu-west-1 DB round trip (~900ms).
// Quota values only change when a job completes, so a 5s cache makes rapid
// loads instant while keeping the displayed count honest (PRD §27).
const USAGE_CACHE_TTL_MS = 5000;
const usageCache = new Map<string, { expiresAt: number; body: unknown }>();

function cachedUsage(fingerprintHash: string): unknown | undefined {
  const hit = usageCache.get(fingerprintHash);
  if (hit && hit.expiresAt > Date.now()) return hit.body;
  if (hit) usageCache.delete(fingerprintHash);
  return undefined;
}

function cacheUsage(fingerprintHash: string, body: unknown): void {
  usageCache.set(fingerprintHash, { expiresAt: Date.now() + USAGE_CACHE_TTL_MS, body });
  // Bound the map: drop expired entries when it grows (one entry per device).
  if (usageCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of usageCache) {
      if (v.expiresAt <= now) usageCache.delete(k);
    }
  }
}

const usageRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/v1/usage', {
    schema: {
      querystring: fingerprintSchema,
    },
  }, async (request, reply) => {
    const { fingerprint } = request.query;
    if (!fingerprint) {
      return reply.code(400).send({
        error: { code: 'MISSING_FINGERPRINT', message: 'fingerprint query parameter is required' },
      });
    }

    const fingerprintHash = hashString(fingerprint);

    const cached = cachedUsage(fingerprintHash);
    if (cached) return cached;

    const today = todayStart();

    const usage = await fetchUsage(fingerprintHash, today);
    const used = usage ? usage.jobCount : 0;
    const bonus = usage ? usage.bonusCount : 0;
    const allowance = allowanceFor(bonus);

    const body = {
      jobsUsedToday: used,
      jobsRemainingToday: remainingJobs(used, bonus),
      isPremium: false,
      isFirstJobToday: used === 0,
      shareBonusAvailable: bonus === 0 && used >= FREE_DAILY_LIMIT,
      allowance,
    };

    cacheUsage(fingerprintHash, body);
    return body;
  });

  // Share = Credit: grant bonus compressions once per day for sharing NoBlur
  app.post('/api/v1/usage/share-bonus', {
    schema: {
      body: fingerprintSchema,
    },
  }, async (request, reply) => {
    const { fingerprint } = request.body;
    if (!fingerprint) {
      return reply.code(400).send({
        error: { code: 'MISSING_FINGERPRINT', message: 'fingerprint is required' },
      });
    }

    const fingerprintHash = hashString(fingerprint);
    const ipHash = hashString(request.ip);

    const granted = await grantShareBonus(fingerprintHash, ipHash);

    const usage = await fetchUsage(fingerprintHash, todayStart());
    const used = usage ? usage.jobCount : 0;
    const bonus = usage ? usage.bonusCount : 0;

    return {
      granted,
      jobsUsedToday: used,
      jobsRemainingToday: remainingJobs(used, bonus),
      allowance: allowanceFor(bonus),
    };
  });
};

export default usageRoutes;
