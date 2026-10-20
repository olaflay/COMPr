import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import security from 'eslint-plugin-security';
import noSecrets from 'eslint-plugin-no-secrets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: ['.next/**', 'dist/**', 'node_modules/**', 'pgsql/**'],
  },
  {
    plugins: { security, 'no-secrets': noSecrets },
    // Security rules aimed at the P0-1/P0-3 regression class: hardcoded
    // secrets and dangerous evaluation. Filesystem/child_process heuristics
    // are intentionally omitted: this is a media pipeline that legitimately
    // uses dynamic fs paths and spawns encoders.
    rules: {
      'no-secrets/no-secrets': ['error', {
        tolerance: 4.6,
        ignoreModules: true,
      }],
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'warn',
    },
  },
];
