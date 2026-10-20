export async function register() {
  const dsn = process.env.SENTRY_DSN;
  const isDummyDsn = !dsn || dsn === 'https://dummy-dsn@sentry.io/12345';
  if (isDummyDsn && process.env.NODE_ENV === 'development') {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
      enabled: !isDummyDsn,
      enableLogs: true,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
      enabled: !isDummyDsn,
      enableLogs: true,
    });
  }
}

export const onRequestError: typeof import('@sentry/nextjs').captureRequestError = async (
  err,
  request,
  context,
) => {
  const Sentry = await import('@sentry/nextjs');
  return Sentry.captureRequestError(err, request, context);
};

