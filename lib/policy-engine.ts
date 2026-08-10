/**
 * Policy engine — maps scene analysis scores to SVT-AV1 encoding parameters.
 *
 * Reads encoding profiles from config/encoding-profiles.json and selects the
 * best profile based on face, text, and motion scores from the analysis stage.
 * Falls back to H.264 when the computed CRF exceeds AV1's useful range.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SceneAnalysis } from './analysis.ts';

// --- Types ---

export interface EncodingProfile {
  name: string;
  codec: string;
  container: string;
  crf: number;
  videoBitrateMax: number | null;
  speedPreset: string;
  pixelFormat: string;
  audioCodec: string;
  audioBitrate: number;
  minFaceScore: number | null;
  minTextScore: number | null;
  minMotionScore: number | null;
  maxMotionScore: number | null;
  extraFlags: string | null;
  notes?: string;
}

export interface EncodingPlan {
  profileName: string;
  codec: string;
  crf: number;
  speedPreset: string;
  videoBitrateMax: number | null;
  audioCodec: string;
  audioBitrate: number;
  pixelFormat: string;
  extraFlags: string[];
  reason: string;
  isHdr?: boolean;
}

// --- CRF-to-Bitrate lookup (720p baseline, kbps) ---
// Empirical starting points — tuned per Milestone validation
const CRF_BITRATE_MAP: Record<number, number> = {
  20: 5000,
  22: 3800,
  24: 2500,
  26: 1900,
  28: 1300,
  30: 950,
  32: 700,
  34: 520,
  36: 380,
  38: 270,
  40: 180,
};

const CRF_KEYS = Object.keys(CRF_BITRATE_MAP).map(Number).sort((a, b) => a - b);

// --- Profile loading ---

let cachedProfiles: EncodingProfile[] | null = null;

function loadProfiles(): EncodingProfile[] {
  if (cachedProfiles) return cachedProfiles;

  const configPath = join(process.cwd(), 'config', 'encoding-profiles.json');
  const raw = readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  cachedProfiles = config.profiles as EncodingProfile[];
  return cachedProfiles;
}

// --- Core policy logic ---

/**
 * Convert a target bitrate (kbps) to an approximate CRF value.
 * Uses the CRF_BITRATE_MAP lookup table with linear interpolation.
 */
export function bitrateToCRF(bitrateKbps: number): number {
  // Find the two closest CRF entries and interpolate
  for (let i = 0; i < CRF_KEYS.length - 1; i++) {
    const lowCRF = CRF_KEYS[i];
    const highCRF = CRF_KEYS[i + 1];
    const lowBitrate = CRF_BITRATE_MAP[lowCRF];
    const highBitrate = CRF_BITRATE_MAP[highCRF];

    if (bitrateKbps >= highBitrate && bitrateKbps <= lowBitrate) {
      const t = (lowBitrate - bitrateKbps) / (lowBitrate - highBitrate);
      return Math.round(lowCRF + t * (highCRF - lowCRF));
    }
  }

  // Outside range: clamp to min/max CRF
  if (bitrateKbps >= CRF_BITRATE_MAP[CRF_KEYS[0]]) return CRF_KEYS[0];
  return CRF_KEYS[CRF_KEYS.length - 1];
}

/**
 * Score a profile against the scene analysis. Higher score = better fit.
 * Returns -1 if the profile's constraints are violated.
 */
function scoreProfile(profile: EncodingProfile, analysis: SceneAnalysis, destination: string): number {
  let score = 0;

  // Destination-specific profile routing constraints (PRD §16, §25)
  if (destination === 'WHATSAPP_NORMAL') {
    if (!profile.name.startsWith('whatsapp_normal_')) return -1;
  } else if (destination === 'WHATSAPP_HD') {
    if (!profile.name.startsWith('whatsapp_hd_')) return -1;
  } else {
    // WHATSAPP_DOCUMENT or PREVIEW_WEB prioritizes AV1
    if (!profile.name.startsWith('av1_document_')) return 0;
  }

  // Check hard constraints (return -1 if violated)
  if (profile.minFaceScore !== null && analysis.avgFaceScore < profile.minFaceScore) {
    return -1;
  }
  if (profile.minTextScore !== null && analysis.avgTextEdgeScore < profile.minTextScore) {
    return -1;
  }
  if (profile.minMotionScore !== null && analysis.avgMotionScore < profile.minMotionScore) {
    return -1;
  }
  if (profile.maxMotionScore !== null && analysis.avgMotionScore > profile.maxMotionScore) {
    return -1;
  }

  // Soft scoring: prefer profiles that match content characteristics
  if (analysis.hasFaces && profile.minFaceScore !== null) {
    score += 3;
  }
  if (analysis.hasText && profile.minTextScore !== null) {
    score += 3;
  }
  if (analysis.isHighMotion && profile.minMotionScore !== null) {
    score += 2;
  }

  // Prefer AV1 when destination supports it
  if (profile.codec === 'libsvtav1') {
    score += 1;
  }

  return score;
}

/**
 * Select the best encoding profile for a given scene analysis.
 * Falls back to H.264 if no AV1 profile fits well.
 */
export function selectProfile(
  analysis: SceneAnalysis,
  targetSizeMB: number,
  durationSec: number,
  destination: string = 'WHATSAPP_NORMAL',
  isHdr: boolean = false,
): EncodingPlan {
  const profiles = loadProfiles();

  // Compute base CRF from target size
  const targetBitrateKbps = (targetSizeMB * 8 * 1024) / durationSec;
  const baseCRF = bitrateToCRF(targetBitrateKbps);

  // Score all profiles
  let bestProfile: EncodingProfile | null = null;
  let bestScore = -1;

  for (const profile of profiles) {
    const score = scoreProfile(profile, analysis, destination);
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }

  // Fallback to H.264 if no profile matched
  if (!bestProfile || bestScore === -1) {
    bestProfile = profiles.find((p) => p.codec === 'libx264') || profiles[profiles.length - 1];
  }

  // Adjust CRF based on scene composition
  let adjustedCRF = baseCRF;

  if (analysis.hasFaces) {
    const faceBoost = Math.min(4, Math.round(analysis.avgFaceScore * 6));
    adjustedCRF -= faceBoost;
  }

  if (analysis.hasText) {
    adjustedCRF -= 2;
  }

  if (analysis.isHighMotion) {
    adjustedCRF += 2;
  }

  // Clamp to valid range
  adjustedCRF = clamp(adjustedCRF, 20, 40);

  // Parse extra flags
  const extraFlags = bestProfile.extraFlags
    ? bestProfile.extraFlags.split(' ').filter(Boolean)
    : [];

  // Build reason string
  const reasons: string[] = [];
  reasons.push(`CRF ${adjustedCRF} from ${targetSizeMB}MB/${durationSec}s`);
  if (analysis.hasFaces) reasons.push('face boost');
  if (analysis.hasText) reasons.push('text sharpness');
  if (analysis.isHighMotion) reasons.push('high motion');
  reasons.push(`profile: ${bestProfile.name}`);

  return {
    profileName: bestProfile.name,
    codec: bestProfile.codec,
    crf: adjustedCRF,
    speedPreset: bestProfile.speedPreset,
    videoBitrateMax: bestProfile.videoBitrateMax,
    audioCodec: bestProfile.audioCodec,
    audioBitrate: bestProfile.audioBitrate,
    pixelFormat: bestProfile.pixelFormat,
    extraFlags,
    reason: reasons.join('; '),
    isHdr,
  };
}

/**
 * Build the complete FFmpeg argument array for an encoding plan.
 * All args are arrays — never shell-interpolated (AGENTS.md Q3 Rule 20).
 */
export function buildFFmpegArgs(inputPath: string, outputPath: string, plan: EncodingPlan): string[] {
  const args: string[] = [
    '-y',
    '-threads', '0',
    '-i', inputPath,
  ];

  // Apply HDR to SDR tone mapping if needed
  if (plan.isHdr) {
    args.push('-vf', 'tonemap=tonemap=hable,format=yuv420p');
  }

  args.push(
    '-c:v', plan.codec,
    '-preset', plan.speedPreset,
    '-crf', String(plan.crf),
  );

  // Add codec-specific flags
  if (plan.codec === 'libsvtav1' && plan.extraFlags.length > 0) {
    const svtParams = plan.extraFlags
      .filter((f) => !f.startsWith('-'))
      .join(':');
    if (svtParams) {
      args.push('-svtav1-params', svtParams);
    }
  }

  if (plan.codec === 'libx264') {
    args.push(...plan.extraFlags);
  }

  // Bitrate cap if specified
  if (plan.videoBitrateMax) {
    args.push(
      '-maxrate', `${plan.videoBitrateMax}k`,
      '-bufsize', `${plan.videoBitrateMax * 2}k`,
    );
  }

  // Audio stream sanitization: downmix to stereo & standard rate
  args.push(
    '-c:a', plan.audioCodec,
    '-ac', '2',
    '-ar', '44100',
    '-b:a', `${plan.audioBitrate}k`,
  );

  // Pixel format, color tags and container flags
  args.push(
    '-pix_fmt', plan.pixelFormat,
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
    '-movflags', '+faststart',
    '-loglevel', 'error',
    outputPath,
  );

  return args;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
