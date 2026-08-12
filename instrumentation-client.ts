import * as Sentry from '@sentry/nextjs';

// This file runs in the browser — only NEXT_PUBLIC_*-prefixed env vars are
// inlined into client bundles, so the plain server-side SENTRY_DSN is always
// undefined here. sentry.server.config.ts / instrumentation.ts correctly use
// SENTRY_DSN since those run server-side.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDummyDsn = !dsn || dsn === 'https://dummy-dsn@sentry.io/12345';

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
  enabled: !isDummyDsn,
});

// Required by @sentry/nextjs to instrument client-side route transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
