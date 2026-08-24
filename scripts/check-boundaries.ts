#!/usr/bin/env node
/**
 * Dependency-boundary guard — enforces the frontend/backend separation.
 *
 * Rules (per docs/AGENTS.md "Rules for this layout" and PRD §17):
 *   1. Frontend (app/, components/, styles/, public/) must NEVER import from
 *      backend (server/, workers/, prisma/). The browser bundle would pull in
 *      Node-only code (Prisma, FFmpeg, Redis) and break.
 *   2. Backend (server/, workers/) must NEVER import from frontend (app/,
 *      components/). API code must not depend on React components.
 *   3. The shared seam is lib/ and config/ — both sides may import those.
 *
 * Usage: node scripts/check-boundaries.ts   (exit 0 = clean, 1 = violations)
 * Wired into CI so the separation practice is enforced, not aspirational.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

const FRONTEND_DIRS = ['app', 'components', 'styles', 'public'];
const BACKEND_DIRS = ['server', 'workers', 'prisma'];

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

function importsFrom(file: string, targets: string[]): string[] {
  const src = readFileSync(file, 'utf8');
  return targets.filter((t) => {
    const re = new RegExp(`from\\s+['"][^'"]*${t.replace('/', '\\/')}[^'"]*['"]|import\\s+['"][^'"]*${t.replace('/', '\\/')}[^'"]*['"]`);
    return re.test(src);
  });
}

const violations: string[] = [];

// Rule 1: frontend must not import backend
for (const dir of FRONTEND_DIRS) {
  const abs = join(ROOT, dir);
  if (!statSync(abs, { throwIfNoEntry: false })) continue;
  for (const file of walk(abs)) {
    for (const target of BACKEND_DIRS) {
      if (importsFrom(file, [target]).length > 0) {
        violations.push(`${file.replace(ROOT + '\\', '').replace(ROOT + '/', '')} imports from backend (${target}/)`);
      }
    }
  }
}

// Rule 2: backend must not import frontend
for (const dir of BACKEND_DIRS) {
  const abs = join(ROOT, dir);
  if (!statSync(abs, { throwIfNoEntry: false })) continue;
  for (const file of walk(abs)) {
    for (const target of FRONTEND_DIRS) {
      if (importsFrom(file, [target]).length > 0) {
        violations.push(`${file.replace(ROOT + '\\', '').replace(ROOT + '/', '')} imports from frontend (${target}/)`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Dependency boundary violations (frontend <-> backend separation):');
  for (const v of violations) console.error('  - ' + v);
  console.error('\nFix: move shared code to lib/ (the allowed seam), never cross the boundary.');
  process.exit(1);
}

console.log('Boundary check passed: frontend and backend are cleanly separated.');
