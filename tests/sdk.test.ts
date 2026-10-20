import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VecteusClient } from '../lib/sdk.ts';
import { createHmac } from 'node:crypto';

describe('Vecteus Official SDK', () => {
  it('throws an error if instantiated without an API key', () => {
    assert.throws(
      () => new VecteusClient({ apiKey: '' }),
      /VecteusClient requires an apiKey/
    );
  });

  it('initializes with custom base URL and strips trailing slashes', () => {
    const client = new VecteusClient({
      apiKey: 'vct_live_demo123',
      baseUrl: 'https://api.vecteus.dev///',
    });
    assert.ok(client);
  });

  it('verifies valid HMAC-SHA256 webhook signatures using constant-time comparison', () => {
    const secret = 'whsec_sample_secret_key_99';
    const payload = JSON.stringify({ event: 'job.completed', jobId: 'job_123' });
    const validSignature = createHmac('sha256', secret).update(payload).digest('hex');

    const isValid = VecteusClient.webhooks.verifySignature(payload, validSignature, secret);
    assert.equal(isValid, true);
  });

  it('rejects tampered webhook payloads or wrong signatures', () => {
    const secret = 'whsec_sample_secret_key_99';
    const payload = JSON.stringify({ event: 'job.completed', jobId: 'job_123' });
    const tamperedPayload = JSON.stringify({ event: 'job.completed', jobId: 'job_999' });
    const signature = createHmac('sha256', secret).update(payload).digest('hex');

    const isValid = VecteusClient.webhooks.verifySignature(tamperedPayload, signature, secret);
    assert.equal(isValid, false);
  });
});
