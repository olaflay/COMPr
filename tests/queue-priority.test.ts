import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper matching the priority logic in workers/analysis-worker.ts
function calculateJobPriority(preset: string, isPremium: boolean): number {
  let priority = 3;
  if (preset === 'STATUS') {
    priority = 1;
  } else if (preset === 'CHAT') {
    priority = 2;
  }

  if (isPremium) {
    priority = Math.max(1, priority - 1);
  }
  return priority;
}

describe('Queue priority calculation', () => {
  it('assigns correct priority for normal users', () => {
    assert.equal(calculateJobPriority('STATUS', false), 1);
    assert.equal(calculateJobPriority('CHAT', false), 2);
    assert.equal(calculateJobPriority('CUSTOM', false), 3);
  });

  it('shifts priority for premium users', () => {
    assert.equal(calculateJobPriority('STATUS', true), 1); // clamped to 1
    assert.equal(calculateJobPriority('CHAT', true), 1);  // shifted 2 -> 1
    assert.equal(calculateJobPriority('CUSTOM', true), 2); // shifted 3 -> 2
  });
});
