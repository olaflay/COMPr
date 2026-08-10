import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chooseInitialResolution, dropOneResolutionTier } from '../lib/resolution.ts';
import { calculateBitrate, adjustBitrateForSizeRetry } from '../lib/bitrate.ts';

// Tests focusing on the pipeline's logic engine and calculation steps
describe('pipeline.ts logic engine', () => {
  it('correctly maps initial parameters from platforms caps', () => {
    const resolution = chooseInitialResolution(1080, 720);
    assert.equal(resolution.height, 720);
    assert.equal(resolution.width, 1280);

    const { videoBitrateFinalKbps } = calculateBitrate(16, 90, 2);
    assert.ok(videoBitrateFinalKbps > 0);
  });

  it('drops resolution exactly one step on quality retry trigger', () => {
    let currentHeight = 720;
    const tier1 = dropOneResolutionTier(currentHeight);
    assert.equal(tier1.height, 480);

    currentHeight = tier1.height;
    const tier2 = dropOneResolutionTier(currentHeight);
    assert.equal(tier2.height, 352);
  });

  it('adjusts bitrate proportionally during size overshoot correction', () => {
    const originalBitrate = 4000;
    const actualSize = 20; // 20MB
    const targetSize = 16; // 16MB
    const adjusted = adjustBitrateForSizeRetry(originalBitrate, actualSize, targetSize);
    assert.equal(adjusted, 3200); // 4000 * (16/20) = 3200
  });

  it('does not upscale if source resolution is below the cap', () => {
    const resolution = chooseInitialResolution(360, 720);
    assert.equal(resolution.height, 352);
  });

  it('selects correct portrait resolution and prevents aspect ratio distortion or upscaling', () => {
    // Portrait video: width 576, height 1024, cap 720
    const resolution = chooseInitialResolution(576, 1024, 720);
    assert.equal(resolution.width, 480);
    assert.equal(resolution.height, 848);
  });

  it('drops resolution exactly one step on portrait quality retry trigger', () => {
    let currentHeight = 848;
    const tier = dropOneResolutionTier(currentHeight, true);
    assert.equal(tier.width, 352);
    assert.equal(tier.height, 640);
  });

  it('imports processImage from pipeline.ts cleanly', async () => {
    const pipeline = await import('../lib/pipeline.ts');
    assert.equal(typeof pipeline.processImage, 'function');
    assert.equal(typeof pipeline.probe, 'function');
  });
});

