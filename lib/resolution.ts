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
  sourceWidthOrHeight: number,
  sourceHeightOrMaxHeight?: number,
  presetMaxHeight?: number,
): ResolutionTier {
  let sourceWidth: number;
  let sourceHeight: number;
  let capMaxHeight: number;

  if (presetMaxHeight !== undefined && sourceHeightOrMaxHeight !== undefined) {
    sourceWidth = sourceWidthOrHeight;
    sourceHeight = sourceHeightOrMaxHeight;
    capMaxHeight = presetMaxHeight;
  } else {
    // Backward compatibility signature: chooseInitialResolution(sourceHeight, presetMaxHeight)
    // Assume landscape width.
    sourceHeight = sourceWidthOrHeight;
    sourceWidth = Math.round(sourceHeight * 16 / 9);
    capMaxHeight = sourceHeightOrMaxHeight ?? 720;
  }

  const isPortrait = sourceHeight > sourceWidth;
  // Cap height using a scaled ceiling for portrait
  const maxAllowedHeight = isPortrait ? Math.round(capMaxHeight * 1280 / 720) : capMaxHeight;
  const capHeight = Math.min(sourceHeight, maxAllowedHeight);

  // Match the orientation in the resolution ladder
  const ladder = RESOLUTION_LADDER.map((t) => {
    if (isPortrait) {
      return { height: t.width, width: t.height };
    }
    return t;
  });

  const tier = ladder.find((t) => t.height <= capHeight) ?? ladder[ladder.length - 1];

  // Prevent upscaling width or height beyond source dimensions
  let finalHeight = Math.min(tier.height, sourceHeight);
  let finalWidth = Math.min(tier.width, sourceWidth);

  // Enforce 16px boundaries for macroblocks
  finalHeight = Math.max(16, Math.floor(finalHeight / 16) * 16);
  finalWidth = Math.max(16, Math.floor(finalWidth / 16) * 16);

  return { width: finalWidth, height: finalHeight };
}

/**
 * FR-7 quality-triggered retry: drop one resolution tier rather than
 * re-encoding at the same bitrate, which would reproduce the same artifacts.
 */
export function dropOneResolutionTier(currentHeight: number, isPortrait: boolean = false): ResolutionTier {
  const idx = RESOLUTION_LADDER.findIndex((t) => {
    const height = isPortrait ? t.width : t.height;
    // Account for 16px alignment delta on lookup
    return Math.abs(height - currentHeight) <= 16;
  });
  let nextTier: ResolutionTier;
  if (idx === -1 || idx === RESOLUTION_LADDER.length - 1) {
    const finalTier = RESOLUTION_LADDER[RESOLUTION_LADDER.length - 1];
    nextTier = isPortrait ? { height: finalTier.width, width: finalTier.height } : finalTier;
  } else {
    const t = RESOLUTION_LADDER[idx + 1];
    nextTier = isPortrait ? { height: t.width, width: t.height } : t;
  }

  return {
    width: Math.max(16, Math.floor(nextTier.width / 16) * 16),
    height: Math.max(16, Math.floor(nextTier.height / 16) * 16),
  };
}
