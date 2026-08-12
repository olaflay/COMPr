/**
 * Tests for lib/batch-intake.ts — scaffold-only batch job intake.
 * Confirms the stub fails loudly and predictably rather than silently
 * pretending to queue work it doesn't actually do.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBatchJobForFingerprint, BatchNotImplementedError } from '../lib/batch-intake.ts';

describe('createBatchJobForFingerprint (scaffold)', () => {
  it('always rejects with BatchNotImplementedError', async () => {
    await assert.rejects(
      () =>
        createBatchJobForFingerprint({
          fileKeys: ['a.mp4', 'b.mp4'],
          preset: 'STATUS',
          fingerprint: 'fp_test',
          ip: '127.0.0.1',
        }),
      BatchNotImplementedError,
    );
  });

  it('reports the correct HTTP code and error code for the route to map', async () => {
    try {
      await createBatchJobForFingerprint({
        fileKeys: ['a.mp4', 'b.mp4'],
        preset: 'CHAT',
        fingerprint: 'fp_test',
        ip: '127.0.0.1',
      });
      assert.fail('expected createBatchJobForFingerprint to throw');
    } catch (err) {
      assert.ok(err instanceof BatchNotImplementedError);
      assert.equal(err.statusCode, 501);
      assert.equal(err.code, 'BATCH_NOT_IMPLEMENTED');
    }
  });
});
