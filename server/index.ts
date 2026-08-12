import * as Sentry from '@sentry/node';

const sentryDsn = process.env.SENTRY_DSN;
const isDummySentryDsn = !sentryDsn || sentryDsn === 'https://dummy-dsn@sentry.io/12345';

Sentry.init({
  dsn: sentryDsn,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
  enabled: !isDummySentryDsn,
});

import Fastify from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import {
  validatorCompiler,
  serializerCompiler,
} from '@fastify/type-provider-zod';
import jobsRoutes from './routes/jobs.ts';
import usageRoutes from './routes/usage.ts';
import onboardingRoutes from './routes/onboarding.ts';
import uploadsRoutes from './routes/uploads.ts';
import billingRoutes from './routes/billing.ts';
import contactRoutes from './routes/contact.ts';
import healthRoutes from './routes/health.ts';
import queueStatsRoutes from './routes/queue-stats.ts';
import rateLimitPlugin from './plugins/rate-limit.ts';

const app = Fastify({
  logger: true,
  trustProxy: 1,
}).withTypeProvider<ZodTypeProvider>();

// Zod-based request validation and response serialization (PRD §18)
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// CORS: lock to frontend origins only. Prevents cross-origin quota-burn attacks.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'https://com-pr.vercel.app,http://localhost:3000').split(',');
app.addHook('onRequest', async (request, reply) => {
  const origin = request.headers.origin || '';
  if (ALLOWED_ORIGINS.some(o => origin === o.trim())) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (request.method === 'OPTIONS') {
    return reply.code(204).send();
  }
});

// Register plugins
app.register(rateLimitPlugin);

// Register routes
app.register(jobsRoutes);
app.register(usageRoutes);
app.register(onboardingRoutes);
app.register(uploadsRoutes);
app.register(billingRoutes);
app.register(contactRoutes);
app.register(healthRoutes);
app.register(queueStatsRoutes);

// Error handling envelope mapping - PRD §18, coding-standards.md
app.setErrorHandler((error, _request, reply) => {
  const err = error as any;
  const statusCode = err.statusCode || 500;
  const code = err.validation
    ? 'VALIDATION_ERROR'
    : (err.code || 'INTERNAL_SERVER_ERROR');

  app.log.error(err);
  Sentry.captureException(err);

  return reply.code(statusCode).send({
    error: {
      code,
      message: err.message,
    },
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 5000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Fastify API Server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
