/**
 * Media scene analysis — adaptive engine analysis service.
 *
 * Extracts 1fps frames (adaptive-engine.md Rule 3), runs face detection
 * via Haar Cascade and text detection via Canny edge analysis, and computes
 * motion scores between consecutive frames. All heavy OpenCV work runs in
 * an isolated Python subprocess, never in Node.js heap.
 */

import { mkdirSync, readdirSync, unlinkSync, existsSync, readFileSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { runFfmpeg, runCommand } from './media-process.ts';

/** Frames per second to sample for analysis (adaptive-engine.md Rule 3). */
const ANALYSIS_FPS = 1;

export interface FrameAnalysis {
  timestampSec: number;
  faceScore: number;
  textEdgeScore: number;
  brightnessMean: number;
  contrastStdDev: number;
}

export interface SceneAnalysis {
  frames: FrameAnalysis[];
  avgFaceScore: number;
  avgTextEdgeScore: number;
  avgMotionScore: number;
  hasFaces: boolean;
  hasText: boolean;
  isHighMotion: boolean;
  isLowLight: boolean;
  durationSec: number;
  totalFramesSampled: number;
}

interface OpenCVFrameResult {
  face_score: number;
  text_edge_score: number;
  brightness_mean: number;
  contrast_stddev: number;
}

/**
 * Extract 1fps frames from a video file to a temporary directory.
 * Returns the directory path containing frame_NNNN.jpg files.
 */
export async function extractFrames(inputPath: string, tempDir: string): Promise<string> {
  const frameDir = join(tempDir, `frames_${randomBytes(6).toString('hex')}`);
  mkdirSync(frameDir, { recursive: true });

  try {
    await runFfmpeg([
      '-y',
      '-i', inputPath,
      '-vf', `fps=${ANALYSIS_FPS}`,
      '-q:v', '2',
      '-loglevel', 'error',
      join(frameDir, 'frame_%04d.jpg'),
    ], { timeout: 30_000 });
  } catch (err) {
    cleanupDir(frameDir);
    throw err;
  }

  return frameDir;
}

/**
 * Get sorted list of frame file paths from a frame directory.
 */
export function getFramePaths(frameDir: string): string[] {
  if (!existsSync(frameDir)) return [];
  return readdirSync(frameDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort()
    .map((f) => join(frameDir, f));
}

/**
 * Run OpenCV analysis on a single frame via Python subprocess.
 * Returns face score, text edge score, brightness, and contrast.
 */
export async function analyzeFrame(framePath: string): Promise<OpenCVFrameResult> {
  const scriptPath = join(process.cwd(), 'lib', 'opencv_analyze.py');

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const out = (await runCommand(pythonCmd, [scriptPath, framePath], {
    timeout: 10_000,
  })).trim();

  const result = JSON.parse(out) as OpenCVFrameResult;

  // Clamp scores to 0-1 range
  return {
    face_score: clamp(result.face_score, 0, 1),
    text_edge_score: clamp(result.text_edge_score, 0, 1),
    brightness_mean: clamp(result.brightness_mean, 0, 255),
    contrast_stddev: clamp(result.contrast_stddev, 0, 128),
  };
}

/**
 * Compute motion score between two consecutive frames using FFmpeg SSIM.
 * High SSIM between frames = low motion; low SSIM = high motion.
 * Returns a normalized motion magnitude (0-1).
 */
export async function computeMotionScore(frameAPath: string, frameBPath: string): Promise<number> {
  const logName = `ssim_${randomBytes(4).toString('hex')}.log`;
  const logPath = join('temp', logName).replace(/\\/g, '/');
  const cleanup = () => { try { unlinkSync(join('temp', logName)); } catch {} };

  try {
    await runFfmpeg([
      '-i', frameAPath,
      '-i', frameBPath,
      '-lavfi', `[0:v][1:v]ssim=stats_file=${logPath}`,
      '-f', 'null', '-',
    ], { timeout: 5_000 });

    const stats = readFileSync(logPath, 'utf8');
    // Stats file format: n:1 Y:1.000000 U:1.000000 V:1.000000 All:1.000000 (inf)
    const allMatch = stats.match(/All:([\d.]+)/);
    if (allMatch) {
      const ssim = parseFloat(allMatch[1]);
      // SSIM 1.0 = identical (motion=0), SSIM 0.0 = completely different (motion=1)
      return clamp(1 - ssim, 0, 1);
    }
    return 0;
  } catch {
    return 0;
  } finally {
    cleanup();
  }
}

/**
 * Full scene analysis pipeline. Extracts frames, runs OpenCV analysis,
 * computes motion, and returns aggregated SceneAnalysis.
 *
 * Conforms to adaptive-engine.md Rule 3: 1fps sampling only.
 */
export async function analyzeScene(
  inputPath: string,
  durationSec: number,
  tempDir: string,
): Promise<SceneAnalysis> {
  // 1. Extract 1fps frames
  const frameDir = await extractFrames(inputPath, tempDir);
  try {
    const framePaths = getFramePaths(frameDir);

    if (framePaths.length === 0) {
      return emptyAnalysis(durationSec);
    }

    // 2. Analyze each frame for face/text/brightness
    const frames: FrameAnalysis[] = await Promise.all(
      framePaths.map(async (fp, idx) => {
        const result = await analyzeFrame(fp);
        return {
          timestampSec: idx * (1 / ANALYSIS_FPS),
          faceScore: result.face_score,
          textEdgeScore: result.text_edge_score,
          brightnessMean: result.brightness_mean,
          contrastStdDev: result.contrast_stddev,
        };
      })
    );

    // 3. Compute motion scores between consecutive frames
    const motionScores: number[] = [];
    for (let i = 1; i < framePaths.length; i++) {
      motionScores.push(await computeMotionScore(framePaths[i - 1], framePaths[i]));
    }

    // 4. Aggregate
    const avgFaceScore = mean(frames.map((f) => f.faceScore));
    const avgTextEdgeScore = mean(frames.map((f) => f.textEdgeScore));
    const avgMotionScore = motionScores.length > 0 ? mean(motionScores) : 0;
    const avgBrightness = mean(frames.map((f) => f.brightnessMean));

    return {
      frames,
      avgFaceScore: round(avgFaceScore),
      avgTextEdgeScore: round(avgTextEdgeScore),
      avgMotionScore: round(avgMotionScore),
      hasFaces: avgFaceScore > 0.05,
      hasText: avgTextEdgeScore > 0.3,
      isHighMotion: avgMotionScore > 0.6,
      isLowLight: avgBrightness < 40,
      durationSec,
      totalFramesSampled: framePaths.length,
    };
  } finally {
    // 5. Cleanup frame directory
    cleanupDir(frameDir);
  }
}

function emptyAnalysis(durationSec: number): SceneAnalysis {
  return {
    frames: [],
    avgFaceScore: 0,
    avgTextEdgeScore: 0,
    avgMotionScore: 0,
    hasFaces: false,
    hasText: false,
    isHighMotion: false,
    isLowLight: false,
    durationSec,
    totalFramesSampled: 0,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function cleanupDir(dir: string): void {
  try {
    const files = readdirSync(dir);
    for (const f of files) {
      try { unlinkSync(join(dir, f)); } catch {}
    }
    rmdirSync(dir);
  } catch {}
}
