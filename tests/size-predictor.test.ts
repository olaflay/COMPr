import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { predictOutputSize } from '../lib/size-predictor.ts';

describe('lib/size-predictor.ts - Smart Output Size Estimator', () => {
  it('estimates size for images with conservative reduction', () => {
    const inputBytes = 5 * 1024 * 1024; // 5MB
    const prediction = predictOutputSize(inputBytes, null, 'image/jpeg', 'STATUS');
    assert.equal(prediction.reductionPercent, 35);
    assert.ok(prediction.estimatedSizeBytes < inputBytes);
    assert.ok(prediction.qualityNote.includes('Vecteus'));
    assert.equal(prediction.fitsPlatform, true);
  });

  it('estimates size for CUSTOM preset with targetSizeMB', () => {
    const inputBytes = 50 * 1024 * 1024; // 50MB
    const prediction = predictOutputSize(inputBytes, 30, 'video/mp4', 'CUSTOM', 8);
    assert.equal(prediction.estimatedSizeBytes, 8 * 1024 * 1024);
    assert.equal(prediction.estimatedSizeLabel, '8 MB');
    assert.ok(prediction.reductionPercent > 50);
  });

  it('estimates size for STATUS preset clamped to limits', () => {
    const inputBytes = 30 * 1024 * 1024; // 30MB
    const prediction = predictOutputSize(inputBytes, 20, 'video/mp4', 'STATUS');
    assert.ok(prediction.estimatedSizeBytes <= 16 * 1024 * 1024);
    assert.equal(prediction.fitsPlatform, true);
  });

  it('estimates size for CHAT preset clamped to limits', () => {
    const inputBytes = 25 * 1024 * 1024; // 25MB
    const prediction = predictOutputSize(inputBytes, 25, 'video/mp4', 'CHAT');
    assert.ok(prediction.estimatedSizeBytes <= 16 * 1024 * 1024);
    assert.equal(prediction.fitsPlatform, true);
  });
});
