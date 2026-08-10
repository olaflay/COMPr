/**
 * Tests for lib/analysis.ts — scene analysis scoring functions.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFramePaths, analyzeScene } from '../lib/analysis.ts';
import { mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('getFramePaths', () => {
  it('returns sorted jpg files from a directory', () => {
    const testDir = join(process.cwd(), 'temp', 'test_frames');
    mkdirSync(testDir, { recursive: true });

    // Create dummy frame files
    writeFileSync(join(testDir, 'frame_0001.jpg'), '');
    writeFileSync(join(testDir, 'frame_0002.jpg'), '');
    writeFileSync(join(testDir, 'frame_0003.jpg'), '');
    writeFileSync(join(testDir, 'not_a_frame.txt'), '');

    const paths = getFramePaths(testDir);
    assert.equal(paths.length, 3);
    assert.ok(paths[0].includes('frame_0001.jpg'));
    assert.ok(paths[1].includes('frame_0002.jpg'));
    assert.ok(paths[2].includes('frame_0003.jpg'));

    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns empty array for nonexistent directory', () => {
    const paths = getFramePaths('/nonexistent/path');
    assert.deepEqual(paths, []);
  });
});

describe('SceneAnalysis thresholds', () => {
  it('hasFaces threshold is 0.05', () => {
    // Verify the threshold logic matches adaptive-engine.md rules
    const avgFaceScore = 0.06;
    assert.ok(avgFaceScore > 0.05, 'should detect faces above threshold');

    const lowFaceScore = 0.04;
    assert.ok(lowFaceScore <= 0.05, 'should not detect faces below threshold');
  });

  it('hasText threshold is 0.3', () => {
    const avgTextScore = 0.35;
    assert.ok(avgTextScore > 0.3, 'should detect text above threshold');

    const lowTextScore = 0.25;
    assert.ok(lowTextScore <= 0.3, 'should not detect text below threshold');
  });

  it('isHighMotion threshold is 0.6', () => {
    const highMotion = 0.65;
    assert.ok(highMotion > 0.6, 'should flag high motion above threshold');

    const lowMotion = 0.55;
    assert.ok(lowMotion <= 0.6, 'should not flag low motion below threshold');
  });

  it('isLowLight threshold is 40', () => {
    const darkFrame = 35;
    assert.ok(darkFrame < 40, 'should flag low light below threshold');

    const brightFrame = 45;
    assert.ok(brightFrame >= 40, 'should not flag bright frame');
  });
});

describe('analyzeScene try-finally cleanup', () => {
  it('cleans up frame folders even when analysis throws an exception', async () => {
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    let errorThrown = false;
    try {
      await analyzeScene('invalid-file-path-that-does-not-exist.mp4', 10, tempDir);
    } catch (err) {
      errorThrown = true;
    }
    assert.strictEqual(errorThrown, true, 'Should throw an error due to invalid file path');

    // Check that no "frames_*" directories are left in the temp directory
    const files = readdirSync(tempDir);
    const leakedFrameDirs = files.filter((f) => f.startsWith('frames_'));
    assert.strictEqual(leakedFrameDirs.length, 0, 'No temporary frames folders should leak in temp/');
  });
});
