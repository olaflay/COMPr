import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { splitVideo } from '../lib/split.ts';
import { setProcessRunner, resetProcessRunner } from '../lib/media-process.ts';

describe('splitVideo', () => {
  let tempDir: string;
  const recordedArgs: string[][] = [];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'vecteus-split-test-'));
    recordedArgs.length = 0;

    setProcessRunner(async (_cmd, args) => {
      recordedArgs.push(args);
      // Simulate segment files produced by ffmpeg
      writeFileSync(join(tempDir, 'split_segment_000.mp4'), 'segment-0');
      writeFileSync(join(tempDir, 'split_segment_001.mp4'), 'segment-1');
      return '';
    });
  });

  afterEach(() => {
    resetProcessRunner();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('invokes ffmpeg with segment muxer and returns generated segment file paths', async () => {
    const inputPath = join(tempDir, 'source.mp4');
    writeFileSync(inputPath, 'source-data');

    const segments = await splitVideo(inputPath, 30, tempDir);

    assert.strictEqual(recordedArgs.length, 1);
    const args = recordedArgs[0];
    assert.ok(args.includes('-segment_time'));
    assert.ok(args.includes('30'));
    assert.ok(args.includes('-f'));
    assert.ok(args.includes('segment'));

    assert.strictEqual(segments.length, 2);
    assert.ok(segments[0].endsWith('split_segment_000.mp4'));
    assert.ok(segments[1].endsWith('split_segment_001.mp4'));
  });
});
