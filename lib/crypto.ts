import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Resolves the CRYPTO_SALT, throwing on a missing value in production.
 *
 * CRYPTO_SALT is REQUIRED in production (NODE_ENV !== 'development'): a
 * hardcoded fallback would let anyone reverse hashes / forge tokens from
 * source. The dev fallback exists only so local development and tests run
 * without it. This is an explicit developer-failure, never a silent weakening
 * of privacy or integrity.
 */
function requireSalt(): string {
  const salt = process.env.CRYPTO_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRYPTO_SALT is required in production (lib/crypto.ts)');
    }
    return 'vecteus_fallback_salt_2026';
  }
  return salt;
}

/**
 * Creates a salted, one-way SHA-256 hash of a string (fingerprint or IP)
 * to protect user privacy in compliance with PRD §23, §27 and security rules.
 */
export function hashString(val: string): string {
  return createHash('sha256').update(val + requireSalt()).digest('hex');
}

const DOWNLOAD_TOKEN_TTL_SEC = 60 * 10; // 10 minutes

/**
 * Signs a short-lived download-ownership token for <jobId>:<outputId>.
 *
 * D-4: the raw client fingerprint never rides in a URL (it would leak into
 * access logs, browser history, and Referer headers). Downloads instead carry
 * a signed, expiring token; the download route verifies it in constant time.
 * The token binds to the exact job+output and expires within 10 minutes.
 */
export function createSignedDownloadToken(jobId: string, outputId: string): string {
  const salt = requireSalt();
  const expiresAt = Math.floor(Date.now() / 1000) + DOWNLOAD_TOKEN_TTL_SEC;
  const payload = `${jobId}:${outputId}:${expiresAt}`;
  const sig = createHmac('sha256', salt).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

/**
 * Verifies a signed download token against the expected job and output.
 * Rejects tampered, expired, stale (mismatched id) or malformed tokens.
 * Comparison is constant-time to avoid HMAC timing side channels.
 */
export function verifySignedDownloadToken(token: string, jobId: string, outputId: string): boolean {
  if (!token) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return false;
  }
  const parts = decoded.split(':');
  if (parts.length !== 4) return false;
  const [tJobId, tOutputId, tExpiresAt, sig] = parts;
  if (tJobId !== jobId || tOutputId !== outputId) return false;
  const expiresAt = Number(tExpiresAt);
  if (!Number.isFinite(expiresAt)) return false;
  if (Math.floor(Date.now() / 1000) > expiresAt) return false;
  const salt = requireSalt();
  const expected = createHmac('sha256', salt).update(`${jobId}:${outputId}:${tExpiresAt}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Signs an outbound webhook payload using HMAC-SHA256.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verifies an incoming webhook signature using timing-safe comparison.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = signWebhookPayload(payload, secret);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

