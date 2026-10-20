import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferMediaKindFromFileKey,
  assertTargetSizeRules,
  IntakeValidationError,
} from '../lib/intake-validation.ts';

describe('lib/intake-validation.ts - Pure Intake Rules', () => {
  it('infers IMAGE for common image file extensions', () => {
    assert.equal(inferMediaKindFromFileKey('uploads/test.jpg'), 'IMAGE');
    assert.equal(inferMediaKindFromFileKey('uploads/photo.PNG'), 'IMAGE');
    assert.equal(inferMediaKindFromFileKey('uploads/graphic.webp'), 'IMAGE');
  });

  it('infers VIDEO for video file extensions', () => {
    assert.equal(inferMediaKindFromFileKey('uploads/clip.mp4'), 'VIDEO');
    assert.equal(inferMediaKindFromFileKey('uploads/movie.mov'), 'VIDEO');
    assert.equal(inferMediaKindFromFileKey('uploads/animation.webm'), 'VIDEO');
  });

  it('validates targetSizeMB for CUSTOM preset within allowed range', () => {
    assert.doesNotThrow(() => {
      assertTargetSizeRules('CUSTOM', 8);
    });
  });

  it('throws IntakeValidationError when targetSizeMB is missing or out of bounds for CUSTOM', () => {
    assert.throws(() => {
      assertTargetSizeRules('CUSTOM', undefined);
    }, (err: any) => err instanceof IntakeValidationError && err.code === 'INVALID_TARGET_SIZE');

    assert.throws(() => {
      assertTargetSizeRules('CUSTOM', 20);
    }, (err: any) => err instanceof IntakeValidationError && err.code === 'INVALID_TARGET_SIZE');
  });

  it('throws IntakeValidationError when targetSizeMB is passed for non-CUSTOM presets', () => {
    assert.throws(() => {
      assertTargetSizeRules('STATUS', 10);
    }, (err: any) => err instanceof IntakeValidationError && err.code === 'UNEXPECTED_TARGET_SIZE');
  });
});
