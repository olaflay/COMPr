/**
 * VMAF quality verification — adaptive engine quality gate.
 *
 * Runs VMAF on sampled keyframes (1 per 2 seconds, adaptive-engine.md Rule 3)
 * using the pre-compiled VMAF model. Triggers a single re-encode fallback with
 * CRF reduced by 3 if the score falls below 80 (debate decision).
 *
 * All FFmpeg args are arrays — never shell-interpolated (AGENTS.md Q3 Rule 20).
 */

import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runFfmpeg } from './media-process.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// VMAF model path — bundled in repo per deployment decision
const DEFAULT_MODEL_PATH = join(__dirname, '..', 'models', 'vmaf_v0.6.1.json');

/** VMAF floor below which a re-encode is triggered (debate decision). */
export const VMAF_FLOOR = 80;

/** CRF reduction applied on VMAF-triggered re-encode (debate decision). */
export const VMAF_REDUCE_CRF = 3;

/** Minimum VMAF score that indicates catastrophic frame quality. */
export const VMAF_MIN_WARN = 60;

export interface VmafResult {
  avgVmaf: number | null;
  minVmaf: number | null;
  sampleCount: number;
  passed: boolean;
  /** true when a real VMAF measurement was produced; false when the tool
   *  could not measure (missing filter, missing model, ffmpeg error). */
  verified: boolean;
}

export interface QualityGateResult {
  shouldReencode: boolean;
  newCrf?: number;
  vmafResult: VmafResult;
  reason: string;
}

// VMAF filter invocation varies by FFmpeg build:
// - FFmpeg >= 7 (gyan.dev 8.1.2 here): filter is 'libvmaf', model passed as
//   'model=version=vmaf_v0.6.1' (built-in) or 'model=<path>'.
// - Older FFmpeg (6.x and below): filter is 'vmaf', model passed as
//   'model_path=<path>'.
// Probe once at first measurement and cache the working invocation.
type VmafInvocation = {
  filter: string;
  modelArg: string;
  label: string;
};

const VMAF_INVOCATIONS: Array<(modelPath: string) => VmafInvocation> = [
  () => ({ filter: 'libvmaf', modelArg: 'model=version=vmaf_v0.6.1', label: 'libvmaf built-in model' }),
  (modelPath: string) => ({ filter: 'libvmaf', modelArg: `model_path=${escapeFilterPath(modelPath)}`, label: 'libvmaf file model' }),
  (modelPath: string) => ({ filter: 'vmaf', modelArg: `model_path=${escapeFilterPath(modelPath)}`, label: 'vmaf file model' }),
];

let cachedInvocation: VmafInvocation | null = null;
let probeFailed = false;

/** Run a tiny throwaway VMAF measurement to find the working invocation. */
async function probeVmafInvocation(modelPath: string): Promise<VmafInvocation | null> {
  if (cachedInvocation) return cachedInvocation;
  if (probeFailed) return null;

  for (const build of VMAF_INVOCATIONS) {
    try {
      const inv = build(modelPath);
      const filter = `[1:v][0:v]scale2ref=flags=bicubic[ref][main];[main][ref]${inv.filter}=${inv.modelArg}:log_fmt=json`;
      // 1s @ 10fps = 10 real frames. libvmaf segfaults (0xC0000005) on
      // near-empty input (e.g. 0.1s @ 1fps = 0.1 frames), so never probe tiny.
      const args = [
        '-y', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=64x64:rate=10',
        '-f', 'lavfi', '-i', 'testsrc=duration=1:size=64x64:rate=10',
        '-lavfi', filter, '-f', 'null', '-', '-loglevel', 'error',
      ];
      await runFfmpeg(args, { timeout: 30_000 });
      cachedInvocation = inv;
      console.log(`[VMAF] Using invocation: ${inv.label}`);
      return inv;
    } catch {
      // try next invocation
    }
  }

  probeFailed = true;
  console.error('[VMAF] No working VMAF invocation found — quality gate will report unverified.');
  return null;
}

/**
 * Measure VMAF between source and output using sampled keyframes.
 *
 * FFmpeg VMAF filter template (modern):
 *   ffmpeg -y -threads 0 \
 *     -i output.mp4 -i source.mp4 \
 *     -lavfi "[1:v][0:v]scale2ref=flags=bicubic[ref][main]; \
 *              [main][ref]libvmaf=model=version=vmaf_v0.6.1:log_path=LOG:log_fmt=json" \
 *     -f null - -loglevel error
 *
 * Sampled at 1 frame per 2 seconds (adaptive-engine.md Rule 3).
 */
export async function measureVmaf(
  sourcePath: string,
  outputPath: string,
  durationSec: number,
  sourceFps: number = 30,
  modelPath?: string,
): Promise<VmafResult> {
  const resolvedModelPath = modelPath || DEFAULT_MODEL_PATH;

  // Fall back to unverified result if the VMAF model file is missing
  if (!existsSync(resolvedModelPath)) {
    console.warn(`[VMAF] Model not found at ${resolvedModelPath}, quality unverified`);
    return { avgVmaf: null, minVmaf: null, sampleCount: 0, passed: false, verified: false };
  }

  const invocation = await probeVmafInvocation(resolvedModelPath);
  if (!invocation) {
    // Measurement tool genuinely unavailable — never fabricate a pass.
    return { avgVmaf: null, minVmaf: null, sampleCount: 0, passed: false, verified: false };
  }

  const logPath = `vmaf_${randomBytes(8).toString('hex')}.json`;
  const startOffset = durationSec && durationSec > 0
    ? Math.max(0, Math.floor(durationSec / 2) - 2.5)
    : 0;

  try {
    // Build VMAF filter with scale2ref for resolution matching
    const vmafFilter = [
      `[1:v][0:v]scale2ref=flags=bicubic[ref][main]`,
      `[main][ref]${invocation.filter}=${invocation.modelArg}` +
      `:log_path='${logPath}'` +
      `:log_fmt=json`,
    ].join(';');

    await runFfmpeg([
      '-y',
      '-threads', '0',
      '-ss', startOffset.toString(),
      '-t', '5',
      '-i', outputPath,
      '-ss', startOffset.toString(),
      '-t', '5',
      '-i', sourcePath,
      '-lavfi', vmafFilter,
      '-f', 'null', '-',
      '-loglevel', 'error',
    ], {
      timeout: 120_000,
    });

    // Parse VMAF log output
    return parseVmafLog(logPath, sourceFps);
  } catch (err: any) {
    console.error('[VMAF] Measurement failed:', err.message);
    // Never fabricate a pass on measurement failure — report unverified so
    // the quality gate cannot pass on a number that was never measured.
    return { avgVmaf: null, minVmaf: null, sampleCount: 0, passed: false, verified: false };
  } finally {
    try { unlinkSync(logPath); } catch {}
  }
}

/**
 * Parse VMAF JSON log file and extract per-frame scores.
 * Samples at 1 frame per 2 seconds (adaptive-engine.md Rule 3).
 */
function parseVmafLog(
  logPath: string,
  sourceFps: number,
): VmafResult {
  if (!existsSync(logPath)) {
    // No log produced = no measurement = never a pass
    return { avgVmaf: null, minVmaf: null, sampleCount: 0, passed: false, verified: false };
  }

  const raw = readFileSync(logPath, 'utf8');
  const data = JSON.parse(raw);

  // VMAF log format: { "frames": [{ "frameNum": 0, "metrics": { "vmaf": 95.2 } }, ...] }
  const frames = data.frames || [];
  const vmafScores: number[] = frames
    .map((f: any) => f.metrics?.vmaf)
    .filter((v: any) => typeof v === 'number' && !isNaN(v));

  if (vmafScores.length === 0) {
    return { avgVmaf: null, minVmaf: null, sampleCount: 0, passed: false, verified: false };
  }

  // Sample at 1 frame per 2 seconds (matching SSIM logic in pipeline.ts)
  const intervalFrames = Math.max(1, Math.round(sourceFps * 2));
  const sampled = vmafScores.filter((_: number, i: number) => i % intervalFrames === 0);
  const scores = sampled.length > 0 ? sampled : vmafScores;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);

  return {
    avgVmaf: round(avg),
    minVmaf: round(min),
    sampleCount: scores.length,
    passed: avg >= VMAF_FLOOR,
    verified: true,
  };
}

/**
 * Quality gate: determines whether a re-encode is needed based on VMAF score.
 * Returns the adjusted CRF if re-encoding is recommended.
 */
export function qualityGate(
  vmafResult: VmafResult,
  originalCrf: number,
): QualityGateResult {
  // Unverified = measurement never happened. Never pass, never re-encode
  // (re-encoding cannot fix a broken measurement tool).
  if (!vmafResult.verified) {
    return {
      shouldReencode: false,
      vmafResult,
      reason: 'VMAF measurement unavailable — quality unverified, SSIM gate only',
    };
  }

  if (vmafResult.passed) {
    const reason = vmafResult.minVmaf !== null && vmafResult.minVmaf < VMAF_MIN_WARN
      ? `VMAF avg ${vmafResult.avgVmaf} passed but min ${vmafResult.minVmaf} is low`
      : `VMAF ${vmafResult.avgVmaf} >= ${VMAF_FLOOR} floor`;

    return {
      shouldReencode: false,
      vmafResult,
      reason,
    };
  }

  const newCrf = Math.max(20, originalCrf - VMAF_REDUCE_CRF);
  return {
    shouldReencode: true,
    newCrf,
    vmafResult,
    reason: `VMAF ${vmafResult.avgVmaf} < ${VMAF_FLOOR} floor, re-encoding at CRF ${newCrf} (was ${originalCrf})`,
  };
}

/**
 * Escape a file path for use inside FFmpeg filter expressions.
 * Colons and backslashes need escaping in filter graph strings.
 */
function escapeFilterPath(p: string): string {
  // Normalize to forward slashes, then escape colons for FFmpeg filter syntax
  const normalized = p.replace(/\\/g, '/');
  return `'${normalized.replace(/:/g, '\\:')}'`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
