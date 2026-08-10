import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FREE_DAILY_LIMIT, SHARE_BONUS, allowanceFor, isQuotaExhausted, remainingJobs, todayStart } from '../lib/quota.ts';
import { assertTargetSizeRules, inferMediaKindFromFileKey, IntakeValidationError } from '../lib/intake-validation.ts';

describe('quota.ts - daily free limit and share bonus', () => {
  it('allowance is free limit plus bonus count', () => {
    assert.equal(allowanceFor(0), FREE_DAILY_LIMIT);
    assert.equal(allowanceFor(SHARE_BONUS), FREE_DAILY_LIMIT + SHARE_BONUS);
  });

  it('exhaustion triggers exactly at the allowance boundary', () => {
    assert.equal(isQuotaExhausted(FREE_DAILY_LIMIT, 0), true);
    assert.equal(isQuotaExhausted(FREE_DAILY_LIMIT - 1, 0), false);
    assert.equal(isQuotaExhausted(FREE_DAILY_LIMIT + SHARE_BONUS, SHARE_BONUS), true);
    assert.equal(isQuotaExhausted(FREE_DAILY_LIMIT + SHARE_BONUS - 1, SHARE_BONUS), false);
  });

  it('remaining never goes negative', () => {
    assert.equal(remainingJobs(0, 0), FREE_DAILY_LIMIT);
    assert.equal(remainingJobs(3, 0), 2);
    assert.equal(remainingJobs(20, 0), 0);
  });

  it('todayStart returns a UTC midnight date', () => {
    const today = todayStart();
    assert.equal(today.getUTCHours(), 0);
    assert.equal(today.getUTCMinutes(), 0);
    assert.equal(today.getUTCSeconds(), 0);
    assert.equal(today.toISOString().split('T')[0], new Date().toISOString().split('T')[0]);
  });
});

describe('job-intake.ts - routing hint and target-size rules', () => {
  it('infers IMAGE for image extensions, VIDEO otherwise', () => {
    assert.equal(inferMediaKindFromFileKey('clip.jpg'), 'IMAGE');
    assert.equal(inferMediaKindFromFileKey('clip.PNG'), 'IMAGE');
    assert.equal(inferMediaKindFromFileKey('clip.mp4'), 'VIDEO');
    assert.equal(inferMediaKindFromFileKey('clip'), 'VIDEO');
  });

  it('accepts targetSizeMB only for CUSTOM preset', () => {
    assert.doesNotThrow(() => assertTargetSizeRules('CUSTOM', 8));
    assert.throws(() => assertTargetSizeRules('STATUS', 8), IntakeValidationError);
    assert.throws(() => assertTargetSizeRules('CHAT', 8), IntakeValidationError);
  });

  it('rejects out-of-range CUSTOM sizes (1-16MB)', () => {
    assert.throws(() => assertTargetSizeRules('CUSTOM', undefined), IntakeValidationError);
    assert.throws(() => assertTargetSizeRules('CUSTOM', 0), IntakeValidationError);
    assert.throws(() => assertTargetSizeRules('CUSTOM', 17), IntakeValidationError);
    assert.doesNotThrow(() => assertTargetSizeRules('CUSTOM', 1));
    assert.doesNotThrow(() => assertTargetSizeRules('CUSTOM', 16));
  });

  it('STATUS/CHAT reject an explicit targetSizeMB', () => {
    assert.throws(() => assertTargetSizeRules('STATUS', 8), IntakeValidationError);
    assert.throws(() => assertTargetSizeRules('CHAT', 16), IntakeValidationError);
  });
});
