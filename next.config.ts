import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

// The client calls the API host directly (see lib/api-client.ts) and PUTs
// upload parts straight to the storage provider's presigned URLs, both
// cross-origin — CSP connect-src must allow them explicitly or the browser
// blocks the fetch even though CORS on the server side is fine.
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const connectSrcExtra = [
  originOf(process.env.NEXT_PUBLIC_API_URL),
  originOf(process.env.SUPABASE_S3_ENDPOINT),
].filter((origin): origin is string => origin !== null);

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://*.googletagmanager.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com`,
  `connect-src 'self' ${connectSrcExtra.join(' ')} https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.i.posthog.com`,
  "img-src 'self' data: https: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    let apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').trim();
    // A rewrite destination must be a fully-qualified URL (protocol + host) —
    // a bare domain like "api.example.com" fails Next's rewrite validation
    // and crashes the build. Guard against that here instead of at deploy time.
    if (!/^https?:\/\//i.test(apiUrl)) {
      apiUrl = `https://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/+$/, ''); // strip trailing slash(es)

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=()' },
        ],
      },
      {
        // PRD 22, 37: Job pages must never be cached or indexed.
        source: '/jobs/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "stockpadi",

  project: "javascript-nextjs-1b",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
