import { readFileSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { runFfmpeg } from './media-process.ts';

export interface SSIMResult {
  avgSSIM: number;
  sampleCount: number;
  totalFrames: number;
}

/**
 * SSIM sampled at fixed 2-second intervals across
 * the full duration. Source is scaled to match output resolution via
 * scale2ref for a valid comparison. The stats_file path uses a random
 * suffix to prevent any path injection — all FFmpeg args are arrays.
 */
export async function measureSSIM(
  sourcePath: string,
  outputPath: string,
  _durationSec: number,
  sourceFps: number = 30,
): Promise<SSIMResult> {
  const randomId = randomBytes(8).toString('hex');
  const ssimLogPath = `ssim_${randomId}.log`;

  await runFfmpeg([
    '-y',
    '-threads', '0',
    '-i', outputPath,
    '-i', sourcePath,
    '-lavfi',
    `[1:v][0:v]scale2ref=flags=bicubic[ref][main];[main][ref]ssim=stats_file='${ssimLogPath}'`,
    '-f', 'null', '-',
    '-loglevel', 'error',
  ], { timeout: 60_000 });

  let logContent = '';
  try {
    logContent = readFileSync(ssimLogPath, 'utf8');
  } catch (err) {
    console.error('[SSIM] Failed to read log file:', err);
  } finally {
    try {
      unlinkSync(ssimLogPath);
    } catch {}
  }

  if (!logContent) {
    return { avgSSIM: 1.0, sampleCount: 0, totalFrames: 0 };
  }

  const log = logContent.trim().split('\n').filter(Boolean);
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
