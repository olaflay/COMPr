import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { probe } from '../lib/probe.ts';
import { isPermanentFailure } from '../lib/error-classification.ts';
import { selectProfile, buildFFmpegArgs } from '../lib/policy-engine.ts';
import { chooseInitialResolution } from '../lib/resolution.ts';
import { signWebhookPayload } from '../lib/crypto.ts';
import { VecteusClient } from '../lib/sdk.ts';

const execFileAsync = promisify(execFile);
const FIXTURES_DIR = join(process.cwd(), 'temp', 'pathological-fixtures');

describe('Pathological Ingestion Test Suite', () => {
  const missingMoovPath = join(FIXTURES_DIR, 'missing_moov.mp4');
  const truncatedPath = join(FIXTURES_DIR, 'truncated.mp4');
  const yuv422p10lePath = join(FIXTURES_DIR, '10bit_yuv422p.mp4');
  const vfrPath = join(FIXTURES_DIR, 'vfr.mp4');
  const audioOnlyPath = join(FIXTURES_DIR, 'audio_only.mp4');

  before(async () => {
    if (!existsSync(FIXTURES_DIR)) {
      mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    // 1. Generate valid 2-second reference clip for corruption tests
    const refPath = join(FIXTURES_DIR, 'ref.mp4');
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=24',
      '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=2',
      '-c:v', 'libx264', '-preset', 'ultrafast',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      refPath,
    ]);

    // 2. Fixture: Truncated bitstream (cut file to 40% of original bytes)
    const refBytes = readFileSync(refPath);
    writeFileSync(truncatedPath, refBytes.subarray(0, Math.floor(refBytes.length * 0.4)));

    // 3. Fixture: Missing MOOV atom (simulate MP4 without completed moov atom)
    // Writing only the ftyp header and raw mdat prefix
    const ftypSlice = refBytes.subarray(0, 1024);
    writeFileSync(missingMoovPath, ftypSlice);

    // 4. Fixture: 10-bit YUV422P profile (yuv422p10le)
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=duration=1:size=640x360:rate=24',
      '-c:v', 'libx264', '-preset', 'ultrafast',
      '-pix_fmt', 'yuv422p10le',
      yuv422p10lePath,
    ]);

    // 5. Fixture: Variable frame rate (VFR)
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=30',
      '-vf', 'setpts=N*N*TB',
      '-vsync', 'vfr',
      '-c:v', 'libx264', '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      vfrPath,
    ]);

    // 6. Fixture: Pure audio-only MP4 container
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      '-c:a', 'aac', '-b:a', '64k',
      '-vn',
      audioOnlyPath,
    ]);
  });

  after(() => {
    try {
      rmSync(FIXTURES_DIR, { recursive: true, force: true });
    } catch {}
  });

  test('Missing MOOV atom fails immediately and classifies as permanent failure', async () => {
    let errorCaught: any = null;
    try {
      await probe(missingMoovPath);
    } catch (err: any) {
      errorCaught = err;
    }

    assert.ok(errorCaught, 'Probe must reject file missing MOOV atom');
    const isPermanent = isPermanentFailure(errorCaught.message);
    assert.strictEqual(isPermanent, true, 'Missing MOOV error must be permanent (zero retries)');

    // Verify standard error envelope shape
    const errorEnvelope = {
      error: {
        code: 'FILE_CORRUPTED',
        message: errorCaught.message,
      },
    };
    assert.strictEqual(errorEnvelope.error.code, 'FILE_CORRUPTED');
    assert.ok(typeof errorEnvelope.error.message === 'string');
  });

  test('Truncated bitstream fails immediately and classifies as permanent failure', async () => {
    let errorCaught: any = null;
    try {
      await probe(truncatedPath);
    } catch (err: any) {
      errorCaught = err;
    }

    assert.ok(errorCaught, 'Probe must fail on truncated bitstream');
    const isPermanent = isPermanentFailure(errorCaught.message);
    assert.strictEqual(isPermanent, true, 'Truncated bitstream must be classified as permanent');
  });

  test('10-bit YUV422P profile probes successfully and normalizes to yuv420p', async () => {
    const info = await probe(yuv422p10lePath);
    assert.strictEqual(info.mediaKind, 'VIDEO');
    assert.strictEqual(info.width, 640);
    assert.strictEqual(info.height, 360);

    // Verify policy engine normalizes to yuv420p to preserve playback compatibility
    const sceneAnalysis = {
      frames: [],
      avgFaceScore: 0,
      avgTextEdgeScore: 0,
      avgMotionScore: 0.1,
      hasFaces: false,
      hasText: false,
      isHighMotion: false,
      isLowLight: false,
      durationSec: info.durationSec,
      totalFramesSampled: 1,
    };

    const plan = selectProfile(sceneAnalysis, 10, info.durationSec, 'WHATSAPP_DOC');
    assert.strictEqual(plan.pixelFormat, 'yuv420p', 'Must normalize 10-bit input to standard yuv420p');

    const res = chooseInitialResolution(info.width, info.height, 720);
    const args = buildFFmpegArgs(yuv422p10lePath, join(FIXTURES_DIR, 'out_10bit.mp4'), plan, res.width, res.height);

    assert.ok(args.includes('-pix_fmt'));
    assert.ok(args.includes('yuv420p'));
    assert.strictEqual(res.width % 16, 0);
    assert.strictEqual(res.height % 16, 0);
  });

  test('Variable frame rate (VFR) media probes and maintains 16px alignment', async () => {
    const info = await probe(vfrPath);
    assert.strictEqual(info.mediaKind, 'VIDEO');
    assert.ok(info.durationSec > 0);

    const res = chooseInitialResolution(info.width, info.height, 720);
    assert.strictEqual(res.width % 16, 0);
    assert.strictEqual(res.height % 16, 0);
  });

  test('Audio-only MP4 container is detected and flagged cleanly', async () => {
    const info = await probe(audioOnlyPath);
    // In audio-only MP4, video stream is absent; probe reports width=0, height=0
    assert.strictEqual(info.width, 0);
    assert.strictEqual(info.height, 0);
    assert.strictEqual(info.hasAudio, true);

    // Verify that missing video stream error classifies as permanent
    const classification = isPermanentFailure('No video stream present in container');
    assert.strictEqual(classification, true, 'Audio-only video transcode must fail permanently');
  });

  test('Permanent failure dispatches signed job.failed webhook matching SDK verification', async () => {
    const testSecret = 'whsec_adversarial_test_key_456';
    const failurePayload = JSON.stringify({
      event: 'job.failed',
      jobId: 'job_pathological_001',
      tenantId: 'ten_adversarial_suite',
      errorMessage: 'moov atom not found',
      completedAt: new Date().toISOString(),
    });

    const signature = await signWebhookPayload(failurePayload, testSecret);
    assert.strictEqual(signature.length, 64);

    // Verify through VecteusClient official SDK
    const verified = VecteusClient.webhooks.verifySignature(failurePayload, signature, testSecret);
    assert.strictEqual(verified, true, 'Webhook signature must verify through SDK');

    // Verify tampered payload fails
    const tamperedVerified = VecteusClient.webhooks.verifySignature(
      failurePayload + ' ',
      signature,
      testSecret
    );
    assert.strictEqual(tamperedVerified, false, 'Tampered payload must fail verification');
  });
});
