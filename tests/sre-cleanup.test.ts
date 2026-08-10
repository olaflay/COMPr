import { test } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdirSync, existsSync, rmSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupStaleTempFiles } from '../lib/sre-cleanup.ts';

test('SRE Stale Temp Cleanup', () => {
  const mockTempDir = join(process.cwd(), 'temp', 'test-sre-cleanup');
  if (existsSync(mockTempDir)) {
    rmSync(mockTempDir, { recursive: true, force: true });
  }
  mkdirSync(mockTempDir, { recursive: true });

  // 1. Create a fresh file (should be preserved)
  const freshFilePath = join(mockTempDir, 'fresh_file.txt');
  writeFileSync(freshFilePath, 'I am fresh');

  // 2. Create a stale file (should be deleted)
  const staleFilePath = join(mockTempDir, 'stale_file.txt');
  writeFileSync(staleFilePath, 'I am stale');

  // 3. Create a stale folder (should be deleted)
  const staleFolderPath = join(mockTempDir, 'stale_folder');
  mkdirSync(staleFolderPath, { recursive: true });
  const subFilePath = join(staleFolderPath, 'subfile.txt');
  writeFileSync(subFilePath, 'inside stale folder');

  // Change modify times of stale resources to 2 hours ago
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  utimesSync(staleFilePath, twoHoursAgo, twoHoursAgo);
  utimesSync(staleFolderPath, twoHoursAgo, twoHoursAgo);

  // Run the cleanup utility
  cleanupStaleTempFiles(mockTempDir);

  // Assertions
  assert.strictEqual(existsSync(freshFilePath), true, 'Fresh files should be preserved');
  assert.strictEqual(existsSync(staleFilePath), false, 'Stale files should be deleted');
  assert.strictEqual(existsSync(staleFolderPath), false, 'Stale folders should be deleted recursively');

  // Clean up
  rmSync(mockTempDir, { recursive: true, force: true });
});
