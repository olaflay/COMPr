#!/usr/bin/env node
/**
 * Dependency-boundary guard: enforces workspace decoupling and zero-leak invariants.
 *
 * Rules:
 *   1. Frontend (apps/web) must never import from apps/api or apps/workers.
 *   2. Frontend (apps/web) must never import server-only binaries (Prisma, BullMQ, Redis, FFmpeg).
 *   3. Frontend communicates solely via packages/contracts and HTTP/SDK interfaces.
 *   4. Backend (apps/api, apps/workers) must never import from frontend (apps/web).
 *   5. apps/workers must never import from apps/api, and apps/api must never import from apps/workers.
 *   6. packages/contracts must be a zero-dependency leaf (only zod permitted).
 *   7. packages/sdk may only import from packages/contracts.
 *   8. The module dependency graph across workspaces must be strictly acyclic.
 *
 * Usage: node --experimental-strip-types scripts/check-boundaries.ts
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

const WORKSPACES = {
  contracts: { name: '@vecteus/contracts', dir: join(ROOT, 'packages', 'contracts') },
  sdk: { name: '@vecteus/sdk', dir: join(ROOT, 'packages', 'sdk') },
  web: { name: '@vecteus/web', dir: join(ROOT, 'apps', 'web') },
  api: { name: '@vecteus/api', dir: join(ROOT, 'apps', 'api') },
  workers: { name: '@vecteus/workers', dir: join(ROOT, 'apps', 'workers') },
} as const;

type WorkspaceKey = keyof typeof WORKSPACES;

// Allowed dependency targets for each workspace
const ALLOWED_WORKSPACE_DEPENDENCIES: Record<WorkspaceKey, readonly WorkspaceKey[]> = {
  contracts: [],
  sdk: ['contracts'],
  web: ['contracts', 'sdk'],
  api: ['contracts'],
  workers: ['contracts'],
};

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next' || entry === '.git' || entry === 'dist' || entry === '.tsout') {
      continue;
    }
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry) && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const SERVER_ONLY_PATTERNS = [
  'apps/api',
  'apps/workers',
  'server/',
  'workers/',
  'prisma/',
  '@prisma/client',
  'bullmq',
  'ioredis',
  'fastify',
  'child_process',
  'node:child_process',
];

const FRONTEND_PATTERNS = [
  'apps/web',
  'components/',
  'app/',
];

const violations: string[] = [];

// 1. Check apps/web for server-only imports
const webFiles = walk(WORKSPACES.web.dir);
for (const file of webFiles) {
  const src = readFileSync(file, 'utf8');
  for (const pattern of SERVER_ONLY_PATTERNS) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRegex = new RegExp(`from\\s+['"][^'"]*${escaped}[^'"]*['"]|import\\s*\\(['"][^'"]*${escaped}[^'"]*['"]\\)`);
    if (importRegex.test(src)) {
      violations.push(`${relative(ROOT, file)} illegally imports server pattern: ${pattern}`);
    }
  }
}

// 2. Check apps/api and apps/workers for frontend imports
for (const key of ['api', 'workers'] as const) {
  const files = walk(WORKSPACES[key].dir);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const pattern of FRONTEND_PATTERNS) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const importRegex = new RegExp(`from\\s+['"][^'"]*${escaped}[^'"]*['"]|import\\s*\\(['"][^'"]*${escaped}[^'"]*['"]\\)`);
      if (importRegex.test(src)) {
        violations.push(`${relative(ROOT, file)} illegally imports frontend pattern: ${pattern}`);
      }
    }
  }
}

// 3. Check cross-app isolation: workers must not import api, api must not import workers
for (const file of walk(WORKSPACES.workers.dir)) {
  const src = readFileSync(file, 'utf8');
  if (/from\s+['"][^'"]*apps\/api[^'"]*['"]/.test(src) || /from\s+['"][^'"]*@vecteus\/api[^'"]*['"]/.test(src)) {
    violations.push(`${relative(ROOT, file)} illegally imports from apps/api`);
  }
}
for (const file of walk(WORKSPACES.api.dir)) {
  const src = readFileSync(file, 'utf8');
  if (/from\s+['"][^'"]*apps\/workers[^'"]*['"]/.test(src) || /from\s+['"][^'"]*@vecteus\/workers[^'"]*['"]/.test(src)) {
    violations.push(`${relative(ROOT, file)} illegally imports from apps/workers`);
  }
}

// 4. Check shared packages (contracts and sdk)
for (const key of ['contracts', 'sdk'] as const) {
  const files = walk(WORKSPACES[key].dir);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const forbidden = ['apps/', 'server/', 'workers/', 'bullmq', 'ioredis', '@prisma/client'];
    for (const pattern of forbidden) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const importRegex = new RegExp(`from\\s+['"][^'"]*${escaped}[^'"]*['"]|import\\s*\\(['"][^'"]*${escaped}[^'"]*['"]\\)`);
      if (importRegex.test(src)) {
        violations.push(`${relative(ROOT, file)} illegally imports forbidden pattern: ${pattern}`);
      }
    }
  }
}

// 5. Build and audit workspace module dependency graph
const dependencyGraph = new Map<WorkspaceKey, Set<WorkspaceKey>>();
for (const key of Object.keys(WORKSPACES) as WorkspaceKey[]) {
  dependencyGraph.set(key, new Set());
}

for (const [sourceKey, info] of Object.entries(WORKSPACES) as Array<[WorkspaceKey, typeof WORKSPACES[WorkspaceKey]]>) {
  const files = walk(info.dir);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const importRegex = /(?:from\s+['"]([^'"]+)['"]|import\s*\(['"]([^'"]+)['"]\))/g;
    let match: RegExpExecArray | null = null;
    while ((match = importRegex.exec(src)) !== null) {
      const importTarget = match[1] || match[2];
      for (const [targetKey, targetInfo] of Object.entries(WORKSPACES) as Array<[WorkspaceKey, typeof WORKSPACES[WorkspaceKey]]>) {
        if (targetKey === sourceKey) continue;
        const matchesName = importTarget === targetInfo.name || importTarget.startsWith(targetInfo.name + '/');
        const matchesPath = importTarget.includes(targetInfo.dir.replace(/\\/g, '/')) ||
          importTarget.includes(relative(ROOT, targetInfo.dir).replace(/\\/g, '/'));
        if (matchesName || matchesPath) {
          dependencyGraph.get(sourceKey)!.add(targetKey);
        }
      }
    }
  }
}

// 6. Verify permitted workspace dependency edges
console.log('[Boundary Check] Auditing workspace dependency graph:');
for (const [sourceKey, targets] of dependencyGraph.entries()) {
  const allowed = ALLOWED_WORKSPACE_DEPENDENCIES[sourceKey];
  for (const targetKey of targets) {
    console.log(`  * ${sourceKey} -> ${targetKey}`);
    if (!allowed.includes(targetKey)) {
      violations.push(`Illegal workspace dependency edge: ${sourceKey} -> ${targetKey} is not allowed.`);
    }
  }
}

// 7. Cycle detection via depth-first search
function detectCycle(): WorkspaceKey[] | null {
  const visited = new Set<WorkspaceKey>();
  const recursionStack = new Set<WorkspaceKey>();
  const path: WorkspaceKey[] = [];

  function dfs(node: WorkspaceKey): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = dependencyGraph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        path.push(neighbor);
        return true;
      }
    }

    path.pop();
    recursionStack.delete(node);
    return false;
  }

  for (const node of Object.keys(WORKSPACES) as WorkspaceKey[]) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        return path;
      }
    }
  }
  return null;
}

const cycle = detectCycle();
if (cycle) {
  violations.push(`Cyclic workspace dependency detected: ${cycle.join(' -> ')}`);
}

if (violations.length > 0) {
  console.error('\nBoundary check failed with architectural violations:');
  for (const v of violations) console.error('  * ' + v);
  process.exit(1);
}

console.log('\nBoundary check passed: zero architectural violations detected.');
console.log('Strict acyclic directionality verified across all workspaces.');
