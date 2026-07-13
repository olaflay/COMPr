/**
 * Bitrate calculation engine — implements PRD Section 14.
 *
 * MUX_OVERHEAD_MARGIN is a starting value (8%), explicitly flagged in the
 * PRD as needing empirical tuning against real encodes (Milestone 3) before
 * being treated as a permanent constant. It lives here as one named export
 * so it's a single place to update once that validation happens.
 */
export const MUX_OVERHEAD_MARGIN = 0.08;

/** Minimum viable bitrate floor per resolution tier (kbps). */
export const BITRATE_FLOORS_KBPS: Record<number, number> = {
  240: 150,
  360: 300,
  480: 500,
  720: 800,
  1080: 1500,
};

export interface BitrateResult {
  bitrateTotalKbps: number;
  audioBitrateKbps: number;
  videoBitrateKbps: number;
  videoBitrateFinalKbps: number;
}

function clampAudioBitrateKbps(channels: number): number {
  if (channels >= 2) return 96; // stereo default within the 64-128 confirmed range
  return 64; // mono
}

/**
 * Compute total, audio, and final video bitrate for a target file size and duration.
 * PRD §14: BitrateTotal = (S_target_MB * 8 * 1024) / D_seconds
 */
export function calculateBitrate(
  targetSizeMB: number,
  durationSec: number,
  audioChannels: number = 2,
): BitrateResult {
  if (targetSizeMB <= 0) throw new Error('targetSizeMB must be > 0');
  if (durationSec <= 0) throw new Error('durationSec must be > 0');

  const bitrateTotalKbps = (targetSizeMB * 8 * 1024) / durationSec;
  const audioBitrateKbps = clampAudioBitrateKbps(audioChannels);
  const videoBitrateKbps = Math.max(0, bitrateTotalKbps - audioBitrateKbps);
  const videoBitrateFinalKbps = videoBitrateKbps * (1 - MUX_OVERHEAD_MARGIN);

  return {
    bitrateTotalKbps: round(bitrateTotalKbps),
    audioBitrateKbps,
    videoBitrateKbps: round(videoBitrateKbps),
    videoBitrateFinalKbps: round(videoBitrateFinalKbps),
  };
}

/**
 * FR-7 size-triggered retry: adjust bitrate by the measured delta between
 * actual output size and target size, distinct from the quality-triggered
 * retry path (which drops a resolution tier instead — see resolution.ts).
 */
export function adjustBitrateForSizeRetry(
  previousVideoBitrateKbps: number,
  actualSizeMB: number,
  targetSizeMB: number,
): number {
  const ratio = targetSizeMB / actualSizeMB;
  const adjusted = previousVideoBitrateKbps * ratio;
  return round(adjusted);
}

export function resolutionTierFloor(heightPx: number): number {
  const tiers = Object.keys(BITRATE_FLOORS_KBPS)
    .map(Number)
    .sort((a, b) => a - b);
  const tier = tiers.find((t) => heightPx <= t) ?? tiers[tiers.length - 1];
  return BITRATE_FLOORS_KBPS[tier];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
