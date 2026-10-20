---
trigger: always_on
---

Source of truth for technical architecture: `docs/VECTEUS-TECHNICAL-SPEC.md`. This file governs code shape, quality, and systems safety for the Vecteus infrastructure platform.

## Language & Typing

- TypeScript everywhere (`/lib`, `/server`, `/workers`). No implicit `any`.
- `@ts-ignore` requires a one-line comment explaining why. An unexplained suppression is treated as a bug.
- `tsc --noEmit` must pass with zero errors before any task is reported done.

## Process & Memory Sandboxing (Zero-Cost Invariant)

- Unbounded child process execution is forbidden. Every external command (`ffmpeg`, `ffprobe`, `python3`) must execute with:
  1. An explicit timeout timer (default: 300s for video, 30s for probes).
  2. A capped maxBuffer (maximum 10MB) to prevent Node.js buffer exhaustion.
- FFmpeg commands must never use shell interpolation (`exec`). Always pass arguments as a structured array (`execFile` or `spawn`).
- Process memory allocations must fit within the container cgroup memory reservation (maximum 768MB resident memory per worker). SVT-AV1 thread allocations must remain throttled (`lp=2`).

## Function and File Shape

- `/lib` functions are small, pure, and named for what they compute (`calculateTargetBitrate`, `scoreVmafQuality`).
- No file in `/lib` exceeds ~250 lines. Split before it becomes a bloated pipeline god file.
- Every exported `/lib` function has a corresponding unit test in `/tests`, mirroring the `/lib` structure 1:1.

## Error Handling & Standard Envelope

- All API errors return the standard envelope: `{ error: { code, message } }`. No route invents its own error shape.
- Error `code` values are stable, documented strings (e.g. `INVALID_API_KEY`, `UNSUPPORTED_MEDIA_TYPE`, `QUOTA_EXCEEDED`).
- Internal error details (stack traces, file system paths, database connection strings) never reach the client.
- Media processing failures are classified before retry logic runs:
  * Transient (OOM / signal-killed / storage 503) triggers a single retry with step-down preset.
  * Permanent (invalid bitstream / demux error) terminates immediately with zero retries.

## Environment & Secrets

- Secrets (API signing keys, R2/S3 credentials, database URL) are read from `process.env` only, validated at startup.
- Never hardcode, log, or commit secret values.

## Linting & Formatting

- Prettier and ESLint run in CI. Do not hand-format around the linter or disable rules without explicit authorization.
- No em dashes or double hyphens are permitted in code comments, error messages, API descriptions, or documentation.

## Definition of Done (Code Level)

- [ ] `tsc --noEmit` passes with zero errors.
- [ ] `npm test` passes with zero errors.
- [ ] Every new `/lib` function has a passing unit test.
- [ ] No unbounded or shell-interpolated child process execution.
- [ ] Error responses conform to the standard `{ error: { code, message } }` envelope.
