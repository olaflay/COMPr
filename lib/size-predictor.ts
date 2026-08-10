/**
 * Smart File Size Predictor - PRD FR-2.
 *
 * Estimates output file size and quality based on input file metadata
 * and the selected WhatsApp preset. Uses heuristics from the platform
 * limits and bitrate math without requiring server-side analysis.
 */

export interface SizePrediction {
  estimatedSizeBytes: number;
  estimatedSizeLabel: string;
  reductionPercent: number;
  qualityNote: string;
  fitsPlatform: boolean;
}

const STATUS_MAX_SIZE_BYTES = 16 * 1024 * 1024; // 16MB WhatsApp Status
const CHAT_MAX_SIZE_BYTES = 16 * 1024 * 1024; // 16MB WhatsApp Chat

/**
 * Predict output size based on input file properties and preset.
 * This is a client-side heuristic - the actual output may vary
 * based on content complexity, motion, and resolution.
 */
export function predictOutputSize(
  inputSizeBytes: number,
  _inputDurationSec: number | null,
  inputMimeType: string,
  preset: 'STATUS' | 'CHAT' | 'CUSTOM',
  customTargetMB?: number,
): SizePrediction {
  const isVideo = inputMimeType.startsWith('video/');
  const maxPlatformBytes = preset === 'STATUS' ? STATUS_MAX_SIZE_BYTES : CHAT_MAX_SIZE_BYTES;

  if (!isVideo) {
    // Images: conservative 60-70% reduction
    const estimatedBytes = Math.round(inputSizeBytes * 0.65);
    const fitsPlatform = estimatedBytes <= maxPlatformBytes;
    return {
      estimatedSizeBytes: estimatedBytes,
      estimatedSizeLabel: formatBytes(estimatedBytes),
      reductionPercent: 35,
      qualityNote: 'Image go dey sharp. COMPr go optimize quality for WhatsApp.',
      fitsPlatform,
    };
  }

  // Videos: bitrate-based estimation
  if (preset === 'CUSTOM' && customTargetMB) {
    const targetBytes = customTargetMB * 1024 * 1024;
    const reductionPercent = inputSizeBytes > 0
      ? Math.round(((inputSizeBytes - targetBytes) / inputSizeBytes) * 100)
      : 0;
    return {
      estimatedSizeBytes: targetBytes,
      estimatedSizeLabel: `${customTargetMB} MB`,
      reductionPercent: Math.max(0, reductionPercent),
      qualityNote: customTargetMB <= 4
        ? 'Small file size. Motion fit smooth, but fine detail go reduce small.'
        : customTargetMB <= 8
          ? 'Good balance of quality and file size.'
          : 'Large file. Quality go stay high, but WhatsApp go still compress am small.',
      fitsPlatform: true,
    };
  }

  // Status preset: target ~15MB or input, whichever is smaller
  if (preset === 'STATUS') {
    const targetBytes = Math.min(inputSizeBytes * 0.7, STATUS_MAX_SIZE_BYTES * 0.9);
    const reductionPercent = Math.round(((inputSizeBytes - targetBytes) / inputSizeBytes) * 100);
    const fitsPlatform = targetBytes <= STATUS_MAX_SIZE_BYTES;

    let qualityNote = '';
    if (reductionPercent > 80) {
      qualityNote = 'Heavy compression. Video go dey watchable, but some detail go reduce.';
    } else if (reductionPercent > 50) {
      qualityNote = 'Good quality for Status. Motion go stay smooth.';
    } else {
      qualityNote = 'Light optimization. Quality go dey very sharp.';
    }

    return {
      estimatedSizeBytes: Math.round(targetBytes),
      estimatedSizeLabel: formatBytes(targetBytes),
      reductionPercent,
      qualityNote,
      fitsPlatform,
    };
  }

  // Chat preset: target ~15MB or input, whichever is smaller
  const targetBytes = Math.min(inputSizeBytes * 0.75, CHAT_MAX_SIZE_BYTES * 0.9);
  const reductionPercent = Math.round(((inputSizeBytes - targetBytes) / inputSizeBytes) * 100);
  const fitsPlatform = targetBytes <= CHAT_MAX_SIZE_BYTES;

  let qualityNote = '';
  if (reductionPercent > 80) {
    qualityNote = 'Heavy compression for chat. Video go still dey clear enough.';
  } else if (reductionPercent > 50) {
    qualityNote = 'Good quality for chat sharing.';
  } else {
    qualityNote = 'Light optimization. E go dey very sharp for chat.';
  }

  return {
    estimatedSizeBytes: Math.round(targetBytes),
    estimatedSizeLabel: formatBytes(targetBytes),
    reductionPercent,
    qualityNote,
    fitsPlatform,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
