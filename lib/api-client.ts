'use client';

/**
 * Client-side fetch wrapper for the Fastify API.
 *
 * In production, NEXT_PUBLIC_API_URL points directly at the API host (e.g.
 * Railway), and this calls it as an absolute cross-origin URL — required
 * because Next.js's rewrites() proxy preserves the original Host header,
 * which breaks host-based routing on platforms like Railway (the proxied
 * request gets rejected as "Application not found" even though the path is
 * correct). Calling the API directly sends the correct Host header and
 * relies on CORS_ORIGINS instead.
 *
 * In local dev, NEXT_PUBLIC_API_URL is typically unset, so this falls back
 * to a relative path and goes through next.config.ts's rewrite to
 * localhost:5000, which has no host-routing quirk to work around.
 */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}
