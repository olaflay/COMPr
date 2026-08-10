import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateFile } from '../lib/file-validation.ts';

describe('file-validation.ts - client-side validation', () => {
  it('passes validation for valid video file', () => {
    const file = {
      name: 'video.mp4',
      size: 10 * 1024 * 1024, // 10MB
      type: 'video/mp4'
    };
    const errors = validateFile(file as any);
    assert.deepEqual(errors, []);
  });

  it('passes validation for valid image file', () => {
    const file = {
      name: 'image.png',
      size: 2 * 1024 * 1024, // 2MB
      type: 'image/png'
    };
    const errors = validateFile(file as any);
    assert.deepEqual(errors, []);
  });

  it('fails validation for unsupported format type', () => {
    const file = {
      name: 'doc.pdf',
      size: 1024,
      type: 'application/pdf'
    };
    const errors = validateFile(file as any);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].field, 'type');
    assert.match(errors[0].message, /not a supported format/);
  });

  it('fails validation for oversized files', () => {
    const file = {
      name: 'large_video.mp4',
      size: 101 * 1024 * 1024, // 101MB
      type: 'video/mp4'
    };
    const errors = validateFile(file as any);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].field, 'size');
    assert.match(errors[0].message, /Maximum file size is 100MB/);
  });

  it('fails validation for empty files', () => {
    const file = {
      name: 'empty.mp4',
      size: 0,
      type: 'video/mp4'
    };
    const errors = validateFile(file as any);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].field, 'empty');
    assert.match(errors[0].message, /appears to be empty/);
  });
});
