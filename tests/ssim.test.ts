import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { measureSSIM } from '../lib/ssim.ts';
import { setProcessRunner, resetProcessRunner } from '../lib/media-process.ts';

describe('measureSSIM', () => {
  beforeEach(() => {
    setProcessRunner(async (_cmd, args) => {
      // Find log filename in args
      const lavfiArg = args.find((a) => a.includes('stats_file='));
      if (lavfiArg) {
        const match = lavfiArg.match(/stats_file='([^']+)'/);
        if (match && match[1]) {
          const logLines = [
            'n:1 Y:0.940 U:0.960 V:0.960 All:0.945 (12.60)',
            'n:2 Y:0.950 U:0.970 V:0.970 All:0.955 (13.47)',
            'n:3 Y:0.960 U:0.980 V:0.980 All:0.965 (14.56)',
          ].join('\n');
          writeFileSync(match[1], logLines);
        }
      }
      return '';
    });
  });

  afterEach(() => {
    resetProcessRunner();
  });

  it('measures and parses average SSIM across sampled frames', async () => {
    const result = await measureSSIM('source.mp4', 'output.mp4', 10, 1);
    assert.ok(result.avgSSIM > 0.94 && result.avgSSIM < 0.97);
    assert.strictEqual(result.totalFrames, 3);
  });

  it('handles empty log gracefully with fallback score of 1.0', async () => {
    setProcessRunner(async () => '');
    const result = await measureSSIM('source.mp4', 'output.mp4', 10);
    assert.strictEqual(result.avgSSIM, 1.0);
    assert.strictEqual(result.sampleCount, 0);
  });
});
