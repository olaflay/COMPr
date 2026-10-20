import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.ts';
import { hashString } from '../../lib/crypto.ts';
import { applyOnboardingPreferences } from '../../lib/growth-ux.ts';

const onboardingBodySchema = z.object({
  // Bound all user-supplied strings (D-7): valid values are short enum
  // values (e.g. "products", "quality"); generous caps prevent unbounded
  // payload bloat while never rejecting legitimate answers.
  fingerprint: z.string().max(256),
  primary_use: z.string().max(50).optional(),
  priority: z.string().max(50).optional(),
});

const onboardingRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/api/v1/onboarding', {
    schema: {
      body: onboardingBodySchema,
    },
  }, async (request, reply) => {
    const { fingerprint, primary_use, priority } = request.body;

    const fingerprintHash = hashString(fingerprint);

    // Persist to DB, keyed by fingerprint
    await prisma.onboardingPreference.upsert({
      where: { fingerprintHash },
      update: {
        primaryUse: primary_use ?? null,
        priority: priority ?? null,
      },
      create: {
        fingerprintHash,
        primaryUse: primary_use ?? null,
        priority: priority ?? null,
      },
    });

    // Apply preference constraints to return emphasis tags for client rendering
    const results = applyOnboardingPreferences({
      primary_use,
      priority,
    });

    return reply.send({
      emphasis: results.emphasis,
      primaryUse: results.primaryUse,
    });
  });
};

export default onboardingRoutes;
