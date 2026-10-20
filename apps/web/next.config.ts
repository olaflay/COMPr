import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';
import { withSentryConfig } from '@sentry/nextjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@vecteus/contracts', '@vecteus/sdk'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.next.json',
  },
  async rewrites() {
    let apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').trim();
    // A rewrite destination must be a fully qualified URL (protocol + host):
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
    // The Content-Security-Policy header is set per-request in middleware.ts
    // (it carries a per-request script-src nonce, D-5). The static headers
    // below are nonce-independent and stay here.
    return [
      {
        source: '/(.*)',
        headers: [
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

// Only wrap with Sentry Webpack plugin in production builds or when explicit SENTRY_ENABLED is set.
// In dev, skipping withSentryConfig allows Turbopack to run natively without Webpack wrapper overhead,
const sentryConfigured = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'stockpadi',

  project: 'javascript-nextjs-1b',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Source-map upload is an explicit opt-in (SENTRY_SOURCE_MAPS=1). Without
  // it the upload is disabled, so local/CI builds never hang on the Sentry
  // upload step (the token in .env.sentry-build-plugin is present by default).
  // Deployment/CI that wants uploaded stacks sets SENTRY_SOURCE_MAPS=1.
  sourcemaps: {
    disable: !process.env.SENTRY_SOURCE_MAPS,
  },

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

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

export default process.env.SENTRY_ENABLED === 'true' ? sentryConfigured : nextConfig;
