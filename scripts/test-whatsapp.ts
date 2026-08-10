/**
 * End-to-end test: runs the adaptive engine on test media and verifies
 * WhatsApp-compliant output. Usage:
 *   node --experimental-strip-types scripts/test-whatsapp.ts
 */

import { statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runFfprobe } from '../lib/media-process.ts';

const TEST_DIR = join(process.cwd(), 'test');
const OUTPUT_DIR = join(process.cwd(), 'temp', 'whatsapp_test');
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

function check(name: string, pass: boolean, detail: string): CheckResult {
  const icon = pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${icon} ${name}: ${detail}`);
  return { name, pass, detail };
}

async function probe(filePath: string): Promise<Record<string, any>> {
  const out = await runFfprobe([
    '-v', 'error',
    '-show_entries', 'stream=codec_name,codec_type,width,height,bit_rate:format=duration,size,bit_rate',
    '-of', 'json',
    filePath,
  ]);
  return JSON.parse(out);
}

// ─── VIDEO TEST ────────────────────────────────────────────────
console.log('\n=== Video Pipeline Test ===');
const videoInput = join(TEST_DIR, 'test_video.mp4');
const videoOutput = join(OUTPUT_DIR, 'output_video.mp4');

if (!existsSync(videoInput)) {
  console.error('  Missing test_video.mp4 in test/');
  process.exit(1);
}

console.log(`  Input: ${(statSync(videoInput).size / 1024 / 1024).toFixed(2)} MB`);

const videoChecks: CheckResult[] = [];

try {
  const { runAdaptivePipeline } = await import('../lib/pipeline.ts');
  const result = await runAdaptivePipeline({
    inputPath: videoInput,
    outputDir: OUTPUT_DIR,
    targetSizeMB: 16,
    prioritizeDetail: false,
  });

  // Move final output to predictable path
  if (existsSync(videoOutput)) {
    const { unlinkSync } = await import('node:fs');
    unlinkSync(videoOutput);
  }
  const { renameSync } = await import('node:fs');
  renameSync(result.finalOutputPath, videoOutput);

  const outputSizeMB = statSync(videoOutput).size / 1024 / 1024;
  const probeResult = await probe(videoOutput);
  const vStream = probeResult.streams?.find((s: any) => s.codec_type === 'video');
  const aStream = probeResult.streams?.find((s: any) => s.codec_type === 'audio');
  const duration = parseFloat(probeResult.format?.duration || '0');

  // WhatsApp compliance checks
  videoChecks.push(check('Output exists', existsSync(videoOutput), `${outputSizeMB.toFixed(2)} MB`));
  videoChecks.push(check('Size ≤ 16 MB', outputSizeMB <= 16, `${outputSizeMB.toFixed(2)} MB`));
  videoChecks.push(check('Duration ≤ 90s', duration <= 90, `${duration.toFixed(1)}s`));
  videoChecks.push(check('Width ≤ 1280', (vStream?.width || 0) <= 1280, `${vStream?.width}x${vStream?.height}`));
  videoChecks.push(check('Height ≤ 720', (vStream?.height || 0) <= 720, `${vStream?.width}x${vStream?.height}`));
  videoChecks.push(check('Has audio', !!aStream, aStream?.codec_name || 'none'));

  // Adaptive engine checks
  const attempt = result.attempts[result.attempts.length - 1];
  videoChecks.push(check('Profile selected', true, attempt.profileName));
  videoChecks.push(check('Codec', true, attempt.codec));
  videoChecks.push(check('CRF', true, String(attempt.crf)));

  if (attempt.vmaf) {
    videoChecks.push(check('VMAF score', attempt.vmaf.passed, `${attempt.vmaf.avgVmaf}`));
  }

  console.log(`\n  Profile: ${result.plan.profileName} (${result.plan.codec}) CRF=${result.plan.crf}`);
  console.log(`  Reason: ${attempt.reason}`);
} catch (err: any) {
  videoChecks.push(check('Pipeline', false, err.message));
}

// ─── IMAGE TEST ────────────────────────────────────────────────
console.log('\n=== Image Pipeline Test ===');
const imageInput = join(TEST_DIR, 'test_image.jpg');
const imageOutput = join(OUTPUT_DIR, 'output_image.jpg');

if (!existsSync(imageInput)) {
  console.error('  Missing test_image.jpg in test/');
  process.exit(1);
}

console.log(`  Input: ${(statSync(imageInput).size / 1024).toFixed(1)} KB`);

const imageChecks: CheckResult[] = [];

try {
  const { processImage } = await import('../lib/pipeline.ts');
  const result = await processImage({
    inputPath: imageInput,
    outputPath: imageOutput,
    maxLongEdgePx: 1080,
  });

  const outputSizeKB = statSync(imageOutput).size / 1024;
  await probe(imageOutput);

  imageChecks.push(check('Output exists', existsSync(imageOutput), `${outputSizeKB.toFixed(1)} KB`));
  imageChecks.push(check('Long edge ≤ 1080px', Math.max(result.width, result.height) <= 1080, `${result.width}x${result.height}`));
  imageChecks.push(check('Width ≤ 1080', result.width <= 1080, `${result.width}px`));
  imageChecks.push(check('Height ≤ 1080', result.height <= 1080, `${result.height}px`));
} catch (err: any) {
  imageChecks.push(check('Pipeline', false, err.message));
}

// ─── SUMMARY ───────────────────────────────────────────────────
const allChecks = [...videoChecks, ...imageChecks];
const passed = allChecks.filter((c) => c.pass).length;
const failed = allChecks.filter((c) => !c.pass).length;

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed}/${allChecks.length} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);

if (failed > 0) {
  console.log('\nFailed checks:');
  allChecks.filter((c) => !c.pass).forEach((c) => console.log(`  - ${c.name}: ${c.detail}`));
  process.exit(1);
}

console.log('\nAll checks passed. Media is WhatsApp-ready.');
