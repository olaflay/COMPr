import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { encode, fileSizeMB } from '../lib/encode.ts';
import { setProcessRunner, resetProcessRunner } from '../lib/media-process.ts';

describe('encode and fileSizeMB', () => {
  let tempDir: string;
  const recordedCommands: Array<{ command: string; args: string[] }> = [];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'vecteus-encode-test-'));
    recordedCommands.length = 0;

    setProcessRunner(async (command, args) => {
      recordedCommands.push({ command, args });
      return '';
    });
  });

  afterEach(() => {
    resetProcessRunner();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('calculates file size in megabytes', () => {
    const testFile = join(tempDir, 'sample.bin');
    writeFileSync(testFile, Buffer.alloc(1024 * 1024 * 2)); // 2MB
    const mb = fileSizeMB(testFile);
    assert.strictEqual(Math.round(mb), 2);
  });

  it('runs single-pass encode with structured bitrate and resolution arguments', async () => {
    const inputPath = join(tempDir, 'in.mp4');
    const outputPath = join(tempDir, 'out.mp4');
    writeFileSync(inputPath, 'input');

    await encode({
      inputPath,
      outputPath,
      width: 1280,
      height: 720,
      videoBitrateKbps: 2500,
      audioBitrateKbps: 128,
      passCount: 1,
      cpuPreset: 'fast',
    });

    assert.strictEqual(recordedCommands.length, 1);
    const args = recordedCommands[0].args;
    assert.ok(args.includes('-b:v'));
    assert.ok(args.includes('2500k'));
    assert.ok(args.includes('-b:a'));
    assert.ok(args.includes('128k'));
    assert.ok(args.includes('-preset'));
    assert.ok(args.includes('fast'));
  });

  it('runs two-pass encode with pass 1 and pass 2 flags', async () => {
    const inputPath = join(tempDir, 'in.mp4');
    const outputPath = join(tempDir, 'out.mp4');
    writeFileSync(inputPath, 'input');

    await encode({
      inputPath,
      outputPath,
      width: 1920,
      height: 1080,
      videoBitrateKbps: 4000,
      audioBitrateKbps: 128,
      passCount: 2,
      cpuPreset: 'medium',
    });

    assert.strictEqual(recordedCommands.length, 2);
    const pass1Args = recordedCommands[0].args;
    const pass2Args = recordedCommands[1].args;
    assert.ok(pass1Args.includes('-pass') && pass1Args.includes('1'));
    assert.ok(pass2Args.includes('-pass') && pass2Args.includes('2'));
  });
});
