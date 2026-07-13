/**
 * Smart Defaults — PRD FR-2, §12.
 *
 * Pre-selects the most likely-correct preset based on the media's own
 * characteristics, showing it as an already-selected chip the user can
 * override in one tap.
 *
 * Heuristic (PRD FR-2):
 *  - Portrait video under Status duration ceiling → STATUS
 *  - Landscape or over-ceiling video → CHAT
 *  - Small portrait image (< 2MB) → STATUS
 *  - Other images → CHAT
 */

import platformLimits from '../config/platform-limits.json' with { type: 'json' };

export interface SuggestPresetInput {
  mediaKind: 'VIDEO' | 'IMAGE';
  width: number;
  height: number;
  durationSec?: number;
  sizeMB?: number;
}

export interface SuggestPresetResult {
  preset: 'STATUS' | 'CHAT' | 'CUSTOM';
  reason: string;
}

export function suggestPreset(input: SuggestPresetInput): SuggestPresetResult {
  const { mediaKind, width, height, durationSec, sizeMB } = input;
  const isPortrait = height > width;

  if (mediaKind === 'VIDEO') {
    const statusCeilingSec = platformLimits.STATUS.maxDurationSec;
    if (isPortrait && (durationSec ?? 0) <= statusCeilingSec) {
      return { preset: 'STATUS', reason: 'portrait, within current Status duration ceiling' };
    }
    return {
      preset: 'CHAT',
      reason:
        (durationSec ?? 0) > statusCeilingSec
          ? 'exceeds current Status duration ceiling'
          : 'landscape orientation, more common for chat sharing',
    };
  }

  if (mediaKind === 'IMAGE') {
    if (isPortrait && (sizeMB ?? 0) < 2) {
      return { preset: 'STATUS', reason: 'small portrait image, likely a status-style share' };
    }
    return { preset: 'CHAT', reason: 'default image sharing context' };
  }

  throw new Error(`Unknown mediaKind: ${mediaKind}`);
}
