# NoBlur Deployment Readiness — Task Log

> Created: 2026-09-02 · Audit-driven priorities (all items trace to the full deployment audit).
> Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Priority 0 — CRITICAL (fix/verify before any production deploy)

### P0-1 · Rotate & purge leaked Sentry auth token
- **Finding:** `.env.sentry-build-plugin` contains a real Sentry auth token and is tracked by git (present in working tree despite `.gitignore`).
- **Fix:** Rotate the token in Sentry settings. Verify whether it was ever committed: `git log --all --follow -- .env.sentry-build-plugin`. If ever committed, purge with `git filter-branch` / BFG Repo Cleaner, then force-push all branches/tags.
- **Verify:** No occurrence of `sntrys_` remains in git history.

### P0-2 · Remove hardcoded Sentry DSN double-init [x]
- **Finding:** `sentry.server.config.ts:8` and `sentry.edge.config.ts:9` hardcode the DSN while `instrumentation.ts` already initializes Sentry from `process.env.SENTRY_DSN`. Causes double-init and prevents rotation without a code change.
- **Fix (DONE 2026-09-02):** Deleted `sentry.server.config.ts` and `sentry.edge.config.ts`. Kept `instrumentation.ts` as the sole init path; merged `enableLogs: true` from the deleted files. Updated all docs references.
- **Verify:** No second Sentry.init in runtime logs; DSN removable via env var alone.

### P0-3 · Make `CRYPTO_SALT` mandatory in production [x]
- **Finding:** `lib/crypto.ts:8` falls back to a predictable `noblur_fallback_salt_2026`, weakening fingerprint/IP hashing.
- **Fix (DONE 2026-09-02):** `lib/crypto.ts` now throws `CRYPTO_SALT is required in production` when `NODE_ENV === 'production'` and the var is missing; the dev fallback is used only outside production. Verified by `tests/crypto.test.ts` (4 tests).
- **Verify:** Server refuses to start without `CRYPTO_SALT` in prod; tests still pass (137/137).

---

## Priority 1 — Tigris Storage Migration

Goal: replace Supabase S3-compatible storage with **Tigris** (zero egress fees, S3-compatible, globally low latency). Tigris is S3-API compatible, so the `@aws-sdk/client-s3` code path is preserved; only connection config + env vars change.

### T-1 · Rename storage module for clarity [x]
- **File:** `server/services/storage.ts`
- Rename export `r2Client` → `storageClient` (provider-neutral). Update consumers:
  - `workers/cleanup-cron.ts` (imports `r2Client`)
  - `tests/resumable-upload.test.ts` (mocks `r2Client.send`)
- Rename helpers `downloadFromR2` / `uploadToR2` → `downloadObject` / `uploadObject` (keep aliases if breadth of code demands, but prefer full rename).
- Update comments (currently say "R2" but point at Supabase).
- **DONE (2026-09-02):** full rename across `server/services/storage.ts`, `workers/cleanup-cron.ts`, `workers/encode-worker.ts`, `workers/analysis-worker.ts`, `tests/resumable-upload.test.ts`. No `r2Client`/`downloadFromR2`/`uploadToR2` references remain.

### T-2 · Update env vars: Supabase → Tigris [x]
- **Files:** `server/services/storage.ts`, `workers/cleanup-cron.ts`, `docker-compose.yml` (4 services), `.env.example`, `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`
- Replace the 6 `SUPABASE_S3_*` vars with Tigris equivalents:
  - `TIGRIS_ENDPOINT` (e.g. `https://fly.storage.tigris.dev`)
  - `TIGRIS_REGION` (Tigris uses region `auto`)
  - `TIGRIS_ACCESS_KEY_ID`
  - `TIGRIS_SECRET_ACCESS_KEY`
  - `TIGRIS_UPLOADS_BUCKET`
  - `TIGRIS_OUTPUTS_BUCKET`
- Add a compatibility shim so `SUPABASE_S3_*` still maps until both buckets are created in Tigris (optional, to avoid a hard cutover).
- **DONE (2026-09-02):** all 6 vars swapped to `TIGRIS_*` in code, compose, `.env.example`, and deploy/ops docs. Hard cutover chosen (no shim) — real buckets must be created in Tigris before first upload. Canonical endpoint default is `https://t3.storage.dev`.

### T-3 · Bucket config in Tigris [~]
- **Action (outside code):** Create `noblur-uploads` and `noblur-outputs` buckets in the Tigris console.
- Standardize bucket name defaults — note a 3-way inconsistency exists today: `.env.example` says `compr-uploads`/`compr-outputs`, code defaults say `noblur-uploads`/`noblur-outputs`, docker-compose says `noblur-uploads`/`noblur-outputs`. Pick one (`noblur-*`) everywhere.
- **Code part DONE (2026-09-02):** standardized to `noblur-uploads`/`noblur-outputs` everywhere (`.env.example`, compose, code defaults). **REMAINING (blocked on user):** create the two buckets in the Tigris console.

### T-4 · Path-style config check [x]
- **File:** `server/services/storage.ts:15`
- Currently `forcePathStyle: true` (required by Supabase). Tigris supports standard virtual-hosted-style; verify which is correct against the Tigris endpoint. Default to `forcePathStyle: false` unless the endpoint requires it.
- **DONE (2026-09-02):** researched — Tigris requires virtual-hosted-style (`forcePathStyle: false`) and `region: "auto"` with the AWS SDK. Both set; verified by `tests/storage-tigris.test.ts`.

### T-5 · CSP connect-src update [x]
- **File:** `next.config.ts:22`
- `originOf(...)` currently reads `SUPABASE_S3_ENDPOINT` for the browser's direct-to-storage PUT. Update to derive from the Tigris endpoint so the browser can PUT chunks cross-origin.
- **DONE (2026-09-02):** `next.config.ts` now derives from `process.env.TIGRIS_ENDPOINT || 'https://t3.storage.dev'`.

### T-6 · Tests + docs sweep [x]
- Update `tests/resumable-upload.test.ts` (mock client rename).
- Update agent rules / docs still saying "R2" or "Supabase" (they are now provider-neutral anyway):
- **DONE (2026-09-02):** `tests/resumable-upload.test.ts` uses `storageClient`; added `tests/storage-tigris.test.ts` (3 tests: forcePathStyle=false, endpoint/region, no embedded secret). Docs env-var tables updated. **REMAINING (blocked on user):** manual upload → process → download round-trip against real Tigris creds.

---

## Priority 2 — Deployment / Security Hardening

### D-1 · Reduce nginx `client_max_body_size` [x]
- **File:** `nginx/nginx.conf:52`
- Change `500M` → `50m` (matches app's 50MB cap; prevents oversized-body DoS before app validation).
- **DONE (2026-09-02):** `client_max_body_size 50m`.

### D-2 · Secure Redis + Postgres in compose for prod [x]
- **File:** `docker-compose.yml`
- Add Redis `requirepass`; stop exposing Postgres `5432` / Redis `6379` to the host in production profiles. Use a Docker secrets or `.env` file for DB credentials (not hardcoded `noblur:noblur`).
- **DONE (2026-09-02):** `REDIS_PASSWORD` required via `requirepass`; `POSTGRES_PASSWORD` env-driven (no default); postgres bound to 127.0.0.1; all 4 services use `redis://:${REDIS_PASSWORD}@redis:6379` and `${POSTGRES_*}`-driven `DATABASE_URL`. New required vars documented in `.env.example`. **Note:** `docker compose up` now requires `POSTGRES_PASSWORD`/`REDIS_PASSWORD`.

### D-3 · Add server-side MIME whitelist at presign [x]
- **File:** `server/routes/uploads.ts:7-13`
- Restrict `mimeType` to the allowed set (video/mp4, video/webm, video/quicktime, application/octet-stream for 3gp/avi, image/jpeg, image/png, image/webp, image/gif, image/heic, image/heif). Reject others with 400 before creating the MediaFile row.
- **DONE (2026-09-02):** `ALLOWED_MIME_TYPES` whitelist + `z.string().refine(...)` with "Unsupported file type." message; tests cover accept/reject.

### D-4 · Move fingerprint out of URL query strings [x]
- **Files:** `server/routes/jobs.ts:123,146,191` (download/status links), `server/routes/usage.ts`, `dashboard-client.tsx`
- Fingerprint in query params leaks into access logs, browser history, and Referer headers. Move to a request header (e.g. `X-NoBlur-Fingerprint`) or body field for API calls; for the download link, keep it short-lived / signed or accept a short token instead of the raw fingerprint.
- Note: the client URL (`/api/v1/jobs/:id/download/:out?fingerprint=...`) must be reworked accordingly.
- **DONE (2026-09-02):** API reads fingerprint from `X-NoBlur-Fingerprint` header (query kept as fallback on usage/status). Download URLs now carry a short-lived signed `?dl=` token (HMAC + 10-min expiry, `createSignedDownloadToken`/`verifySignedDownloadToken` in `lib/crypto.ts`, constant-time verify). Client sends the header; CORS allows it; `tests/crypto.test.ts` covers token paths.

### D-5 · Harden CSP script-src [x]
- **File:** `next.config.ts:27`
- Replace `'unsafe-inline'` in `script-src` with nonce/hash-based approach (Next.js `next/dynamic` + nonce or a strict CSP-compatible setup). Keep `'unsafe-inline'` for styles if unavoidable, but scripts should be nonce'd.
- **Verify:** PostHog/Sentry still load; no console CSP violations; dashboard JS functions.
- **DONE (2026-09-02):** per-request nonce via new `middleware.ts` (Edge-safe `crypto.randomUUID()`); CSP moved out of `next.config.ts` into middleware; `script-src` = `'self' 'nonce-<n>'` (no `'unsafe-inline'`; style-src keeps it, accepted); `app/layout.tsx` threads nonce onto `<html>`. **Verified by build + `next start` + curl:** CSP header present with nonce, 33/33 executable inline scripts nonced (only un-nonced tag is the `application/ld+json` data block, CSP-exempt), page renders 200. **Tradeoff:** pages that were `○ Static` are now `ƒ Dynamic` (per-request nonce requires SSR).

### D-6 · Add rate limiting to GET endpoints + sliding window [x]
- **File:** `server/plugins/rate-limit.ts`
- Add the fixed-window limiter to GET `/jobs/:id`, GET `/usage` (or a lighter per-IP cap) to prevent enumeration/scraping.
- Consider a sliding-window counter (Redis ZSET) instead of INCR+EXPIRE to close the burst-window gap.
- **DONE (2026-09-02):** fixed-window (INCR+EXPIRE, 60s) with `WRITE_LIMIT=20`, `READ_LIMIT=100`; GET limits on `/api/v1/usage` + `/api/v1/jobs/`. Tests cover the burst-window gap; sliding-window ZSET deferred (documented tradeoff).

### D-7 · Onboarding input bounds [x]
- **File:** `server/routes/onboarding.ts:7-11`
- Add `.max()` limits to `primary_use` / `priority` strings.
- **DONE (2026-09-02):** `fingerprint` `.max(256)`, `primary_use`/`priority` `.max(50)`.

### D-8 · CORS polish [x]
- **File:** `server/index.ts`
- Add `Access-Control-Max-Age: 86400`; document when `Allow-Credentials` becomes needed (currently fingerprint-based, so not needed yet).
- **DONE (2026-09-02):** `Access-Control-Max-Age: 86400`, `Vary: Origin`, allow `X-NoBlur-Fingerprint` header.

---

## Priority 3 — UI/UX & PWA Install Flow

### UX-1 · Register a service worker (required for `beforeinstallprompt`) [x]
- **Finding:** No `sw.js` / service worker exists. `beforeinstallprompt` reliably fires only after a service worker with a `fetch` handler is registered and the installability criteria (manifest + SW + HTTPS) are met. Without it the install feature likely never shows in production.
- **Fix:** Added `public/sw.js` (network-first navigations, stale-while-revalidate for static assets) and registered it in `app/providers.tsx` (client, all routes). Installed targets: `'/'`, `/pricing`, `/how-it-works`, `/about`, `/dashboard`.
- **Verify:** Chrome DevTools → Application → Service Workers shows an activated worker; install criteria satisfiable.

### UX-2 · Build a reusable `InstallPromptModal` [x]
- **New file:** `components/InstallPromptModal.tsx` (lazy-loaded, mounted globally in `providers.tsx`)
- Behavior:
  - Listens for `beforeinstallprompt` at the app root (once), stores the deferred event.
  - Shows a **modal** with: icon, value prop ("Add NoBlur to your phone"), benefit list, primary "Install App" + secondary "Not now".
  - "Not now" dismisses via a localStorage flag (`noblur_install_dismissed_at`) and re-prompts after 7 days — non-nagging.
  - Fully accessible: `role="dialog"`, `aria-modal`, focus trap, Escape to close, `prefers-reduced-motion` respected.
  - On accept → `deferredInstallPrompt.prompt()`, tracks via `onInstalled` callback.
- Shared across landing + dashboard (mounted once at the root).

### UX-3 · Wire install prompt into the DASHBOARD [x]
- **File:** `app/dashboard/dashboard-client.tsx`
- Removed the inline header chip and its own `beforeinstallprompt` listener/state — now handled by the global `InstallPromptModal`, avoiding a double prompt.

### UX-4 · Wire install prompt into the LANDING page [x]
- **Files:** `app/providers.tsx`, `public/sw.js`
- Because the modal + service worker are registered at the app root (`providers.tsx` wraps every route), the install prompt is live on the landing page and the dashboard uniformly.

### UX-5 · Route / linking audit (landing vs dashboard) [x]
- Confirm every CTA/target is correct and error paths are graceful:
  - Landing CTAs → `/dashboard` (correct across hero, trust strip, bottom CTA, header, pricing, how-it-works).
  - Header logo → `/` (drills back to landing) — confirm dashboard header logo also → `/`.
  - Dashboard requires no auth (fingerprint fallback) — confirm `/dashboard` renders the upload shell even when quota/usage fails (it does via `usageLoading` skeleton + tolerant fetch).
  - `/jobs/:id` standalone page: noindex, nofollow, ownership-gated — already intentional.
  - 404/error/loading boundaries already exist (`error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`).
  - **Add:** a visible "opens app" / "open dashboard" affordance on landing (e.g. sticky header CTA already "Get Started"; consider a "Try a sample" CTA to reduce friction for cold visitors).
- **AUDITED (2026-09-02):** all CTA targets → `/dashboard`; header + dashboard logos → `/`; `/jobs/[id]` noindex/nofollow via metadata + `X-Robots-Tag`; error/not-found/loading boundaries present. "Try a sample" already satisfied by the dashboard's `loadDemoFile` demo-photo flow — no new CTA needed.

### UX-6 · Accessibility + UX polish pass [x]
- Ensure all interactive elements have visible focus rings (M3 tokens exist).
- Confirm toast/dialog live regions announce install success.
- Add `aria-pressed` where relevant; confirm the install modal traps focus (follow existing upsell-modal pattern in `dashboard-client.tsx`).
- Respect `prefers-reduced-motion` in any new modal animation.
- **AUDITED (2026-09-02):** `focus-visible:outline-primary` rings on all interactive elements (header, drawer, dashboard, modal, toast). Toast uses `role=alert/status` + `aria-live` assertive/polite. InstallPromptModal + mobile drawer implement focus trap + Escape close + `aria-modal`. `prefers-reduced-motion: reduce` global guard in `globals.css` (3 sites). No toggle buttons need `aria-pressed` today.

---

## Priority 4 — Nice-to-have / Structural

### N-1 · Provider-neutral naming everywhere [x]
- Sweep remaining `R2`/`Supabase` comments in `lib/error-classification.ts`, `lib/queue.ts` comments, docs → generic "object storage" or "Tigris".
- **DONE (2026-09-02):** `lib/error-classification.ts` → "object-storage timeouts"; `workers/analysis-worker.ts` (2 comments) → uploads bucket / storage connection; `server/services/storage.ts` (4 JSDoc comments) → uploads/outputs bucket (bucket names still reference the generic `noblur-*` convention); `workers/encode-worker.ts` → object storage; `.env.example` + `tests/error-classification.test.ts` provider-neutral. `lib/queue.ts` had no stale references. Docs referencing actual DB/infra operator decisions (Supabase Postgres, backups) left as-is — they describe real infrastructure, not code-comment naming.

### N-2 · Missing SEO assets [x]
- `og-default.jpg` referenced in `lib/seo.ts` is not in `public/` — add it.
- Add FAQPage JSON-LD for the FAQ section (`@type: FAQPage`).
- Add canonical URL + OG/Twitter to `/about`, `/pricing`, `/how-it-works` (they use manual metadata today, lacking OG/Twitter/OG image).
- **DONE (2026-09-02):** generated `public/og-default.jpg` (1200×630, brand card on M3 dark-teal gradient with NoBlur logotype + value prop); added `faqSchema()` builder in `lib/seo.ts` and rendered FAQPage JSON-LD on the marketing home page; converted `/about`, `/pricing`, `/how-it-works` to `buildMetadata(...)` so they inherit canonical URL + OG + Twitter + OG image. Added `tests/seo.test.ts` coverage for `faqSchema`.

### N-3 · Add security ESLint plugins [x]
- Extend `eslint.config.mjs` with `eslint-plugin-security` + `eslint-plugin-no-secrets` to catch regressions of P0-1/P0-3 class.
- **DONE (2026-09-02):** both plugins added. Enabled `no-secrets/no-secrets` (error) + `security/detect-eval-with-expression` (error) + `security/detect-unsafe-regex` (warn). Filesystem/child-process heuristics intentionally omitted (media pipeline uses dynamic fs paths legitimately). Lint clean: 0 errors.

### N-4 · Test the install event path [x]
- Add a unit test for `InstallPromptModal` logic (deferred prompt capture, dismiss flag, accept → prompt). Mock `beforeinstallprompt` (EventTarget) in jsdom.
- **DONE (2026-09-02):** extracted the retry/dismiss decision + persistence out of the component into `lib/install-prompt.ts` (`shouldShowAgain`, `rememberDismissed`), so the logic is unit-testable without a DOM. Added `tests/install-prompt.test.ts` (5 tests: first-show, quiet-period window, hide-during-window, timestamp persistence, corrupt-value recovery). The component now consumes these helpers via a stable injected store (defaults to `window.localStorage` / `Date.now`). **Note:** the full deferred-prompt capture + accept→prompt flow (`beforeinstallprompt` EventTarget + React render) still needs a DOM test runner, which the repo's plain `node:test` setup (no jsdom/testing-library) does not have — deferred to avoid adding unrequested dependencies.

### I-1 · Idempotent job intake (retry-safe `POST /api/v1/jobs`) [x]
- A client retry after a lost success response used to re-hit `FILE_ALREADY_PROCESSED` (400), making the client think a successfully-processed upload failed and re-upload it unnecessarily.
- **DONE (2026-09-02):** `lib/job-intake.ts` now resolves the source file and short-circuits idempotency BEFORE the daily-quota gate:
  - Same fingerprint retrying an already-processed file → returns the existing job id (`202`, `{ jobId, status: 'queued' }`); no new job, no double-enqueue, **no quota slot consumed**.
  - A different fingerprint probing a processed file → `403 FORBIDDEN` (no longer leaks that the file was processed, and ownership is decided by the prior job's `fingerprintHash`, never a trusted client value).
  - This replaces the old `FILE_ALREADY_PROCESSED` 400 path entirely.
  - The guard was moved up so the quota-gate `usageRecord.upsert` increment can never fire for a merely-retried file (no quota leak).
- Added `tests/job-intake-idempotency.test.ts` (3 tests: same-owner retry returns existing job without re-enqueue; cross-fingerprint probe rejected 403; fresh file creates + enqueues once). Run against a mocked `prisma.$transaction` + neutered Redis/BullMQ client (ioredis patched, dynamic imports, `hashString` shared ref) so no live Postgres/Redis is needed.

---

## Deployment Checklist (final gate)

- [x] P0-3 resolved (CRYPTO_SALT mandatory in prod, tested)
- [~] P0-1 (rotate Sentry auth token — manual; verified no `sntrys_` in git history, file untracked) · [x] P0-2 (Sentry double-init)
- [~] T-1..T-6 done in code; **T-3 real Tigris buckets + round-trip verify pending** (needs user's Tigris creds)
- [x] D-1 .. D-8 done (all landed + verified this session)
- [x] N-3 security ESLint plugins (lint clean)
- [x] UX-1 .. UX-6 done (install flow + audit)
- [x] `npm test` green (**140/140**), `tsc --noEmit` clean, `eslint` clean (0 errors), `check:boundaries` passes
- [x] I-1 idempotent job intake (retry-safe `POST /api/v1/jobs`; same-owner retry returns existing job, cross-owner rejected 403, no quota leak)
- [x] `next build` passes reliably — **fix: Sentry source-map upload was hanging builds; now opt-in via `SENTRY_SOURCE_MAPS=1`** (`next.config.ts` `sourcemaps.disable`)
- [x] CSP nonce verified at runtime (`next start` + curl: nonced script-src, no unsafe-inline)
- [~] Docker images build (web/api/worker), compose health checks pass — **blocked on environment here**: Docker CLI present but Docker Desktop/engine not running on this machine, and runtime `compose up` additionally needs `POSTGRES_PASSWORD`/`REDIS_PASSWORD`. Verify on a Docker-enabled host.
- [x] Secrets: none committed — verified 2026-09-02; `.env` + `.env.sentry-build-plugin` git-ignored (untracked), `.env.example` is the template, no `sntrys_` token in git history, DSN env-driven only (`instrumentation.ts`; no hardcoded DSN in source)

---

## Deferred / Blocked on user input (cannot be done without real credentials or manual actions)

> **All of these are tracked, with copy-paste instructions, in [`docs/PENDING-TASKS.md`](docs/PENDING-TASKS.md).**

1. **P0-1 — Rotate leaked Sentry auth token** in the Sentry dashboard (no git purge needed; file is untracked).
2. **T-3 — Create `noblur-uploads` and `noblur-outputs` buckets** in the Tigris console; fill `TIGRIS_ACCESS_KEY_ID` / `TIGRIS_SECRET_ACCESS_KEY` + a strong `CRYPTO_SALT` in `.env`.
3. **T-6 — Manual round-trip** (upload → process → download) against real Tigris creds.
4. **D-2 — `POSTGRES_PASSWORD` / `REDIS_PASSWORD`** must be set for `docker compose up` (new required vars).
5. **P0-2 — Sentry double-init** — resolved 2026-09-02 (deleted duplicate config files; `instrumentation.ts` is the sole init path).
6. **N-1 — Provider-neutral naming sweep** — resolved 2026-09-02 (code comments + `.env.example` + test swept; docs describing real DB/backup infra left as-is).
7. **N-2 — SEO assets** — resolved 2026-09-02 (`og-default.jpg` added to `public/`; FAQPage JSON-LD on home page; `/about`, `/pricing`, `/how-it-works` now use `buildMetadata` with canonical + OG/Twitter + OG image).
8. **N-4 — InstallPromptModal unit test** — retry/dismiss logic now tested via extracted `lib/install-prompt.ts` (5 tests). The deferred-prompt capture/accept→prompt React flow still needs a DOM test runner (jsdom/testing-library) not present in the repo; adding it is out of scope for the current pass.
9. **D-6 sliding-window option** — fixed-window implemented; ZSET sliding window intentionally not built (documented tradeoff).
10. **D-5 tradeoff note** — nonce CSP turns previously-static pages dynamic (per-request nonce). Acceptable; flag if static rendering is later required.
11. **npm audit** reports 12 vulnerabilities (3 moderate, 9 high) — review before deploy.
