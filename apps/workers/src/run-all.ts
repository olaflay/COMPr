import * as Sentry from '@sentry/node';

const sentryDsn = process.env.SENTRY_DSN;
const isDummySentryDsn = !sentryDsn || sentryDsn === 'https://dummy-dsn@sentry.io/12345';

Sentry.init({
  dsn: sentryDsn,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
  enabled: !isDummySentryDsn,
});

import './analysis-worker.ts';
import './encode-worker.ts';
import './webhook-worker.ts';
import { stopCleanupLoop } from './cleanup-cron.ts';
import { analysisWorker } from './analysis-worker.ts';
import { encodeWorker } from './encode-worker.ts';
import { webhookWorker } from './webhook-worker.ts';
import { redisConnection } from '../../../lib/queue.ts';
import { prisma } from '../../../lib/prisma.ts';
import { registerGracefulShutdown } from '../../../lib/lifecycle.ts';

// Graceful shutdown (BullMQ "Going to production"): worker.close() stops
// picking up new jobs and waits for in-flight encodes/probes to finish so
// deployed/restarted workers do not stall active jobs. Then close Redis + Prisma.
// WORKER_DRAIN_TIMEOUT_MS overrides the 30s default (encodes can run longer).
const drainTimeoutMs = Number(process.env.WORKER_DRAIN_TIMEOUT_MS) || undefined;

registerGracefulShutdown({
  timeoutMs: drainTimeoutMs,
  onShutdown: async () => {
    stopCleanupLoop();
    await Promise.allSettled([
      analysisWorker.close(),
      encodeWorker.close(),
      webhookWorker.close(),
    ]);
    await redisConnection.quit();
    await prisma.$disconnect();
  },
});

console.log('🚀 All Vectis BullMQ queue workers (analysis, encode, webhooks) and cleanup cron started.');

