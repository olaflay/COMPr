#!/usr/bin/env node
/**
 * Production Client Bundle Decontamination Guard
 *
 * Verifies that production client bundles in apps/web/.next/static/chunks/
 * contain zero server tokens or leaked backend dependencies.
 *
 * Usage: node --experimental-strip-types scripts/verify-bundle-leakage.ts
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const CHUNKS_DIR = join(ROOT, 'apps', 'web', '.next', 'static', 'chunks');

const FORBIDDEN_SERVER_TOKENS = [
  '@prisma/client',
  'bullmq',
  'ioredis',
  'fastify',
  'child_process',
  'node:child_process',
  'ffmpeg',
  '@aws-sdk/client-s3',
];

function findJsChunks(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) {
    return files;
  }
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...findJsChunks(fullPath));
    } else if (entry.endsWith('.js') && !entry.endsWith('.js.map')) {
      files.push(fullPath);
    }
  }
  return files;
}

function verifyBundleLeakage(): void {
  console.log('[Bundle Analysis] Inspecting client chunks in:', CHUNKS_DIR);

  if (!existsSync(CHUNKS_DIR)) {
    console.error('[Bundle Error] Chunks directory not found. Please build apps/web first.');
    process.exit(1);
  }

  const chunks = findJsChunks(CHUNKS_DIR);
  if (chunks.length === 0) {
    console.error('[Bundle Error] No JS chunk files found in:', CHUNKS_DIR);
    process.exit(1);
  }

  console.log(`[Bundle Analysis] Found ${chunks.length} client chunks to evaluate.`);

  const violations: Array<{ chunk: string; token: string }> = [];

  for (const chunkPath of chunks) {
    const content = readFileSync(chunkPath, 'utf8');
    const relativeChunk = chunkPath.replace(ROOT + '\\', '').replace(ROOT + '/', '');

    for (const token of FORBIDDEN_SERVER_TOKENS) {
      if (content.includes(token)) {
        violations.push({ chunk: relativeChunk, token });
      }
    }
  }

  if (violations.length > 0) {
    console.error(`[Bundle Failure] Detected ${violations.length} server leakage violations:`);
    for (const v of violations) {
      console.error(`  - In chunk "${v.chunk}": forbidden server token "${v.token}"`);
    }
    process.exit(1);
  }

  console.log('[Bundle Success] Client bundle decontamination verified: 0 server tokens found across all chunks.');
}

verifyBundleLeakage();
