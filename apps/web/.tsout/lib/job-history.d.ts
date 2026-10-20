/**
 * Processing History - localStorage-based recent jobs tracker.
 *
 * Stores the last N processed jobs with thumbnails, sizes, and
 * re-download links. No account required. Uses localStorage
 * with a 7-day TTL per entry.
 */
export interface HistoryEntry {
    jobId: string;
    fileName: string;
    fileType: string;
    preset: string;
    inputSizeBytes: number;
    outputSizeBytes: number;
    downloadPath: string;
    thumbnailUrl?: string;
    createdAt: number;
    status: 'DONE' | 'FAILED';
}
/**
 * Add a completed job to history.
 * Deduplicates by jobId, trims to MAX_ENTRIES, and prunes expired.
 */
export declare function addToHistory(entry: HistoryEntry): void;
/**
 * Get all valid (non-expired) history entries, newest first.
 */
export declare function getHistory(): HistoryEntry[];
/**
 * Remove a specific entry by jobId.
 */
export declare function removeFromHistory(jobId: string): void;
/**
 * Clear all history.
 */
export declare function clearHistory(): void;
/**
 * Format bytes to a human-readable string.
 */
export declare function formatBytes(bytes: number): string;
/**
 * Calculate the reduction percentage.
 */
export declare function reductionPercent(input: number, output: number): number;
/**
 * Get a relative time label (e.g., "2 hours ago").
 */
export declare function timeAgo(timestamp: number): string;
//# sourceMappingURL=job-history.d.ts.map