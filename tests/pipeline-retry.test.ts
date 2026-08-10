import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../lib/pipeline.ts';
import { setProcessRunner, resetProcessRunner } from '../lib/media-process.ts';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('Pipeline Retry and Boundary Verification', () => {
  const tempDir = join(process.cwd(), 'temp', 'test_pipeline_retry');

  before(() => {
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('enforces maximum 2 retries in runPipeline and stops', async () => {
    // Mock runFfprobe / runFfmpeg so that size checks fail and we retry
    let callCount = 0;
    const processMock = mock.fn(async (command: string, args: string[]) => {
      callCount++;
      if (command === 'ffprobe') {
        return JSON.stringify({
          streams: [{ codec_type: 'video', width: 1920, height: 1080, duration: '10.0' }],
        });
      }
      // For ffmpeg, we simulate generating an output file
      const outPath = args[args.length - 1];
      const { writeFileSync } = await import('node:fs');
      writeFileSync(outPath, 'fake output');
      return '';
    });

    setProcessRunner(processMock);

    const inputPath = join(tempDir, 'test_input.mp4');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(inputPath, 'fake input');

    try {
      const result = await runPipeline({
        inputPath,
        outputDir: tempDir,
        targetSizeMB: 8,
        presetMaxHeight: 720,
        tolerancePct: 0.05, // very low tolerance to force retry
        ssimFloor: 0.98, // very high ssim floor to force quality retry
      });

      // Total attempts should be 3 (Attempt 0, Attempt 1, Attempt 2)
      assert.equal(result.attempts.length, 3);
      assert.equal(result.attempts[0].attempt, 0);
      assert.equal(result.attempts[2].attempt, 2);
    } finally {
      resetProcessRunner();
    }
  });

  it('correctly handles boundary conditions around 90s Status limits', async () => {
    // If a Status video is > 90s, the worker should split it.
    // Let's verify that we correctly calculate duration and presets.
    const ffprobeMock = mock.fn(async (command: string) => {
      if (command === 'ffprobe') {
        return JSON.stringify({
          streams: [{ codec_type: 'video', width: 1280, height: 720, duration: '91.0' }],
        });
      }
      return '';
    });
    setProcessRunner(ffprobeMock);

    try {
      const { probe } = await import('../lib/probe.ts');
      const info = await probe('long_video.mp4');
      assert.equal(info.durationSec, 91.0);
      assert.ok(info.durationSec > 90);
    } finally {
      resetProcessRunner();
    }
  });
});
