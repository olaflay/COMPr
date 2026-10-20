import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  runCommand,
  runFfmpeg,
  runFfprobe,
  setProcessRunner,
  resetProcessRunner,
} from '../lib/media-process.ts';

describe('media-process adapter', () => {
  const recordedCalls: Array<{ command: string; args: string[]; timeout?: number }> = [];

  beforeEach(() => {
    recordedCalls.length = 0;
    setProcessRunner(async (command, args, opts) => {
      recordedCalls.push({ command, args, timeout: opts?.timeout });
      return `mock-output-for-${command}`;
    });
  });

  afterEach(() => {
    resetProcessRunner();
  });

  it('runs arbitrary commands via custom runner', async () => {
    const stdout = await runCommand('echo', ['hello', 'world'], { timeout: 5000 });
    assert.strictEqual(stdout, 'mock-output-for-echo');
    assert.strictEqual(recordedCalls.length, 1);
    assert.strictEqual(recordedCalls[0].command, 'echo');
    assert.deepStrictEqual(recordedCalls[0].args, ['hello', 'world']);
    assert.strictEqual(recordedCalls[0].timeout, 5000);
  });

  it('invokes ffmpeg with structured arguments', async () => {
    const stdout = await runFfmpeg(['-version'], { timeout: 10000 });
    assert.strictEqual(stdout, 'mock-output-for-ffmpeg');
    assert.strictEqual(recordedCalls.length, 1);
    assert.strictEqual(recordedCalls[0].command, 'ffmpeg');
    assert.deepStrictEqual(recordedCalls[0].args, ['-version']);
    assert.strictEqual(recordedCalls[0].timeout, 10000);
  });

  it('invokes ffprobe with structured arguments', async () => {
    const stdout = await runFfprobe(['-hide_banner', 'input.mp4']);
    assert.strictEqual(stdout, 'mock-output-for-ffprobe');
    assert.strictEqual(recordedCalls.length, 1);
    assert.strictEqual(recordedCalls[0].command, 'ffprobe');
    assert.deepStrictEqual(recordedCalls[0].args, ['-hide_banner', 'input.mp4']);
  });

  it('propagates process failures gracefully', async () => {
    setProcessRunner(async () => {
      throw new Error('Command failed with exit code 1');
    });

    await assert.rejects(
      async () => {
        await runFfmpeg(['-invalid-flag']);
      },
      /Command failed with exit code 1/
    );
  });
});
