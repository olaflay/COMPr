import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBitrate, adjustBitrateForSizeRetry, resolutionTierFloor } from '../lib/bitrate.ts';
import { chooseInitialResolution, dropOneResolutionTier } from '../lib/resolution.ts';

describe('bitrate.ts', () => {
  it('matches PRD Section 14 worked example (16MB / 30s / stereo)', () => {
    const r = calculateBitrate(16, 30, 2);
    assert.equal(r.bitrateTotalKbps, 4369.07);
    assert.equal(r.audioBitrateKbps, 96);
    assert.equal(r.videoBitrateKbps, 4273.07);
    assert.ok(Math.abs(r.videoBitrateFinalKbps - 4209) < 1);
  });

  it('custom preset bound: 16MB/30s is the practical case; 1MB min holds', () => {
    const r = calculateBitrate(1, 10, 2);
    assert.ok(r.videoBitrateFinalKbps > 0);
  });

  it('mono audio uses 64kbps not 96', () => {
    const r = calculateBitrate(16, 30, 1);
    assert.equal(r.audioBitrateKbps, 64);
  });

  it('size-triggered retry adjusts bitrate proportionally to overshoot', () => {
    const adjusted = adjustBitrateForSizeRetry(3931, 18, 16);
    assert.ok(adjusted < 3931);
    assert.ok(Math.abs(adjusted - 3931 * (16 / 18)) < 0.01);
  });

  it('resolution never upscales past source and respects preset cap', () => {
    const r = chooseInitialResolution(480, 720);
    assert.equal(r.height, 480);
  });

  it('resolution caps at preset ceiling even if source is larger', () => {
    const r = chooseInitialResolution(1080, 720);
    assert.equal(r.height, 720);
  });

  it('quality-triggered retry drops exactly one tier', () => {
    const dropped = dropOneResolutionTier(720);
    assert.equal(dropped.height, 480);
  });

  it('quality-triggered retry does not go below the floor tier', () => {
    const dropped = dropOneResolutionTier(240);
    assert.equal(dropped.height, 240);
  });

  it('bitrate floor lookup returns a sane minimum for 720p', () => {
    assert.equal(resolutionTierFloor(720), 800);
  });
});
