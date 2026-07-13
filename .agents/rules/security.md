---
trigger: always_on
---

# Security & Privacy — COMPr

## 1. Input Validation (The Iron Rule)

- **Never trust client-supplied MIME types or file extensions.**
- All uploaded files MUST be validated server-side by **magic-byte sniffing** (e.g., using `file` command or `mmmagic` library) before any processing begins.
- Reject files that mismatch their claimed type.

## 2. Data Privacy (PII & IP)

- **NEVER store a raw IP address.**
- Store only a salted, one-way hash of `fingerprint + IP` for quota and abuse tracking. Use a strong hashing algorithm (e.g., SHA-256 with a pepper).
- File contents are used strictly to produce the requested output. They are never sent to analytics (PostHog/Sentry), used for training, or shared with third parties.

## 3. Command Injection Prevention

- **NEVER shell-interpolate a filename, path, or any user-derived string into an FFmpeg or ffprobe command.**
- Always pass arguments as an array via `execFile` or `execFileSync`.
- *Violation:* `exec('ffmpeg -i ' + userInput)` ➔ ❌ **FAIL**
- *Correct:* `execFile('ffmpeg', ['-i', userInput])` ➔ ✅ **PASS**

## 4. Transport & Headers

- **HTTPS/TLS is mandatory** everywhere (HSTS enabled).
- **Content Security Policy (CSP):** Scoped strictly to required third parties. Must allow Google Analytics/GTM and Sentry only. Do not use `unsafe-eval` or broad `data:` wildcards unless strictly necessary.
- **Job Pages (`/jobs/*`):** MUST carry `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` (configured in `next.config.js`).

## 5. Secrets Management

- All secrets (Flutterwave keys, R2 credentials, DB URL) are read from `process.env`.
- Validate all required secrets at boot time. Fail fast with a clear error if missing.
- NEVER log environment variables, even in error traces.
