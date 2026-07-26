/**
 * POST /api/v1/jobs — PRD 18.
 *
 * Validates preset, targetSizeMB, fileKey. Enforces reciprocity (FR-11)
 * and daily quota. All business logic delegated to /lib functions.
 */

import type { FastifyInstance } from 'fastify';
import platformLimits from '../../config/platform-limits.json' with { type: 'json' };
import { buildUpsellCopy } from '../../lib/growth-ux.ts';
import { getPostHogClient } from '../../lib/posthog-server.ts';

const FREE_DAILY_LIMIT = 5;

/** In-memory stand-in for Prisma UsageRecord — replace with DB in production. */
const usageByFingerprint = new Map<string, number>();
/** In-memory stand-in for Prisma Job.isFirstJobForFingerprint — replace with DB. */
const fingerprintsSeen = new Set<string>();

export default async function jobsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/jobs', {
    schema: {
      body: {
        type: 'object',
        required: ['fileKey', 'preset'],
        properties: {
          fileKey: { type: 'string' },
          preset: { type: 'string', enum: ['STATUS', 'CHAT', 'CUSTOM'] },
          targetSizeMB: { type: 'number', minimum: 1, maximum: 16 },
          fingerprint: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { preset, targetSizeMB, fingerprint } = request.body as {
      fileKey: string;
      preset: 'STATUS' | 'CHAT' | 'CUSTOM';
      targetSizeMB?: number;
      fingerprint: string;
    };

    // Validate preset
    if (!['STATUS', 'CHAT', 'CUSTOM'].includes(preset)) {
      return reply.code(400).send({
        error: { code: 'INVALID_PRESET', message: 'preset must be STATUS, CHAT, or CUSTOM' },
      });
    }

    // PRD 18: targetSizeMB only accepted when preset=CUSTOM, bounded 1-16MB
    if (preset === 'CUSTOM') {
      const { minSizeMB, maxSizeMB } = platformLimits.CUSTOM;
      if (typeof targetSizeMB !== 'number' || targetSizeMB < minSizeMB || targetSizeMB > maxSizeMB) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_TARGET_SIZE',
            message: `targetSizeMB is required for CUSTOM preset and must be between ${minSizeMB} and ${maxSizeMB}`,
          },
        });
      }
    } else if (targetSizeMB !== undefined) {
      return reply.code(400).send({
        error: {
          code: 'UNEXPECTED_TARGET_SIZE',
          message: `targetSizeMB is only valid for preset=CUSTOM, not ${preset}`,
        },
      });
    }

    // PRD FR-11, 26: First-job reciprocity — check DB flag, NOT "first job today."
    // This exemption applies once per fingerprint at the database level.
    const isFirstJob = !fingerprintsSeen.has(fingerprint);
    if (isFirstJob) {
      fingerprintsSeen.add(fingerprint);
    }

    // Daily quota check (skip if first-job reciprocity applies)
    if (!isFirstJob) {
      const usedToday = usageByFingerprint.get(fingerprint) ?? 0;
      if (usedToday >= FREE_DAILY_LIMIT) {
        const copy = buildUpsellCopy({
          jobsBlockedThisMonth: usedToday,
          premiumPriceLabel: '$4.99/mo',
        });

        const posthog = getPostHogClient();
        if (posthog) {
          posthog.capture({
            distinctId: fingerprint,
            event: 'quota_exceeded',
            properties: {
              preset,
              jobs_used_today: usedToday,
              daily_limit: FREE_DAILY_LIMIT,
            },
          });
          await posthog.flush();
        }

        return reply.code(429).send({
          error: { code: 'QUOTA_EXCEEDED', message: copy.anchorLine, upsell: copy },
        });
      }
    }

    usageByFingerprint.set(fingerprint, (usageByFingerprint.get(fingerprint) ?? 0) + 1);

    const posthog = getPostHogClient();
    if (posthog) {
      if (isFirstJob) {
        posthog.capture({
          distinctId: fingerprint,
          event: 'first_job_submitted',
          properties: {
            preset,
            ...(preset === 'CUSTOM' && { target_size_mb: targetSizeMB }),
          },
        });
      }
      posthog.capture({
        distinctId: fingerprint,
        event: 'job_submitted',
        properties: {
          preset,
          is_first_job: isFirstJob,
          ...(preset === 'CUSTOM' && { target_size_mb: targetSizeMB }),
        },
      });
      await posthog.flush();
    }

    return reply.code(202).send({ jobId: `job_${Date.now()}`, status: 'queued' });
  });
}
