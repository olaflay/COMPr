import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;
const isDummyDsn = !dsn || dsn === 'https://dummy-dsn@sentry.io/12345';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
      enabled: !isDummyDsn,
      enableLogs: true,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
      enabled: !isDummyDsn,
      enableLogs: true,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
