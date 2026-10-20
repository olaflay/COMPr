import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isPermanentFailure } from '../lib/error-classification.ts';

describe('Error Classification SRE utility', () => {
  test('should classify invalid format errors as permanent', () => {
    assert.equal(isPermanentFailure('Magic-byte validation failed: expected VIDEO'), true);
    assert.equal(isPermanentFailure('No media stream found in the source file'), true);
    assert.equal(isPermanentFailure('No video stream present in container'), true);
    assert.equal(isPermanentFailure('Stream map "0:v" matches no streams'), true);
    assert.equal(isPermanentFailure('Output file does not contain any stream'), true);
    assert.equal(isPermanentFailure('Invalid data found when processing input'), true);
    assert.equal(isPermanentFailure('SSRF_BLOCKED: Destination IP is private or blocked'), true);
  });

  test('should classify configuration/argument errors as permanent', () => {
    assert.equal(isPermanentFailure('ffmpeg error: invalid argument "-vcodec"'), true);
    assert.equal(isPermanentFailure('Codec not found: libsvtav1'), true);
    assert.equal(isPermanentFailure('Unknown encoder libx265'), true);
  });

  test('should classify infra/network errors as transient', () => {
    assert.equal(isPermanentFailure('Failed to connect to database postgres'), false);
    assert.equal(isPermanentFailure('Connection timeout to Redis'), false);
    assert.equal(isPermanentFailure('Object storage bucket connection closed'), false);
    assert.equal(isPermanentFailure('unexpected token < in JSON'), false);
  });
});
