import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apiUrl } from '../lib/api-client.ts';

describe('lib/api-client.ts - API Base URL Helper', () => {
  it('formats API-relative paths consistently', () => {
    const url = apiUrl('/api/v1/jobs/123');
    assert.ok(url.endsWith('/api/v1/jobs/123'));
  });

  it('preserves query strings in URL formulation', () => {
    const url = apiUrl('/api/v1/usage?fingerprint=fp_test');
    assert.ok(url.endsWith('/api/v1/usage?fingerprint=fp_test'));
  });
});
