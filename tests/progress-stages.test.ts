import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES,
  cumulativeDisplayPercent,
  stepsRemaining,
  stageLabel,
} from '../lib/progress-stages.ts';

describe('lib/progress-stages.ts - Goal Gradient Progress Computation', () => {
  it('defines stages with weights summing to 1.0', () => {
    const totalWeight = STAGES.reduce((acc, s) => acc + s.displayWeight, 0);
    assert.ok(Math.abs(totalWeight - 1.0) < 0.001);
  });

  it('calculates monotonically increasing cumulative percentages', () => {
    const pQueued = cumulativeDisplayPercent('queued');
    const pAnalyzing = cumulativeDisplayPercent('analyzing');
    const pEncoding = cumulativeDisplayPercent('encoding');
    const pVerifying = cumulativeDisplayPercent('verifying');
    const pDone = cumulativeDisplayPercent('done');

    assert.ok(pQueued < pAnalyzing);
    assert.ok(pAnalyzing < pEncoding);
    assert.ok(pEncoding < pVerifying);
    assert.equal(pDone, 100);
  });

  it('calculates countdown of remaining steps accurately', () => {
    assert.equal(stepsRemaining('queued'), 4);
    assert.equal(stepsRemaining('analyzing'), 3);
    assert.equal(stepsRemaining('encoding'), 2);
    assert.equal(stepsRemaining('verifying'), 1);
    assert.equal(stepsRemaining('done'), 0);
  });

  it('returns appropriate human-readable stage labels', () => {
    assert.ok(stageLabel('queued'));
    assert.ok(stageLabel('encoding'));
    assert.equal(stageLabel('nonexistent'), null);
  });

  it('throws for unknown stages in percentage calculation', () => {
    assert.throws(() => cumulativeDisplayPercent('invalid_stage'), /Unknown stage/);
  });
});
