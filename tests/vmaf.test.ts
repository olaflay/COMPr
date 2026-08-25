/**
 * Tests for lib/vmaf.ts — VMAF quality gate and fallback logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { qualityGate, VMAF_FLOOR, VMAF_REDUCE_CRF, VMAF_MIN_WARN } from '../lib/vmaf.ts';
import type { VmafResult } from '../lib/vmaf.ts';

function makeVmafResult(overrides: Partial<VmafResult> = {}): VmafResult {
  return {
    avgVmaf: 90,
    minVmaf: 80,
    sampleCount: 15,
    passed: true,
    verified: true,
    ...overrides,
  };
}

describe('VMAF constants', () => {
  it('VMAF_FLOOR is 80 (debate decision)', () => {
    assert.equal(VMAF_FLOOR, 80);
  });

  it('VMAF_REDUCE_CRF is 3 (debate decision)', () => {
    assert.equal(VMAF_REDUCE_CRF, 3);
  });

  it('VMAF_MIN_WARN is 60', () => {
    assert.equal(VMAF_MIN_WARN, 60);
  });
});

describe('qualityGate', () => {
  it('passes when VMAF avg >= floor', () => {
    const result = qualityGate(makeVmafResult({ avgVmaf: 85, passed: true }), 28);
    assert.equal(result.shouldReencode, false);
    assert.ok(result.reason.includes('85'));
  });

  it('fails when VMAF avg < floor', () => {
    const result = qualityGate(makeVmafResult({ avgVmaf: 75, passed: false }), 28);
    assert.equal(result.shouldReencode, true);
    assert.equal(result.newCrf, 25); // 28 - 3
    assert.ok(result.reason.includes('75'));
    assert.ok(result.reason.includes('CRF 25'));
  });

  it('reduces CRF by VMAF_REDUCE_CRF on failure', () => {
    const originalCrf = 30;
    const result = qualityGate(
      makeVmafResult({ avgVmaf: 70, passed: false }),
      originalCrf,
    );
    assert.equal(result.newCrf, originalCrf - VMAF_REDUCE_CRF);
  });

  it('re-encodes below the profile CRF floor when the score fails', () => {
    // Profile selection can start at CRF 20; a corrective re-encode floored
    // at 20 would re-run an identical encode. It must be allowed to go lower.
    const result = qualityGate(
      makeVmafResult({ avgVmaf: 60, passed: false }),
      20, // profile floor: 20 - 3 = 17, must NOT clamp back to 20
    );
    assert.equal(result.shouldReencode, true);
    assert.equal(result.newCrf, 17);
  });

  it('refuses a no-op re-encode when CRF cannot actually drop', () => {
    // 14 is the re-encode floor; 14 - 3 = 11 clamps to 14, same as original:
    // re-encoding would change nothing, so the gate must say no.
    const result = qualityGate(
      makeVmafResult({ avgVmaf: 50, passed: false }),
      14,
    );
    assert.equal(result.shouldReencode, false);
    assert.ok(result.reason.includes('cannot go lower'));
  });

  it('clamps new CRF to minimum 14', () => {
    const result = qualityGate(
      makeVmafResult({ avgVmaf: 60, passed: false }),
      16, // 16 - 3 = 13, clamps up to 14 (below 14 is visual-lossless overkill)
    );
    assert.equal(result.newCrf, 14);
  });

  it('warns when min VMAF is below VMAF_MIN_WARN even if avg passes', () => {
    const result = qualityGate(
      makeVmafResult({ avgVmaf: 85, minVmaf: 55, passed: true }),
      28,
    );
    assert.equal(result.shouldReencode, false);
    assert.ok(result.reason.includes('low'), 'should mention low min score');
  });

  it('does not re-encode when prioritizeDetail would bypass', () => {
    // qualityGate itself doesn't check prioritizeDetail — that's the caller's job
    // This test verifies the gate logic is independent
    const result = qualityGate(makeVmafResult({ avgVmaf: 75, passed: false }), 28);
    assert.equal(result.shouldReencode, true, 'gate should still recommend re-encode');
  });

  it('unverified result never passes the gate (no fabricated 100)', () => {
    // A measurement failure must not be reported as a pass — the quality gate
    // cannot close on a number that was never measured (Constitution Art. III).
    const result = qualityGate(
      makeVmafResult({ avgVmaf: null, minVmaf: null, sampleCount: 0, passed: false, verified: false }),
      28,
    );
    assert.equal(result.shouldReencode, false, 'must not re-encode when the tool is broken');
    assert.ok(result.reason.includes('unverified'), 'reason must say unverified');
    assert.equal(result.vmafResult.passed, false, 'unverified result is never a pass');
  });
});
