export interface ResolutionTier {
  height: number;
  width: number;
}

export const RESOLUTION_LADDER: ResolutionTier[] = [
  { height: 1080, width: 1920 },
  { height: 720, width: 1280 },
  { height: 480, width: 854 },
  { height: 360, width: 640 },
  { height: 240, width: 426 },
];

/**
 * Never upscale beyond source resolution; cap at the preset's config-table ceiling.
 * PRD §16, §33: chooseInitialResolution ensures Math.min(source, cap).
 */
export function chooseInitialResolution(
  sourceHeight: number,
  presetMaxHeight: number,
): ResolutionTier {
  const cap = Math.min(sourceHeight, presetMaxHeight);
  const tier =
    RESOLUTION_LADDER.find((t) => t.height <= cap) ??
    RESOLUTION_LADDER[RESOLUTION_LADDER.length - 1];
  return tier;
}

/**
 * FR-7 quality-triggered retry: drop one resolution tier rather than
 * re-encoding at the same bitrate, which would reproduce the same artifacts.
 */
export function dropOneResolutionTier(currentHeight: number): ResolutionTier {
  const idx = RESOLUTION_LADDER.findIndex((t) => t.height === currentHeight);
  if (idx === -1 || idx === RESOLUTION_LADDER.length - 1) {
    return RESOLUTION_LADDER[RESOLUTION_LADDER.length - 1]; // already at floor
  }
  return RESOLUTION_LADDER[idx + 1];
}
