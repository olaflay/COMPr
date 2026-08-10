import { readdirSync, statSync, unlinkSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Sweeps the local temp directory for stale processing files.
 * Items older than the threshold (default: 1 hour) are removed to prevent disk exhaustion,
 * while active files from concurrent worker replicas are preserved.
 */
export function cleanupStaleTempFiles(tempDir: string = join(process.cwd(), 'temp'), maxAgeMs: number = 60 * 60 * 1000): void {
  if (!existsSync(tempDir)) {
    return;
  }

  const now = Date.now();

  try {
    const files = readdirSync(tempDir);
    for (const file of files) {
      const fullPath = join(tempDir, file);
      const stats = statSync(fullPath);

      // Verify if the modified time exceeds the age threshold
      if (now - stats.mtime.getTime() > maxAgeMs) {
        if (stats.isDirectory()) {
          rmSync(fullPath, { recursive: true, force: true });
        } else {
          unlinkSync(fullPath);
        }
        console.log(`[SRE Cleanup] Removed stale temp item: ${file}`);
      }
    }
  } catch (err) {
    console.error('[SRE Cleanup] Stale temp sweep encountered an error:', err);
  }
}
