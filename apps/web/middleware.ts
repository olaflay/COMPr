import { NextRequest, NextResponse } from 'next/server';

/**
 * Per-request Content-Security-Policy with a nonce (D-5).
 *
 * A static CSP can't use per-request nonces, so the header is set here, per
 * request, instead of in next.config.ts. Next.js picks up the nonce from the
 * `x-nonce` header and applies it to its inline bootstrap scripts; app
 * layout.tsx threads it onto <html> as well.
 *
 * The nonce replaces 'unsafe-inline' in script-src, closing the inline-script
 * injection hole. Styles keep 'unsafe-inline' (required by font CSS + MUI),
 * which is the accepted, lower-risk exception (script execution is the risk).
 */
const ALLOWED_API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || '';
const TIGRIS_ORIGIN = (() => {
  try {
    return new URL(process.env.TIGRIS_ENDPOINT || 'https://t3.storage.dev').origin;
  } catch {
    return null;
  }
})();

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const connectExtra = [ALLOWED_API_ORIGIN, TIGRIS_ORIGIN]
    .map((origin) => {
      try {
        return origin ? new URL(origin).origin : null;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => origin !== null);

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''} https://*.googletagmanager.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com`,
    `connect-src 'self' ${connectExtra.join(' ')} https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.i.posthog.com`,
    "img-src 'self' data: https: blob:",
    "media-src 'self' blob: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function middleware(request: NextRequest) {
  // Edge-runtime-safe nonce source (Web Crypto global). ~122 bits entropy,
  // unique per request. (Node's crypto module is unavailable in Edge.)
  const nonce = crypto.randomUUID().replace(/-/g, '');

  // Make the nonce visible to the app (headers()) and to Next.js's inline
  // script emission, and ship the CSP itself on the response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // The request header must not carry the CSP : it would only be copied back
  // out by my own handler re-setting it below; keep x-nonce only.

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('x-nonce', nonce);
  return response;
}

// Skip static assets, images, and the API (the API get its own headers, and
// its responses must not receive the webpage CSP).
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};