---
trigger: always_on
---

Operational checklist for security-sensitive code across the Vecteus platform.

## Input & File Handling

- Never trust client-supplied MIME types or extensions. Verify real file type via magic-byte sniffing server-side before enqueuing work.
- Never shell-interpolate a filename, path, or any user-derived string into an FFmpeg or ffprobe command. Arguments must always be passed as an array (`execFile` or `spawn`), never a shell string.
- Worker processes run FFmpeg in a sandboxed container environment with strict temporary directory isolation.

## API Keys & Authentication

- Tenant API keys (`X-Vecteus-Key` or `X-Vectis-Key`) must be hashed with SHA-256 and salt before database storage.
- Never store, log, or display raw API keys after initial issuance.
- Outbound webhooks must be cryptographically signed using HMAC-SHA256 (`X-Vecteus-Signature`) over the raw JSON payload with a unique tenant signing secret.

## Network & Transport

- All traffic over HTTPS/TLS with HSTS enabled.
- Webhook dispatchers must enforce SSRF protection: reject dispatch attempts targeting private or local loopback IP ranges (RFC 1918, 127.0.0.1, 169.254.169.254).

## Presigned Storage URLs

- Presigned upload URLs expire within 60 minutes.
- The API server never proxies raw file bytes. Uploads and downloads flow client-to-storage directly.

## Definition of Done (Security Level)

- [ ] No shell-interpolated FFmpeg commands.
- [ ] File types verified by magic bytes.
- [ ] API keys hashed before storage; webhook payloads HMAC-signed.
- [ ] SSRF defenses active on outbound webhook URLs.
- [ ] Zero em dashes or double hyphens used.
