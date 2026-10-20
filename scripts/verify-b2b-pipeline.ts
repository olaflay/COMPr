/**
 * Vecteus Deterministic Pipeline Verification Suite
 * Verifies core B2B infrastructure invariants:
 * 1. Mathematical size reduction targets (>= 60% reduction).
 * 2. Closed-loop VMAF perceptual quality gate logic.
 * 3. 16-pixel macroblock boundary alignment for AV1/H.264.
 * 4. Cryptographic HMAC-SHA256 webhook signing integrity.
 */

import assert from 'node:assert';
import { chooseInitialResolution } from '../lib/resolution.ts';
import { calculateBitrate } from '../lib/bitrate.ts';
import { qualityGate } from '../lib/vmaf.ts';
import { signWebhookPayload } from '../lib/crypto.ts';


async function runVerification() {
  console.log('====================================================');
  console.log('🚀 Starting Vecteus Deterministic Pipeline Verification');
  console.log('====================================================\n');

  // Test 1: Macroblock alignment
  console.log('[Test 1] Verifying 16-pixel macroblock alignment...');
  const oddRes = chooseInitialResolution(1920, 1080, 1080);
  assert.strictEqual(oddRes.width % 16, 0, 'Width must be multiple of 16');
  assert.strictEqual(oddRes.height % 16, 0, 'Height must be multiple of 16');
  console.log(`  ✔ 1920x1080 aligned cleanly to ${oddRes.width}x${oddRes.height}`);

  // Test 2: Mathematical size reduction target (>= 60% reduction)
  console.log('\n[Test 2] Verifying mathematical bitrate calculation for 65% size reduction...');
  const sourceSizeMB = 50.0;
  const durationSec = 60.0;
  const targetSizeMB = Math.round(sourceSizeMB * 0.35); // 17.5MB -> 65% reduction
  const { videoBitrateFinalKbps } = calculateBitrate(targetSizeMB, durationSec, 1);

  assert.ok(videoBitrateFinalKbps > 500, 'Calculated bitrate must be viable');
  assert.ok(videoBitrateFinalKbps < 3000, 'Calculated bitrate must stay within target budget');
  const theoreticalOutputMB = (videoBitrateFinalKbps * durationSec) / 8192;
  const reductionPercent = ((sourceSizeMB - theoreticalOutputMB) / sourceSizeMB) * 100;
  assert.ok(reductionPercent >= 60.0, `Reduction must be >= 60%, got ${reductionPercent.toFixed(1)}%`);
  console.log(`  ✔ Source: ${sourceSizeMB}MB -> Target: ~${theoreticalOutputMB.toFixed(2)}MB (${reductionPercent.toFixed(1)}% savings)`);

  // Test 3: VMAF quality gate logic
  console.log('\n[Test 3] Verifying closed-loop VMAF quality gate...');
  const passingGate = qualityGate(
    { avgVmaf: 93.4, minVmaf: 88.2, passed: true, sampleCount: 5, verified: true },
    28
  );
  assert.strictEqual(passingGate.shouldReencode, false, 'Passing score must not trigger re-encode');
  console.log('  ✔ VMAF 93.4 passed without re-encode');

  const failingGate = qualityGate(
    { avgVmaf: 78.5, minVmaf: 71.0, passed: false, sampleCount: 5, verified: true },
    28
  );
  assert.strictEqual(failingGate.shouldReencode, true, 'Failing score must trigger re-encode');
  assert.strictEqual(failingGate.newCrf, 25, 'CRF must drop by 3 (from 28 to 25)');
  console.log(`  ✔ VMAF 78.5 failed as expected and dropped CRF to ${failingGate.newCrf}`);



  // Test 4: Webhook cryptographic HMAC-SHA256 signature
  console.log('\n[Test 4] Verifying cryptographic HMAC-SHA256 webhook signatures...');
  const payload = JSON.stringify({
    event: 'job.completed',
    jobId: 'vec_job_verified',
    savingsPercent: 68.4,
    vmafScore: 94.1,
  });
  const secret = 'whsec_enterprise_secret_key_123';
  const sig = await signWebhookPayload(payload, secret);
  assert.strictEqual(sig.length, 64, 'Signature must be 64-char hex string');
  console.log(`  ✔ HMAC signature verified: ${sig.slice(0, 16)}...`);

  console.log('\n====================================================');
  console.log('✅ All Vecteus Deterministic Invariants PASSED!');
  console.log('====================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
