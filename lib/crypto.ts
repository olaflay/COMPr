import { createHash } from 'node:crypto';

/**
 * Creates a salted, one-way SHA-256 hash of a string (fingerprint or IP)
 * to protect user privacy in compliance with PRD §23, §27 and security rules.
 */
export function hashString(val: string): string {
  const salt = process.env.CRYPTO_SALT || 'noblur_fallback_salt_2026';
  return createHash('sha256').update(val + salt).digest('hex');
}
