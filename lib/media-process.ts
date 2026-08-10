/**
 * Media-process adapter — the single module that owns child-process invocation
 * for ffmpeg / ffprobe (and other media tools), plus the Windows ffmpeg_bin
 * PATH bootstrap.
 *
 * One seam, two adapters: the real execFileSync runner in production, a
 * recording fake via setProcessRunner() in tests. Every command executes with
 * an argument array — never a shell string (AGENTS.md Q3 Rule 20).
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ProcessOptions {
  timeout?: number;
}

export type CommandRunner = (
  command: string,
  args: string[],
  opts?: ProcessOptions,
) => Promise<string>;

let runner: CommandRunner = (command, args, opts) => {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        timeout: opts?.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB limit
      },
      (error, stdout, _stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      }
    );
  });
};

/**
 * Swap the process runner — the second adapter behind this seam. Used by
 * tests to record args or throw without invoking a real binary.
 */
export function setProcessRunner(fn: CommandRunner): void {
  runner = fn;
}

/** Restore the real execFile runner (the production adapter). */
export function resetProcessRunner(): void {
  runner = (command, args, opts) => {
    return new Promise((resolve, reject) => {
      execFile(
        command,
        args,
        {
          timeout: opts?.timeout,
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout, _stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        }
      );
    });
  };
}

let ffmpegPathBootstrapped = false;

/** Prepend the portable ffmpeg bin folder to PATH (Windows dev machines only). */
export function ensureFfmpegOnPath(): void {
  if (process.platform !== 'win32' || ffmpegPathBootstrapped) return;

  const candidates = [
    join(process.cwd(), 'ffmpeg_bin', 'ffmpeg-master-latest-win64-gpl', 'bin'),
    join(__dirname, '..', 'ffmpeg_bin', 'ffmpeg-master-latest-win64-gpl', 'bin'),
  ];
  const existing = candidates.find((p) => existsSync(p));
  if (existing) {
    process.env.PATH = `${existing};${process.env.PATH}`;
  }
  ffmpegPathBootstrapped = true;
}

/** Run an arbitrary command with an argument array. Returns stdout. */
export function runCommand(command: string, args: string[], opts?: ProcessOptions): Promise<string> {
  return runner(command, args, opts);
}

/** Run ffmpeg with an argument array. Returns stdout. */
export function runFfmpeg(args: string[], opts?: ProcessOptions): Promise<string> {
  ensureFfmpegOnPath();
  return runner('ffmpeg', args, opts);
}

/** Run ffprobe with an argument array. Returns stdout. */
export function runFfprobe(args: string[], opts?: ProcessOptions): Promise<string> {
  ensureFfmpegOnPath();
  return runner('ffprobe', args, opts);
}
