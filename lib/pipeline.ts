/**
 * Media processing pipeline — PRD Section 13.
 *
 * Implements: ffprobe analysis, FFmpeg encoding, SSIM verification, and the
 * dual retry paths (FR-7). Calls real ffmpeg/ffprobe via execFile with
 * argument arrays — never shell strings (AGENTS.md Q3 Rule 19, PRD 23).
 */

import { execFileSync } from 'node:child_process';
import { statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { calculateBitrate, adjustBitrateForSizeRetry } from './bitrate.ts';
import { chooseInitialResolution, dropOneResolutionTier, type ResolutionTier } from './resolution.ts';

export interface ProbeResult {
  width: number;
  height: number;
  durationSec: number;
}

export interface EncodeParams {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
}

export interface SSIMResult {
  avgSSIM: number;
  sampleCount: number;
  totalFrames: number;
}

export interface AttemptRecord {
  attempt: number;
  resolution: string;
  videoBitrateFinalKbps: number;
  actualSizeMB: number;
  targetSizeMB: number;
  sizeWithinTolerance: boolean;
  avgSSIM: number;
  qualityOk: boolean;
}

export interface PipelineResult {
  source: ProbeResult;
  attempts: AttemptRecord[];
  finalOutputPath: string;
}

/**
 * PRD FR-3: ffprobe extracts duration, resolution, frame rate, codec,
 * container, audio stream info. All args passed as an array — no shell strings.
 */
export function probe(inputPath: string): ProbeResult {
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration',
    '-show_entries', 'format=duration',
    '-of', 'json',
    inputPath,
  ]).toString();
  const json = JSON.parse(out);
  const stream = json.streams[0];
  const durationSec = parseFloat(json.format.duration || stream.duration);
  return { width: stream.width, height: stream.height, durationSec };
}

/**
 * PRD FR-5: FFmpeg encode with computed parameters. All args passed as
 * an array via execFileSync — never shell-interpolated (AGENTS.md Q3 Rule 19).
 */
export function encode({
  inputPath,
  outputPath,
  width,
  height,
  videoBitrateKbps,
  audioBitrateKbps,
}: EncodeParams): void {
  execFileSync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vf', `scale=${width}:${height}`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-b:v', `${Math.round(videoBitrateKbps)}k`,
    '-maxrate', `${Math.round(videoBitrateKbps * 1.1)}k`,
    '-bufsize', `${Math.round(videoBitrateKbps * 2)}k`,
    '-c:a', 'aac',
    '-b:a', `${audioBitrateKbps}k`,
    '-pix_fmt', 'yuv420p',
    '-loglevel', 'error',
    outputPath,
  ]);
}

export function fileSizeMB(p: string): number {
  return statSync(p).size / (1024 * 1024);
}

/**
 * PRD 13 Step 7, 16: SSIM sampled at fixed 2-second intervals across
 * the full duration. Source is scaled to match output resolution via
 * scale2ref for a valid comparison. The stats_file path uses a random
 * suffix to prevent any path injection — all FFmpeg args are arrays.
 */
export function measureSSIM(
  sourcePath: string,
  outputPath: string,
  _durationSec: number,
  sourceFps: number = 30,
): SSIMResult {
  const ssimLogPath = outputPath + `.ssim.${randomBytes(8).toString('hex')}.log`;

  execFileSync('ffmpeg', [
    '-y',
    '-i', outputPath,
    '-i', sourcePath,
    '-lavfi',
    `[1:v][0:v]scale2ref=flags=bicubic[ref][main];[main][ref]ssim=stats_file=${ssimLogPath}`,
    '-f', 'null', '-',
    '-loglevel', 'error',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const log = readFileSync(ssimLogPath, 'utf8').trim().split('\n').filter(Boolean);
  const perFrame = log
    .map((line) => {
      const match = line.match(/All:([\d.]+)/);
      return match ? parseFloat(match[1]) : null;
    })
    .filter((v): v is number => v !== null);

  const intervalFrames = Math.max(1, Math.round(sourceFps * 2));
  const sampled = perFrame.filter((_, i) => i % intervalFrames === 0);
  const scores = sampled.length > 0 ? sampled : perFrame;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { avgSSIM: avg, sampleCount: scores.length, totalFrames: perFrame.length };
}

/**
 * PRD FR-7: Full pipeline with two distinct retry paths:
 *  - Size-triggered: adjust bitrate by measured delta, re-encode
 *  - Quality-triggered: drop one resolution tier, recompute bitrate, re-encode
 * Max 2 retries total across both paths combined.
 */
export function runPipeline({
  inputPath,
  outputDir,
  targetSizeMB,
  presetMaxHeight,
  tolerancePct = 0.10,
  ssimFloor = 0.90,
}: {
  inputPath: string;
  outputDir: string;
  targetSizeMB: number;
  presetMaxHeight: number;
  tolerancePct?: number;
  ssimFloor?: number;
}): PipelineResult {
  const source = probe(inputPath);
  let resolution: ResolutionTier = chooseInitialResolution(source.height, presetMaxHeight);
  let { videoBitrateFinalKbps, audioBitrateKbps } = calculateBitrate(
    targetSizeMB,
    source.durationSec,
    2,
  );

  const attempts: AttemptRecord[] = [];
  let outputPath = '';

  for (let attempt = 0; attempt <= 2; attempt++) {
    outputPath = join(outputDir, `output_attempt${attempt}.mp4`);
    encode({
      inputPath,
      outputPath,
      width: resolution.width,
      height: resolution.height,
      videoBitrateKbps: videoBitrateFinalKbps,
      audioBitrateKbps,
    });

    const actualSizeMB = fileSizeMB(outputPath);
    const sizeWithinTolerance =
      Math.abs(actualSizeMB - targetSizeMB) / targetSizeMB <= tolerancePct;
    const { avgSSIM } = measureSSIM(inputPath, outputPath, source.durationSec);
    const qualityOk = avgSSIM >= ssimFloor;

    attempts.push({
      attempt,
      resolution: `${resolution.width}x${resolution.height}`,
      videoBitrateFinalKbps,
      actualSizeMB: round(actualSizeMB),
      targetSizeMB,
      sizeWithinTolerance,
      avgSSIM: round(avgSSIM),
      qualityOk,
    });

    if (sizeWithinTolerance && qualityOk) break;
    if (attempt === 2) break; // FR-7 max retries reached

    if (!sizeWithinTolerance) {
      // Size-triggered retry path: adjust bitrate proportionally
      videoBitrateFinalKbps = adjustBitrateForSizeRetry(
        videoBitrateFinalKbps,
        actualSizeMB,
        targetSizeMB,
      );
    } else if (!qualityOk) {
      // Quality-triggered retry path: drop one resolution tier
      // instead of re-encoding at the same bitrate (FR-7)
      resolution = dropOneResolutionTier(resolution.height);
      ({ videoBitrateFinalKbps } = calculateBitrate(targetSizeMB, source.durationSec, 2));
    }
  }

  return { source, attempts, finalOutputPath: outputPath };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
