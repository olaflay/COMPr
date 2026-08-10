import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chooseInitialResolution, dropOneResolutionTier } from '../lib/resolution.ts';

describe('resolution.ts - macroblock alignment', () => {
  it('chooseInitialResolution aligns output dimensions to multiples of 16', () => {
    const r = chooseInitialResolution(1920, 1080, 720); // standard 720p cap
    assert.equal(r.width % 16, 0);
    assert.equal(r.height % 16, 0);
    assert.equal(r.width, 1280);
    assert.equal(r.height, 720);
  });

  it('chooseInitialResolution handles portrait videos and forces 16px alignment', () => {
    const r = chooseInitialResolution(1080, 1920, 720); // 720p portrait cap
    assert.equal(r.width % 16, 0);
    assert.equal(r.height % 16, 0);
    // Height capped at Math.round(720 * 1280 / 720) = 1280.
    // 1280 is divisible by 16. Width 720 is divisible by 16 (720 / 16 = 45).
    assert.ok(r.width <= 720);
    assert.ok(r.height <= 1280);
  });

  it('chooseInitialResolution aligns odd source resolutions to lower 16px multiples', () => {
    const r = chooseInitialResolution(854, 480, 480);
    assert.equal(r.width % 16, 0);
    assert.equal(r.height % 16, 0);
    // 854 -> 848 (848 is divisible by 16)
    // 480 -> 480 (480 is divisible by 16)
    assert.equal(r.width, 848);
    assert.equal(r.height, 480);
  });

  it('dropOneResolutionTier drops a tier and aligns dimensions to 16px boundaries', () => {
    const dropped = dropOneResolutionTier(720); // drop from 720p
    assert.equal(dropped.width % 16, 0);
    assert.equal(dropped.height % 16, 0);
    assert.equal(dropped.height, 480);
    assert.equal(dropped.width, 848); // 854 aligned to 16 is 848
  });

  it('dropOneResolutionTier is resilient when lookup value is already aligned to 16px', () => {
    const dropped = dropOneResolutionTier(704); // 704 is aligned (divisible by 16), close to 720
    assert.equal(dropped.width % 16, 0);
    assert.equal(dropped.height % 16, 0);
    assert.equal(dropped.height, 480);
    assert.equal(dropped.width, 848);
  });
});
