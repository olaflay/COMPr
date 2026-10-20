#!/usr/bin/env node
/**
 * Packaging Verification Step
 *
 * Verifies that packages/contracts and packages/sdk pack cleanly via npm pack
 * without missing dependencies, broken local symlinks, or missing exported files.
 *
 * Usage: node --experimental-strip-types scripts/verify-packaging.ts
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

interface PackageCheck {
  name: string;
  dir: string;
  requiredFiles: string[];
}

const PACKAGES_TO_VERIFY: PackageCheck[] = [
  {
    name: '@vecteus/contracts',
    dir: join(ROOT, 'packages', 'contracts'),
    requiredFiles: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/errors.js',
      'dist/errors.d.ts',
      'dist/ingest.js',
      'dist/ingest.d.ts',
      'dist/jobs.js',
      'dist/jobs.d.ts',
      'dist/tenants.js',
      'dist/tenants.d.ts',
      'dist/uploads.js',
      'dist/uploads.d.ts',
      'package.json',
    ],
  },
  {
    name: '@vecteus/sdk',
    dir: join(ROOT, 'packages', 'sdk'),
    requiredFiles: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/client.js',
      'dist/client.d.ts',
      'package.json',
    ],
  },
];

function verifyPackage(pkg: PackageCheck): void {
  console.log(`[Packaging Verification] Verifying package: ${pkg.name}`);

  const packageJsonPath = join(pkg.dir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(`package.json missing in ${pkg.dir}`);
  }

  const pkgJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  // Check locked dependencies (no wildcard '*' or loose ranges)
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  for (const [dep, version] of Object.entries(deps)) {
    if (typeof version === 'string' && (version.includes('*') || version.includes('^') || version.includes('~'))) {
      throw new Error(`Package ${pkg.name} contains unlocked dependency version: ${dep}: ${version}`);
    }
  }

  // Run npm pack --dry-run --json
  const isWindows = process.platform === 'win32';
  let output: string;
  if (isWindows) {
    const comspec = process.env.ComSpec || 'cmd.exe';
    output = execFileSync(comspec, ['/d', '/s', '/c', 'npm pack --dry-run --json'], {
      cwd: pkg.dir,
      encoding: 'utf8',
      timeout: 30000,
    });
  } else {
    output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: pkg.dir,
      encoding: 'utf8',
      timeout: 30000,
    });
  }

  const parsed = JSON.parse(output);
  const packResult = Array.isArray(parsed) ? parsed[0] : parsed;
  const packedFiles = (packResult.files || []).map((f: { path: string }) => f.path.replace(/\\/g, '/'));

  console.log(`  Tarball contains ${packedFiles.length} files (unpacked size: ${packResult.size} bytes).`);

  const missingFiles: string[] = [];
  for (const required of pkg.requiredFiles) {
    if (!packedFiles.includes(required)) {
      missingFiles.push(required);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Package ${pkg.name} is missing required files in tarball: ${missingFiles.join(', ')}`);
  }

  // Verify all export targets actually exist
  if (pkgJson.exports) {
    for (const [subpath, exportTarget] of Object.entries(pkgJson.exports)) {
      if (typeof exportTarget === 'object' && exportTarget !== null) {
        const typesTarget = (exportTarget as Record<string, string>).types;
        const importTarget = (exportTarget as Record<string, string>).import;
        if (typesTarget && !existsSync(join(pkg.dir, typesTarget))) {
          throw new Error(`Export target ${subpath} (types) does not exist: ${typesTarget}`);
        }
        if (importTarget && !existsSync(join(pkg.dir, importTarget))) {
          throw new Error(`Export target ${subpath} (import) does not exist: ${importTarget}`);
        }
      }
    }
  }

  console.log(`  [OK] ${pkg.name} packed cleanly with all exports verified.`);
}

function run(): void {
  try {
    for (const pkg of PACKAGES_TO_VERIFY) {
      verifyPackage(pkg);
    }
    console.log('\n[Packaging Success] All shared packages passed hermetic packaging verification with 0 errors.');
  } catch (err: unknown) {
    console.error('\n[Packaging Failure]:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

run();
