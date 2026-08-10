/**
 * Media processing pipeline orchestration — PRD Section 13.
 *
 * Implements: dual retry paths (FR-7), and the adaptive engine pipeline.
 * Coordinates modular tasks (probe, encode, ssim) to maintain file sizes under 200 lines.
 */

import { join } from 'node:path';
import { calculateBitrate, adjustBitrateForSizeRetry } from './bitrate.ts';
import { chooseInitialResolution, dropOneResolutionTier, type ResolutionTier } from './resolution.ts';
import { analyzeScene } from './analysis.ts';
import { selectProfile, buildFFmpegArgs, type EncodingPlan } from './policy-engine.ts';
import { measureVmaf, qualityGate, type VmafResult } from './vmaf.ts';
import { probe, type ProbeResult } from './probe.ts';
import { encode, processImage, fileSizeMB, type EncodeParams, type ImageParams, type ImageResult } from './encode.ts';
import { measureSSIM, type SSIMResult } from './ssim.ts';
import { runFfmpeg } from './media-process.ts';

export { probe, encode, processImage, measureSSIM, fileSizeMB };
export type { ProbeResult, EncodeParams, ImageParams, ImageResult, SSIMResult };

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

export interface AdaptiveAttemptRecord {
  attempt: number;
  profileName: string;
  codec: string;
  resolution: string;
  crf: number;
  actualSizeMB: number;
  targetSizeMB: number;
  sizeWithinTolerance: boolean;
  vmaf: VmafResult | null;
  qualityOk: boolean;
  reason: string;
}

export interface AdaptivePipelineResult {
  source: ProbeResult;
  attempts: AdaptiveAttemptRecord[];
  finalOutputPath: string;
  plan: EncodingPlan;
}

/**
 * PRD FR-7: Full pipeline with two distinct retry paths:
 *  - Size-triggered: adjust bitrate by measured delta, re-encode
 *  - Quality-triggered: drop one resolution tier, recompute bitrate, re-encode
 * Max 2 retries total across both paths combined.
 */
export async function runPipeline({
  inputPath,
  outputDir,
  targetSizeMB,
  presetMaxHeight,
  tolerancePct = 0.10,
  ssimFloor = 0.90,
  prioritizeDetail = false,
  cpuPreset = 'medium',
  passCount = 2,
}: {
  inputPath: string;
  outputDir: string;
  targetSizeMB: number;
  presetMaxHeight: number;
  tolerancePct?: number;
  ssimFloor?: number;
  prioritizeDetail?: boolean;
  cpuPreset?: 'slow' | 'medium' | 'fast';
  passCount?: 1 | 2;
}): Promise<PipelineResult> {
  const source = await probe(inputPath);
  const sourceSizeMB = fileSizeMB(inputPath);
  const effectiveTargetSizeMB = Math.min(targetSizeMB, sourceSizeMB);
  const isPortrait = source.height > source.width;

  let resolution: ResolutionTier = chooseInitialResolution(source.width, source.height, presetMaxHeight);
  // PRD §26: audio-less videos skip audio bitrate allocation entirely
  const audioChannels = source.hasAudio ? 2 : 0;
  let { videoBitrateFinalKbps, audioBitrateKbps } = calculateBitrate(
    effectiveTargetSizeMB,
    source.durationSec,
    audioChannels,
  );

  const attempts: AttemptRecord[] = [];
  let outputPath = '';

  for (let attempt = 0; attempt <= 2; attempt++) {
    outputPath = join(outputDir, `output_attempt${attempt}.mp4`);
    await encode({
      inputPath,
      outputPath,
      width: resolution.width,
      height: resolution.height,
      videoBitrateKbps: videoBitrateFinalKbps,
      audioBitrateKbps,
      cpuPreset,
      passCount,
      isHdr: source.isHdr,
    });

    const actualSizeMB = fileSizeMB(outputPath);
    const sizeWithinTolerance =
      Math.abs(actualSizeMB - effectiveTargetSizeMB) / effectiveTargetSizeMB <= tolerancePct;
    const { avgSSIM } = await measureSSIM(inputPath, outputPath, source.durationSec);
    const qualityOk = avgSSIM >= ssimFloor;

    attempts.push({
      attempt,
      resolution: `${resolution.width}x${resolution.height}`,
      videoBitrateFinalKbps,
      actualSizeMB: round(actualSizeMB),
      targetSizeMB: effectiveTargetSizeMB,
      sizeWithinTolerance,
      avgSSIM: round(avgSSIM),
      qualityOk,
    });

    if (sizeWithinTolerance && (qualityOk || prioritizeDetail)) break;
    if (attempt === 2) break; // FR-7 max retries reached

    if (!sizeWithinTolerance) {
      // Size-triggered retry path: adjust bitrate proportionally
      videoBitrateFinalKbps = adjustBitrateForSizeRetry(
        videoBitrateFinalKbps,
        actualSizeMB,
        effectiveTargetSizeMB,
      );
    } else if (!qualityOk && !prioritizeDetail) {
      // Quality-triggered retry path: drop one resolution tier
      resolution = dropOneResolutionTier(resolution.height, isPortrait);
      ({ videoBitrateFinalKbps } = calculateBitrate(effectiveTargetSizeMB, source.durationSec, 2));
    }
  }

  return { source, attempts, finalOutputPath: outputPath };
}

/**
 * Adaptive engine pipeline: scene analysis → profile selection → AV1 encode → VMAF gate.
 * Falls back to H.264 if AV1 encode fails.
 * Max 1 VMAF-triggered re-encode with CRF reduced by 3.
 */
export async function runAdaptivePipeline({
  inputPath,
  outputDir,
  targetSizeMB,
  prioritizeDetail = false,
  destination = 'WHATSAPP_NORMAL',
}: {
  inputPath: string;
  outputDir: string;
  targetSizeMB: number;
  prioritizeDetail?: boolean;
  destination?: string;
}): Promise<AdaptivePipelineResult> {
  const source = await probe(inputPath);
  const sourceSizeMB = fileSizeMB(inputPath);
  const effectiveTargetSizeMB = Math.min(targetSizeMB, sourceSizeMB);

  // 1. Analyze scene
  const tempDir = outputDir;
  const analysis = await analyzeScene(inputPath, source.durationSec, tempDir);
  console.log(`[Adaptive] Scene: faces=${analysis.hasFaces} text=${analysis.hasText} motion=${analysis.avgMotionScore.toFixed(3)} lowLight=${analysis.isLowLight}`);

  // 2. Select encoding profile
  let plan = selectProfile(analysis, effectiveTargetSizeMB, source.durationSec, destination, source.isHdr);
  console.log(`[Adaptive] Profile: ${plan.profileName} codec=${plan.codec} CRF=${plan.crf} isHdr=${plan.isHdr}`);

  const attempts: AdaptiveAttemptRecord[] = [];
  let outputPath = '';

  for (let attempt = 0; attempt <= 1; attempt++) {
    outputPath = join(outputDir, `output_adaptive_${attempt}.mp4`);

    // 3. Encode using buildFFmpegArgs
    const args = buildFFmpegArgs(inputPath, outputPath, plan);
    try {
      await runFfmpeg(args);
    } catch (err: any) {
      // If AV1 encode fails, fall back to H.264 with runPipeline
      if (plan.codec === 'libsvtav1') {
        console.warn(`[Adaptive] AV1 encode failed, falling back to H.264: ${err.message}`);
        const h264Result = await runPipeline({
          inputPath,
          outputDir,
          targetSizeMB: effectiveTargetSizeMB,
          presetMaxHeight: source.height,
          prioritizeDetail,
          cpuPreset: 'medium',
          passCount: 1,
        });
        return {
          source,
          attempts: [{
            attempt: 0,
            profileName: 'h264_fallback',
            codec: 'libx264',
            resolution: h264Result.attempts[0]?.resolution || `${source.width}x${source.height}`,
            crf: 23,
            actualSizeMB: h264Result.attempts[0]?.actualSizeMB || fileSizeMB(h264Result.finalOutputPath),
            targetSizeMB: effectiveTargetSizeMB,
            sizeWithinTolerance: h264Result.attempts[0]?.sizeWithinTolerance || false,
            vmaf: null,
            qualityOk: true,
            reason: 'AV1 encode failed, H.264 fallback',
          }],
          finalOutputPath: h264Result.finalOutputPath,
          plan,
        };
      }
      throw err;
    }

    const actualSizeMB = fileSizeMB(outputPath);
    const sizeWithinTolerance =
      Math.abs(actualSizeMB - effectiveTargetSizeMB) / effectiveTargetSizeMB <= 0.10;

    // 4. VMAF verification
    const vmafResult = await measureVmaf(inputPath, outputPath, source.durationSec);
    const gate = qualityGate(vmafResult, plan.crf);

    attempts.push({
      attempt,
      profileName: plan.profileName,
      codec: plan.codec,
      resolution: `${source.width}x${source.height}`,
      crf: plan.crf,
      actualSizeMB: round(actualSizeMB),
      targetSizeMB: effectiveTargetSizeMB,
      sizeWithinTolerance,
      vmaf: vmafResult,
      qualityOk: vmafResult.passed || prioritizeDetail,
      reason: gate.reason,
    });

    console.log(`[Adaptive] Attempt ${attempt}: ${actualSizeMB.toFixed(2)}MB VMAF=${vmafResult.avgVmaf} passed=${vmafResult.passed}`);

    if (vmafResult.passed || prioritizeDetail || attempt === 1) break;

    // 5. VMAF gate: re-encode with reduced CRF
    if (gate.shouldReencode && gate.newCrf !== undefined) {
      console.log(`[Adaptive] Re-encoding: CRF ${plan.crf} -> ${gate.newCrf}`);
      plan = { ...plan, crf: gate.newCrf };
    } else {
      break;
    }
  }

  return { source, attempts, finalOutputPath: outputPath, plan };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
