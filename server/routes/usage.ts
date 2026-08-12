import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { hashString } from '../../lib/crypto.ts';
import { grantShareBonus, fetchUsage, FREE_DAILY_LIMIT, remainingJobs, allowanceFor, todayStart } from '../../lib/quota.ts';

const fingerprintSchema = z.object({
  fingerprint: z.string().optional(),
});

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
    const today = todayStart();

    const usage = await fetchUsage(fingerprintHash, today);
    const used = usage ? usage.jobCount : 0;
    const bonus = usage ? usage.bonusCount : 0;
    const allowance = allowanceFor(bonus);

    return {
      jobsUsedToday: used,
      jobsRemainingToday: remainingJobs(used, bonus),
      isPremium: false,
      isFirstJobToday: used === 0,
      shareBonusAvailable: bonus === 0 && used >= FREE_DAILY_LIMIT,
      allowance,
    };
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
