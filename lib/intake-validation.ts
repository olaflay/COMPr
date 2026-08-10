/**
 * Intake validation — pure rules for job intake. No side effects (no prisma,
 * no queues, no redis), so it is unit-testable without infra.
 */

import platformLimits from '../config/platform-limits.json' with { type: 'json' };

export type PresetValue = 'STATUS' | 'CHAT' | 'CUSTOM';
export type DestinationValue = 'WHATSAPP_NORMAL' | 'WHATSAPP_HD' | 'WHATSAPP_DOCUMENT' | 'PREVIEW_WEB';

export class IntakeValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'IntakeValidationError';
    this.code = code;
  }
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

/**
 * Routing hint only — the authoritative media-kind check is the magic-byte
 * sniff in the analysis worker (AGENTS.md Q3 Rule 15). A lying extension
 * fails that sniff and the job ends FAILED at analysis, never mis-encoded.
 */
export function inferMediaKindFromFileKey(fileKey: string): 'IMAGE' | 'VIDEO' {
  const ext = fileKey.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext || '') ? 'IMAGE' : 'VIDEO';
}

/** PRD §18: CUSTOM sizes are 1-16MB; other presets reject targetSizeMB. */
export function assertTargetSizeRules(
  preset: PresetValue,
  targetSizeMB: number | undefined,
): void {
  if (preset === 'CUSTOM') {
    const { minSizeMB, maxSizeMB } = platformLimits.CUSTOM;
    if (typeof targetSizeMB !== 'number' || targetSizeMB < minSizeMB || targetSizeMB > maxSizeMB) {
      throw new IntakeValidationError(
        'INVALID_TARGET_SIZE',
        `targetSizeMB is required for CUSTOM preset and must be between ${minSizeMB} and ${maxSizeMB}`,
      );
    }
  } else if (targetSizeMB !== undefined) {
    throw new IntakeValidationError(
      'UNEXPECTED_TARGET_SIZE',
      `targetSizeMB is only valid for preset=CUSTOM, not ${preset}`,
    );
  }
}
