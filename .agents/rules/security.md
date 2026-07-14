---
trigger: always_on
---


Operational checklist for security-sensitive code. Source rules live in
AGENTS.md Q3 (10–19) and PRD §23; this file is how an agent verifies them
while building, not a second copy of the same law.

## Input and file handling

- Never trust a client-supplied MIME type or file extension. Verify real
  file type via magic-byte sniffing server-side before any processing
  (PRD §23, AGENTS.md #14).
- Never shell-interpolate a filename, path, or any user-derived string into
  an FFmpeg/ffprobe command. Arguments are always passed as an array
  (`execFile`/`execFileSync`), never a shell string (AGENTS.md #19, PRD §23).
- Worker processes run FFmpeg in a sandboxed/containerized environment —
  never assume the host filesystem is a safe place to write user-derived paths.

## Network and transport

- All traffic over HTTPS/TLS; HSTS enabled.
- Rate limiting on `/jobs` and `/uploads/presign`: 20 requests/minute/IP
  (PRD §23). Don't relax this "temporarily" for testing in a way that ships.
- `Content-Security-Policy` is scoped only to third parties COMPr actually
  uses (GA4/GTM, Sentry) — never add a wildcard or a new third-party origin
  without updating this rule and confirming with a human.

## Presigned URLs

- Scoped to a single object. Upload URLs: 60-minute expiry. Download URLs:
  24-hour expiry, matching retention (PRD §22, §23).
- The API server never proxies raw file bytes — uploads and downloads go
  client↔R2 directly. If a task seems to require the API to read/write file
  bytes itself, that's a signal something is wrong with the approach — flag it.

## Identity and privacy

- Fingerprint and IP are hashed (salted, one-way) before storage. Never log,
  store, or pass a raw IP address anywhere, including error logs sent to
  Sentry (AGENTS.md #13).
- Sentry error reports include job metadata, never file content or derived
  thumbnails (PRD §25).

## Dependencies

- Dependency and container image scanning runs in CI. A new dependency is
  called out explicitly in the task summary, not silently added — especially
  anything that shells out, touches the filesystem, or handles network input.

## Definition of done (security-level)

- [ ] No shell-interpolated FFmpeg/ffprobe command was introduced.
- [ ] File type validated by magic bytes, not client-supplied MIME/extension.
- [ ] No raw IP logged or stored anywhere in the change.
- [ ] Presigned URL expiries match the PRD values (60min upload / 24hr download).
- [ ] No new third-party origin added to CSP without explicit confirmation.
