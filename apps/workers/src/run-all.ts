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
import './cleanup-cron.ts';

console.log('🚀 All BullMQ queue workers and the cleanup cron process have been started.');
