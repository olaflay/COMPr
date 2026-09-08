import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { hashString, createSignedDownloadToken, verifySignedDownloadToken } from '../lib/crypto.ts';
import { createHmac } from 'node:crypto';

const env = process.env as Record<string, string | undefined>;
const ORIG = { salt: env.CRYPTO_SALT, nodeEnv: env.NODE_ENV };

function restore() {
  if (ORIG.salt === undefined) delete env.CRYPTO_SALT;
  else env.CRYPTO_SALT = ORIG.salt;
  if (ORIG.nodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = ORIG.nodeEnv;
}

describe('crypto.hashString', () => {
  beforeEach(restore);
  afterEach(restore);

  it('produces a deterministic 64-char hex digest when CRYPTO_SALT is set', () => {
    env.CRYPTO_SALT = 'test_salt';
    const a = hashString('user-abc');
    const b = hashString('user-abc');
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(a, b);
  });

  it('produces different digests for different salts (never a fixed hash)', () => {
    env.CRYPTO_SALT = 'salt_one';
    const one = hashString('payload');
    env.CRYPTO_SALT = 'salt_two';
    const two = hashString('payload');
    assert.notEqual(one, two);
  });

  it('throws in production when CRYPTO_SALT is missing (fails fast, never weakens privacy)', () => {
    delete env.CRYPTO_SALT;
    env.NODE_ENV = 'production';
    assert.throws(() => hashString('ip-hash'), /CRYPTO_SALT is required in production/);
  });

  it('uses the dev fallback only outside production (local dev / tests)', () => {
    delete env.CRYPTO_SALT;
    env.NODE_ENV = 'development';
    assert.match(hashString('payload'), /^[0-9a-f]{64}$/);
  });
});

describe('crypto.download-token', () => {
  beforeEach(() => {
    env.CRYPTO_SALT = 'test_salt';
    env.NODE_ENV = 'test';
  });
  afterEach(restore);

  it('round-trips: a newly minted token verifies for its job+output', () => {
    const token = createSignedDownloadToken('job-1', 'out-1');
    assert.equal(verifySignedDownloadToken(token, 'job-1', 'out-1'), true);
  });

  it('rejects a valid-shaped token for the wrong job or output', () => {
    const token = createSignedDownloadToken('job-1', 'out-1');
    assert.equal(verifySignedDownloadToken(token, 'job-9', 'out-1'), false);
    assert.equal(verifySignedDownloadToken(token, 'job-1', 'out-9'), false);
  });

  it('does not leak the fingerprint and is URL-safe', () => {
    const token = createSignedDownloadToken('job-1', 'out-1');
    assert.equal(token.includes('fingerprint'), false);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });

  it('rejects a tampered signature (constant-time, no partial match)', () => {
    const token = createSignedDownloadToken('job-1', 'out-1');
    const tampered = (token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A'));
    assert.equal(verifySignedDownloadToken(tampered, 'job-1', 'out-1'), false);
  });

  it('rejects a malformed token', () => {
    assert.equal(verifySignedDownloadToken('', 'job-1', 'out-1'), false);
    assert.equal(verifySignedDownloadToken('not-a-token!', 'job-1', 'out-1'), false);
  });

  it('rejects an expired token', () => {
    const expiry = Math.floor(Date.now() / 1000) - 1;
    const payload = `job-1:out-1:${expiry}`;
    const sig = createHmac('sha256', 'test_salt').update(payload).digest('hex');
    const expired = Buffer.from(`${payload}:${sig}`).toString('base64url');
    assert.equal(verifySignedDownloadToken(expired, 'job-1', 'out-1'), false);
  });
});
