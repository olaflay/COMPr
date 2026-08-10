/**
 * Processing History - localStorage-based recent jobs tracker.
 *
 * Stores the last N processed jobs with thumbnails, sizes, and
 * re-download links. No account required. Uses localStorage
 * with a 7-day TTL per entry.
 */

const HISTORY_KEY = 'compr_job_history';
const MAX_ENTRIES = 10;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface HistoryEntry {
  jobId: string;
  fileName: string;
  fileType: string;
  preset: string;
  inputSizeBytes: number;
  outputSizeBytes: number;
  downloadUrl: string;
  thumbnailUrl?: string;
  createdAt: number; // timestamp
  status: 'DONE' | 'FAILED';
}

/**
 * Add a completed job to history.
 * Deduplicates by jobId, trims to MAX_ENTRIES, and prunes expired.
 */
export function addToHistory(entry: HistoryEntry): void {
  try {
    const existing = getHistory();
    const filtered = existing.filter(
      (e) => e.jobId !== entry.jobId && Date.now() - e.createdAt < TTL_MS,
    );
    filtered.unshift(entry);
    if (filtered.length > MAX_ENTRIES) filtered.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch {
    // localStorage may be full or disabled; silently ignore
  }
}

/**
 * Get all valid (non-expired) history entries, newest first.
 */
export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const entries: HistoryEntry[] = JSON.parse(raw);
    return entries.filter((e) => Date.now() - e.createdAt < TTL_MS);
  } catch {
    return [];
  }
}

/**
 * Remove a specific entry by jobId.
 */
export function removeFromHistory(jobId: string): void {
  try {
    const existing = getHistory();
    const filtered = existing.filter((e) => e.jobId !== jobId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch {
    // silently ignore
  }
}

/**
 * Clear all history.
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // silently ignore
  }
}

/**
 * Format bytes to a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Calculate the reduction percentage.
 */
export function reductionPercent(input: number, output: number): number {
  if (input === 0) return 0;
  return Math.round(((input - output) / input) * 100);
}

/**
 * Get a relative time label (e.g., "2 hours ago").
 */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
