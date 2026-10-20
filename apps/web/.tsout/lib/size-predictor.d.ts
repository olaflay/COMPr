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
/**
 * Predict output size based on input file properties and preset.
 * This is a client-side heuristic - the actual output may vary
 * based on content complexity, motion, and resolution.
 */
export declare function predictOutputSize(inputSizeBytes: number, _inputDurationSec: number | null, inputMimeType: string, preset: 'STATUS' | 'CHAT' | 'CUSTOM', customTargetMB?: number): SizePrediction;
//# sourceMappingURL=size-predictor.d.ts.map