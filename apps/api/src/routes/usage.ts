import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { hashString } from '../../lib/crypto.ts';
import { grantShareBonus, fetchUsage, FREE_DAILY_LIMIT, remainingJobs, allowanceFor, todayStart } from '../../lib/quota.ts';
import { redisConnection } from '../../lib/queue.ts';

const fingerprintSchema = z.object({
  fingerprint: z.string().optional(),
});

const REDIS_CACHE_TTL_SEC = 30;

async function getCachedUsage(fingerprintHash: string): Promise<unknown | null> {
  try {
    const cached = await redisConnection.get(`usage_cache:${fingerprintHash}`);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('[Usage Cache] Redis get error:', err);
  }
  return null;
}

async function setCachedUsage(fingerprintHash: string, body: unknown): Promise<void> {
  try {
    await redisConnection.setex(`usage_cache:${fingerprintHash}`, REDIS_CACHE_TTL_SEC, JSON.stringify(body));
  } catch (err) {
    console.warn('[Usage Cache] Redis set error:', err);
  }
}

const usageRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/v1/usage', {
    schema: {
      querystring: fingerprintSchema,
    },
  }, async (request, reply) => {
    // D-4: read the fingerprint from a header so it never rides in a URL.
    // Query param kept as a fallback for older clients / manual testing.
    const fingerprint = (request.headers['x-noblur-fingerprint'] ??
      request.query.fingerprint) as string | undefined;
    if (!fingerprint) {
      return reply.code(400).send({
        error: { code: 'MISSING_FINGERPRINT', message: 'fingerprint is required (X-NoBlur-Fingerprint header)' },
      });
    }

    const fingerprintHash = hashString(fingerprint);

    const cached = await getCachedUsage(fingerprintHash);
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

    await setCachedUsage(fingerprintHash, body);
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

    // Invalidate cache immediately on update
    await redisConnection.del(`usage_cache:${fingerprintHash}`).catch(() => {});

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
