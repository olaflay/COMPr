import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { suggestPreset } from '../lib/smart-defaults.ts';
import { cumulativeDisplayPercent, stepsRemaining } from '../lib/progress-stages.ts';
import { isFirstJobExemptFromQuota, buildUpsellCopy, applyOnboardingPreferences } from '../lib/growth-ux.ts';

describe('smart-defaults.ts', () => {
  it('portrait short video -> STATUS', () => {
    const r = suggestPreset({ mediaKind: 'VIDEO', width: 720, height: 1280, durationSec: 20 });
    assert.equal(r.preset, 'STATUS');
  });

  it('portrait video over duration ceiling -> CHAT', () => {
    const r = suggestPreset({ mediaKind: 'VIDEO', width: 720, height: 1280, durationSec: 200 });
    assert.equal(r.preset, 'CHAT');
  });

  it('landscape video -> CHAT', () => {
    const r = suggestPreset({ mediaKind: 'VIDEO', width: 1920, height: 1080, durationSec: 20 });
    assert.equal(r.preset, 'CHAT');
  });

  it('small portrait image -> STATUS', () => {
    const r = suggestPreset({ mediaKind: 'IMAGE', width: 1080, height: 1920, sizeMB: 1.2 });
    assert.equal(r.preset, 'STATUS');
  });
});

describe('progress-stages.ts', () => {
  it('display percent is monotonically increasing across stages', () => {
    const pcts = ['queued', 'analyzing', 'encoding', 'verifying', 'done'].map(cumulativeDisplayPercent);
    for (let i = 1; i < pcts.length; i++) assert.ok(pcts[i] > pcts[i - 1]);
    assert.equal(pcts[pcts.length - 1], 100);
  });

  it('steps remaining counts down to zero at done', () => {
    assert.equal(stepsRemaining('done'), 0);
    assert.equal(stepsRemaining('queued'), 4);
  });
});

describe('growth-ux.ts', () => {
  it('reciprocity: first job ever for fingerprint is exempt from quota', () => {
    assert.equal(isFirstJobExemptFromQuota(true), true);
    assert.equal(isFirstJobExemptFromQuota(false), false);
  });

  it('loss aversion + contrast: anchor line appears before price line', () => {
    const copy = buildUpsellCopy({ jobsBlockedThisMonth: 3, premiumPriceLabel: '$4.99/mo' });
    assert.ok(copy.anchorLine.includes('3 files'));
    assert.ok(copy.priceLine.includes('$4.99/mo'));
  });

  it('IKEA effect: onboarding answers bias emphasis without gating', () => {
    const r = applyOnboardingPreferences({ primary_use: 'products', priority: 'quality' });
    assert.equal(r.emphasis, 'quality-forward');
    assert.equal(r.primaryUse, 'products');
  });
});
