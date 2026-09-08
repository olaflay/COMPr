# NoBlur — Session Delta + Re-audit (2026-09-02)

Compact. Full task tracing lives in `TASKLOG.md`. Nothing was committed; all changes are working-tree only.

## Verification state (end of session)

| Gate | Result |
|---|---|
| `npm test` | **131/131 pass** (0 fail) |
| `tsc --noEmit` | clean |
| `eslint .` | 0 errors (2 pre-existing config warnings) |
| `check:boundaries` | pass |
| `next build` | **passes reliably** (was hanging >300s on Sentry upload — fixed) |
| CSP nonce (runtime curl) | script-src nonced, **no `'unsafe-inline'`**, 200 OK |

## What changed this session (before → after)

### Security hardening (P2 D-series)
- **D-1 nginx** — `client_max_body_size` `500M` → `50m` (matches app cap; blocks oversized-body DoS).
- **D-2 compose** — Redis now requires `REDIS_PASSWORD` (`--requirepass`); Postgres credentials env-driven (`${POSTGRES_PASSWORD}`, no default); postgres bound to `127.0.0.1`; new required vars documented in `.env.example`. **Before:** hardcoded `noblur:noblur`, unechoised ports, unauthenticated Redis. **Note:** `docker compose up` now needs these two envs.
- **D-3 MIME whitelist** — server-side `ALLOWED_MIME_TYPES` at presign; disallowed types rejected 400 before any MediaFile row. **Before:** client-only check (spoofable).
- **D-4 fingerprint out of URLs** — API reads fingerprint from `X-NoBlur-Fingerprint` header (usage + job status); download links now use a **signed, 10-min token** (`?dl=…`, HMAC-SHA256, constant-time verify) instead of the raw fingerprint. CORS updated to allow the header. **Before:** fingerprint rode in query strings (leaked via logs/history/Referer). New `tests/crypto.test.ts` covers mint/verify/tamper/expiry/malformed.
- **D-5 CSP nonce** — new `middleware.ts` sets a per-request nonce CSP (Edge-safe `crypto.randomUUID()`); CSP removed from `next.config.ts`; `script-src` = `'self' 'nonce-…'` (**no** `'unsafe-inline'`); layout threads nonce onto `<html>`. Verified live: only un-nonced `<script>` is the JSON-LD data block (CSP-exempt). **Tradeoff:** pages that were static (`○`) are now SSR (`ƒ`) because a per-request nonce needs dynamic rendering.
- **D-6 rate limiting** — fixed-window limiter (`INCR`+`EXPIRE`, 60s) with `WRITE_LIMIT=20`, `READ_LIMIT=100`; GET limits on `/api/v1/usage` and `/api/v1/jobs/*`. **Before:** POST-only. Sliding-window ZSET consciously deferred.
- **D-7 onboarding bounds** — `.max()` on `fingerprint`(256), `primary_use`/`priority`(50).
- **D-8 CORS** — `Access-Control-Max-Age: 86400`, `Vary: Origin`, `X-NoBlur-Fingerprint` allowed.

### Build / deploy reliability (new this session)
- **Sentry build hang fixed** — `next build` previously exceeded 300s (Sentry source-map upload). `next.config.ts` now sets `sourcemaps.disable: !process.env.SENTRY_SOURCE_MAPS`, so local/CI builds complete (~2 min) unless `SENTRY_SOURCE_MAPS=1`. Also verified the version-correct option name (`@sentry/nextjs` 10.x uses `sourcemaps.disable`, not the old `disableServerWebpackPlugin`).

### Code quality / regression guards
- **N-3 security ESLint** — added `eslint-plugin-security` + `eslint-plugin-no-secrets`. Enabled high-signal rules (`no-secrets`, `detect-eval-with-expression` error; `detect-unsafe-regex` warn). Server-side fs/child-process heuristics intentionally off (media pipeline uses dynamic paths). Lint clean.

## Audited and already satisfied (no change needed)
- **UX-5 routes** — all CTAs → `/dashboard`; header + dashboard logos → `/`; `/jobs/[id]` noindex/nofollow (metadata + `X-Robots-Tag`); error/global-error/not-found/loading boundaries present; demo-photo flow already covers the suggested "Try a sample" CTA.
- **UX-6 a11y** — `focus-visible` rings on all interactive elements; Toast = `role=alert/status` + `aria-live`; install modal + mobile drawer have focus trap + Escape + `aria-modal`; global `prefers-reduced-motion: reduce` guard (3 sites in `globals.css`).
- P0-3 (`CRYPTO_SALT` mandatory in prod) — still green; test suite grew 122 → 131 (new crypto token tests).

## Lacking / not done / still needs to happen

### Blocked on the user (real credentials / manual actions) — the session explicitly paused these
1. **P0-1 · Rotate Sentry auth token** in Sentry dashboard (token present in untracked `.env.sentry-build-plugin`; no git purge needed).
2. **T-3 · Create Tigris buckets** `noblur-uploads` + `noblur-outputs`; put `TIGRIS_ACCESS_KEY_ID`/`TIGRIS_SECRET_ACCESS_KEY` + strong `CRYPTO_SALT` in `.env`.
3. **T-6 · Manual round-trip** upload → process → download against real Tigris creds.
4. **D-2 · Set `POSTGRES_PASSWORD` / `REDIS_PASSWORD`** for `docker compose up`.
5. **Docker image + compose health-check pass** (needs the compose envs above to run).

### Not done (code items, low risk, deferred to next pass)
- **P0-2 · Sentry double-init** — `sentry.server.config.ts:8` / `sentry.edge.config.ts:9` hardcode DSN while `instrumentation.ts` also inits. Deleting/refactoring them is a small, isolated change.
- **N-1 · provider-neutral comments** — remaining `Supabase`/`R2` comments in `lib/error-classification.ts`, `lib/queue.ts`.
- **N-2 · SEO assets** — `og-default.jpg` missing from `public/`; FAQPage JSON-LD; OG/Twitter tags on `/about`, `/pricing`, `/how-it-works`.
- **N-4 · InstallPromptModal unit test** (needs jsdom harness).
- **D-6 sliding-window option** — fixed-window done; ZSET sliding window deliberately not built.

### Known ongoing items / risks to review before deploy
- **`npm audit`: 12 vulnerabilities** (3 moderate, 9 high) surfaced during the N-3 install — review and triage.
- **CSP tradeoff**: nonce CSP makes previously-static routes SSR (per-request nonce). Acceptable; revisit only if static output becomes a requirement.
- **Rendering note**: PostHog/Sentry must be re-smoked in a browser against the new nonce CSP (verified structurally via curl, not a full browser session).