import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { suggestPreset } from '../lib/smart-defaults.ts';

describe('lib/smart-defaults.ts - Smart Preset Recommendation', () => {
  it('suggests STATUS for portrait video within status duration ceiling', () => {
    const result = suggestPreset({
      mediaKind: 'VIDEO',
      width: 1080,
      height: 1920,
      durationSec: 25,
    });
    assert.equal(result.preset, 'STATUS');
    assert.ok(result.reason.includes('portrait'));
  });

  it('suggests CHAT for landscape video', () => {
    const result = suggestPreset({
      mediaKind: 'VIDEO',
      width: 1920,
      height: 1080,
      durationSec: 25,
    });
    assert.equal(result.preset, 'CHAT');
    assert.ok(result.reason.includes('landscape'));
  });

  it('suggests CHAT for video exceeding duration ceiling', () => {
    const result = suggestPreset({
      mediaKind: 'VIDEO',
      width: 1080,
      height: 1920,
      durationSec: 120,
    });
    assert.equal(result.preset, 'CHAT');
    assert.ok(result.reason.includes('exceeds'));
  });

  it('suggests STATUS for small portrait images under 2MB', () => {
    const result = suggestPreset({
      mediaKind: 'IMAGE',
      width: 1080,
      height: 1920,
      sizeMB: 1.2,
    });
    assert.equal(result.preset, 'STATUS');
  });

  it('suggests CHAT for large or landscape images', () => {
    const result = suggestPreset({
      mediaKind: 'IMAGE',
      width: 1920,
      height: 1080,
      sizeMB: 3.5,
    });
    assert.equal(result.preset, 'CHAT');
  });
});
