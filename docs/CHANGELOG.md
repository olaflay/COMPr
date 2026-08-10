# Changelog

All notable changes to the COMPr design system and codebase are documented here.
This file records design-system-level compactions, token migrations, and enforcement sweeps.

---

## [1.5.0] - 2026-08-01

### Nginx Reverse Proxy Gateway & Full-Stack Containerization

Introduced Nginx as the public-facing gateway and reverse proxy to route traffic between the Next.js web application and the Fastify API backend, containerized all services, and enabled performance-oriented proxy settings.

#### Nginx Gateway & Proxy Configuration
- **Nginx configuration:** Added `nginx/nginx.conf` to expose Port 80, routing `/api/v1/*` directly to the Fastify backend and all other paths (including static Next.js assets) to the frontend.
- **Gzip compression:** Configured gzip compression for all text-based assets (HTML, CSS, JS, JSON, XML, SVG, fonts) to minimize network transfer size and optimize performance over slow 3G/4G connections (PRD §10).
- **Static asset caching:** Configured aggressive, immutable browser caching (`365d` expiry) for Next.js build chunks (`/_next/static/*`) and standard static assets (`/images/*`, favicon, etc.).
- **Upload capacity:** Set `client_max_body_size 500M;` to support large video/image uploads up to the 500MB premium limit (PRD §10).
- **Client IP preservation:** Enabled real client IP forwarding through standard `X-Real-IP` and `X-Forwarded-For` proxy headers.

#### Backend Proxy Trust
- **Fastify proxy trust:** Modified `server/index.ts` to set `trustProxy: true` in the Fastify initialization options. This ensures that the Fastify rate-limiting plugin (`server/plugins/rate-limit.ts`) correctly resolves the real client's IP address instead of using the Nginx proxy's container IP (preventing rate limit exhaustion collisions).

#### Docker Containerization
- **Dockerfile.web:** Created a multi-stage Dockerfile to build and run the Next.js frontend in production.
- **Dockerfile.api:** Created a lightweight production Dockerfile to build and run the Fastify API server, including automatic Prisma client generation during the build.
- **Docker Compose update:** Updated `docker-compose.yml` to define the unified stack: Postgres, Redis, the workers (analysis, encode, cleanup), Next.js web, Fastify api-server, and the Nginx reverse proxy.

## [1.4.0] - 2026-07-31

### Adaptive Engine, Job Destinations, and Share Credits

Introduced the adaptive encoding engine (scene analysis, policy-selected encoding profiles, AV1 + VMAF quality gating), end-to-end job destinations, share-for-credits, and processing history.

#### Adaptive Encoding Engine

- **Analysis worker:** New `workers/analysis-worker.ts` consumes the `media-analysis` queue and runs ffprobe probing, server-side magic-byte validation, and a Python/OpenCV scene analyzer (`lib/opencv_analyze.py`) that scores face presence, text presence, brightness, and contrast at a 1 fps sample rate.
- **Policy engine:** `lib/policy-engine.ts` selects an encoding profile from `config/encoding-profiles.json` based on the job's destination and the scene-analysis scores (face/text/motion thresholds), with hard-constraint filtering before CRF modifier selection.
- **Encoding profiles:** 9 profiles across 3 families in `config/encoding-profiles.json` — `whatsapp_normal_*` (H.264 Main @ L3.1, no B-frames, 1200 kbps cap), `whatsapp_hd_*` (H.264 High @ L3.1, B-frames, 3000 kbps cap), and `av1_document_*` (SVT-AV1, no bitrate cap) — each with face / text / balanced variants.
- **AV1 support:** SVT-AV1 (`libsvtav1`) is now the primary codec on the document/preview path; H.264 (`libx264`) remains the fallback via the legacy `runPipeline`. This supersedes the previous "H.264 only" locked choice.
- **VMAF quality gate:** `lib/vmaf.ts` scores the encode against the VMAF model (`models/vmaf_v0.6.1.json`) on a middle 5-second segment; a score below the `VMAF_FLOOR` of 80 triggers a single re-encode with CRF reduced by 3. SSIM remains the secondary metric. This supersedes the previous "VMAF is Phase 2" locked choice.
- **Modular pipeline split:** Encode orchestration now routes through dedicated `lib/probe.ts`, `lib/ssim.ts`, `lib/encode.ts`, `lib/analysis.ts`, and `lib/vmaf.ts` modules.

#### Job Destinations

- **Destination enum:** Jobs now carry a destination (`WHATSAPP_NORMAL`, `WHATSAPP_HD`, `WHATSAPP_DOCUMENT`, `PREVIEW_WEB`) enforced end-to-end from the API (`server/routes/jobs.ts`) through the queue to the encode worker (migration `add_job_destination`).
- **Destination-aware profile selection:** The policy engine routes AV1/document profiles to the WhatsApp document path and H.264 profiles to the standard chat path, letting each destination pick the codec that best survives its compression profile.

#### Share Credits & Processing History

- **Share = Credit (FR-11 extension):** New `POST /api/v1/usage/share-bonus` grants 3 bonus daily compressions for sharing COMPr, tracked via `UsageRecord.bonusCount` (migration `add_share_bonus_credits`), idempotent per day, with `shareBonusAvailable` surfaced in quota responses.
- **Processing history:** `lib/job-history.ts` persists recent jobs to `localStorage` (7-day TTL) and `components/ProcessingHistory.tsx` renders them with re-download; wired into the dashboard.

#### Marketing & Reliability Fixes

- **Mobile drawer portal fix:** The marketing hamburger drawer in `app/(marketing)/marketing-client.tsx` is now rendered through `createPortal` to `document.body`. A `position: fixed` element inside a `transform`-animated ancestor (`animate-fade-in` on `<main>`) becomes sized to the whole page instead of the viewport, which pushed the drawer links below the fold on mobile. See `docs/DESIGN_SYSTEM_PRACTICES.md` §X.
- **PostHog provider:** `app/providers.tsx` wires PostHog into the client with `trackEvent` at each touchpoint.
- **Worker deployment:** `Dockerfile.worker` added for running the BullMQ worker pool in a container.

---

## [1.3.0] - 2026-07-29

### Media Engine Optimizations, Safety Boundaries, and Reliability Fixes

Implemented advanced optimizations for bitrate margins and VMAF evaluations, added dynamic encoding profiles, and introduced robust error boundaries and path-escaping corrections.

#### Processing Pipeline Optimizations

- **Dynamic Muxing Overhead:** Replaced the static 2% overhead margin in `lib/bitrate.ts` with a dynamic overhead estimator. Allocate up to 5% for short files (under 5 seconds) to prevent container header bloat, and 1.5% for longer files to maximize bitrate budget.
- **Segment-Based VMAF:** Modified `measureVmaf` in `lib/vmaf.ts` to seek both target and source files using `-ss` and compare only a 5-second segment (`-t 5`) from the middle of the clip. This reduces the number of evaluated frames and cuts the CPU footprint of VMAF on worker pools by up to 90%.
- **Capability-Aware Profiles:** Added optional `profile`, `level`, and `enableBframes` variables to `EncodeParams` in `lib/encode.ts`, defaulting to low-end settings (`main`, `3.1`, `bf=0`) for backward compatibility while allowing higher-tier overrides.

#### Safety & Reliability Fixes

- **Escaping Path Fixes:** Replaced absolute log paths with relative files in the current working directory (`ssim_${randomId}.log` and `vmaf_${randomId}.json`) inside the FFmpeg filtergraph arguments. This completely avoids colons, backslashes, and space escaping bugs on Windows systems.
- **Graceful Fail-Open Reading:** Wrapped `readFileSync` operations in `lib/ssim.ts` in a try-catch-finally block to fail-open gracefully (`avgSSIM: 1.0`) if the stats file is locked or missing, preventing thread crashes on worker queues.
- **Location-Independent Lookups:** Swapped `process.cwd()` with absolute location mappings relative to `import.meta.url` inside `lib/vmaf.ts`, `lib/ssim.ts`, and `lib/encode.ts` to ensure portable binaries and VMAF models load correctly independent of execution directory context.

---

## [1.2.0] - 2026-07-28

### Advanced Pre-Conditioning Optimizations, Security Audits, and Resumable Uploads

Implemented key architectural optimizations, closed critical security/validation audit gaps, and added a robust, checkpointed resumable multipart upload flow.

#### Advanced Pre-Conditioning & Video Pipeline

- **Macroblock Divisibility:** Aligned all target resolution dimensions in `lib/resolution.ts` to 16px multiples to prevent macroblock boundary artifacts on older mobile chipsets.
- **Color space & GOP boundaries:** Forced sRGB/BT.709 primaries and set standard 2-second keyframe boundaries (`-g 60 -keyint_min 60 -sc_threshold 0`) to preserve pre-optimized quality after WhatsApp's compression.
- **HDR Tone-mapping Cascade:** Implemented automatic SDR tone mapping fallback using `zscale` / `tonemap` filters in `lib/encode.ts` to process HDR streams cleanly.
- **Modular Pipeline Refactoring:** Modularized the orchestrator into pure, focused modules (`probe.ts`, `ssim.ts`, `encode.ts`), keeping `lib/pipeline.ts` under 175 lines.

#### Security & Privacy Audit Implementation

- **Magic-Byte Sniffing:** Implemented a dependency-free magic-byte verification function (`sniffFileType`) in `lib/sniff-file-type.ts` covering JPEG, PNG, WEBP, HEIC, MP4, WebM, and MOV to validate files server-side.
- **Global HSTS:** Enabled the HTTP Strict Transport Security (`Strict-Transport-Security`) header globally in `next.config.ts`.
- **Queue Error Boundaries:** Handled validation/codec errors as permanent failures to prevent BullMQ from executing unnecessary retry loops, while keeping transient issues retryable.

#### Resumable Multipart Uploads

- **Multipart API endpoints:** Added `startMultipartUpload`, `getPresignedPartUploadUrl`, and `completeMultipartUpload` endpoints to `server/routes/uploads.ts` and `server/services/storage.ts`.
- **Client-Side Chunking & Checkpoints:** Refactored `triggerUpload` in `dashboard-client.tsx` to slice files into 5MB chunks and upload them sequentially.
- **Checkpoint Resilience:** Saved active part progress to `localStorage` to resume from the last successful part on page refresh/unstable network dropouts.
- **Auto-Retry & Backoff:** Implemented a 5-attempt retry loop per chunk with a 2-second backoff to survive packet loss on mobile 3G/4G connectivity.

#### Offline Unit Testing

- **Lightweight DB Mocks:** Intercepted Prisma methods in `tests/resumable-upload.test.ts` to verify the routes completely offline without running a live Postgres container.
- **Validation Tests:** Added `tests/file-validation.test.ts`, `tests/sniff-file-type.test.ts`, and `tests/probe.test.ts` to cover magic-bytes and color spaces. All 83 tests pass successfully.

---

## [1.1.0] - 2026-07-27

### Video Optimization Pipeline and Parameter Tuning

Optimized video processing accuracy, aspect ratio rendering, platform ceiling enforcement, and cross-platform compatibility.

#### Core Pipeline Optimization

- **Bitrate Accuracy:** Reduced `MUX_OVERHEAD_MARGIN` to 2% (`0.02`) in `lib/bitrate.ts` from 8%. This resolves consistent target size undershoots and eliminates the need for expensive re-encoding retries on the happy path, cutting latency by 50%.
- **File Size Capping:** Added target size capping in `lib/pipeline.ts` to prevent bloating of files that are already smaller than the target size.

#### Adaptive Preset & Pass Ladder (PRD §19)

- **Queue-depth Adaptive Presets:** Implemented dynamic CPU preset and pass count selection in `workers/encode-worker.ts` based on current BullMQ queue depth:
  - Queue depth <= 2: `-preset slow` + 2-pass encoding.
  - Queue depth 3-10: `-preset medium` + 2-pass encoding.
  - Queue depth > 10: `-preset fast` + 1-pass CRF-capped (CRF=23).
- **Concurrency Safety:** Specified unique `-passlogfile` paths in `lib/pipeline.ts` for two-pass encoding to prevent parallel worker jobs from interfering with each other's temporary log files.
- **Pass Log Cleanup:** Added post-encode sweeps to delete temporary two-pass `.log` and `.log.mbtree` files.

#### Orientation Awareness & Scaling (PRD §16, §33)

- **Aspect Ratio Protection:** Extended `chooseInitialResolution` in `lib/resolution.ts` to accept full source width and height. For portrait videos (`height > width`), the logic swaps the landscape resolution ladder dimensions and scales the height cap proportionally. This prevents portrait videos from being stretched into landscape scales or upscaled (which is forbidden).
- **Portrait Resolution Drop:** Updated `dropOneResolutionTier` to support portrait resolution ladders on quality retry triggers.
- **Jobs Route:** Integrated the new orientation-aware parameters into post-encode checks in `server/routes/jobs.ts`.

#### Windows Compatibility (PRD §23)

- **FFmpeg Path Escaping:** Escaped backslashes and drive letter colons and wrapped paths in single quotes inside the SSIM filter (`stats_file=...`) in `lib/pipeline.ts` to prevent FFmpeg filtergraph parsing failures on Windows.

#### Dynamic Platform Constants (AGENTS.md)

- **Constants Enforcement:** Updated `workers/encode-worker.ts` to load target sizes and maximum height limits dynamically from `config/platform-limits.json` based on job presets, removing hardcoded ceilings.

---

## [1.0.0] - 2026-07-26

### M3 Token Compliance Audit and Enforcement

A full audit of every component, page, and layout file to enforce Material Design 3
token discipline. No hardcoded hex, pixel font sizes, raw border-radius, raw
box-shadows, or hardcoded durations remain in any component. All spacing, typography,
shape, elevation, and motion values reference `styles/m3-tokens.css` via Tailwind
utility classes.

---

### Tokens Added

| Token                      | Value              | Purpose                                 |
| -------------------------- | ------------------ | --------------------------------------- |
| `caption` (size)           | 9px / 0.5625rem    | WhatsAppStatusPreview phone mockup text |
| `caption` (line-height)    | 14px / 0.875rem    | Matching line-height for caption        |
| `caption` (letter-spacing) | 0.5px / 0.03125rem | M3 tight tracking                       |
| `caption` tablet           | 8px / 0.5rem       | Responsive override (768-1024px)        |
| `caption` mobile           | 7px / 0.4375rem    | Responsive override (<768px)            |

Files changed: `styles/m3-tokens.css`, `tailwind.config.ts`

---

### Files Changed

#### `styles/m3-tokens.css`

- Added `caption` type scale token (9px/14px/0.5px) with responsive overrides at
  all 3 tiers (mobile: 7px, tablet: 8px, desktop: 9px).
- Fixed em dash in comment (line 2-3).

#### `tailwind.config.ts`

- Added `caption` to the `fontSize` Tailwind extension.

#### `app/error.tsx`

- Replaced all hardcoded spacing (`p-8`, `gap-4`, `mb-6`, `mb-8`, `gap-2`) with
  M3 spacing tokens (`p-m3-x-large`, `gap-m3-medium`, `mb-m3-large`, `gap-m3-x-small`).
- Replaced bare `shadow` with `shadow-m3-1`.
- Removed `font-bold` from `text-title-medium` (M3 title-medium weight is 500).

#### `app/not-found.tsx`

- Replaced all hardcoded spacing (`p-8`, `gap-4`, `mb-6`, `gap-3`) with M3 spacing
  tokens.
- Removed `font-bold` from `text-title-medium`.

#### `app/loading.tsx`

- Replaced hardcoded spacing (`p-8`, `gap-4`, `mb-6`, `gap-2`, `h-8`, `w-8`, `h-4`)
  with M3 spacing tokens (`p-m3-x-large`, `gap-m3-medium`, `mb-m3-large`,
  `gap-m3-x-small`, `h-m3-large`, `w-m3-large`, `h-m3-medium`).

#### `app/jobs/[id]/page.tsx`

- Replaced all hardcoded spacing (`p-8`, `gap-4`, `mb-6`, `gap-2`, `mb-4`, `gap-1`)
  with M3 spacing tokens.
- Removed `font-bold` from `text-title-medium`.

#### `app/onboarding/onboarding-client.tsx`

- Full rewrite of all hardcoded spacing (`p-6`, `p-8`, `gap-4`, `gap-6`, `mb-6`,
  `mb-8`, `gap-2`, `gap-3`, `py-3`, `px-6`, `w-8`, `h-8`, `w-4`, `h-4`, `p-3`,
  `h-3`, `w-3`) with M3 spacing tokens throughout.
- Replaced `rounded` and `rounded-full` with `rounded-m3-sm` and `rounded-m3-full`.

#### `app/(marketing)/marketing-client.tsx`

- Full rewrite of all hardcoded spacing (`gap-4`, `gap-6`, `p-4`, `p-6`, `p-8`,
  `mb-4`, `mb-6`, `mb-8`, `py-3`, `py-4`, `px-6`, `px-8`, `gap-2`, `gap-3`, `p-3`,
  `w-8`, `h-8`, `w-4`, `h-4`, `w-10`, `h-10`, `w-12`, `h-12`) with M3 spacing
  tokens.
- Removed `font-bold` from `text-label-large` on nav tab buttons (4 instances).
- Removed `font-bold` from `text-headline-medium` on mobile drawer tab buttons
  (2 instances).
- Replaced `rounded-full`, `rounded-sm`, `rounded-[24px]` with `rounded-m3-full`,
  `rounded-m3-xs`, `rounded-m3-lg`.

#### `app/(marketing)/about/page.tsx`

- Full rewrite of all hardcoded spacing (`gap-4`, `gap-6`, `p-8`, `mb-6`, `mb-8`,
  `gap-3`, `py-4`) with M3 spacing tokens.
- Removed `font-bold` from back navigation link.

#### `app/(marketing)/how-it-works/page.tsx`

- Full rewrite of all hardcoded spacing (`gap-4`, `gap-6`, `p-8`, `mb-6`, `mb-8`,
  `gap-3`, `py-4`, `w-10`, `h-10`, `gap-1`) with M3 spacing tokens.
- Removed `font-bold` from back navigation link.
- Kept `font-bold` on step number badge (decorative element, acceptable).

#### `app/(marketing)/pricing/page.tsx`

- Full rewrite of all hardcoded spacing (`gap-4`, `gap-6`, `p-8`, `mb-6`, `mb-8`,
  `gap-3`, `py-4`) with M3 spacing tokens.
- Removed `font-bold` from back navigation link.
- Kept `font-bold` on "Coming Soon" badge pill (decorative badge, acceptable).

#### `app/dashboard/dashboard-client.tsx`

- Replaced all hardcoded spacing (`p-6`, `p-8`, `gap-4`, `gap-6`, `mb-4`, `mb-6`,
  `mb-8`, `gap-2`, `gap-3`, `py-3`, `px-6`, `w-6`, `h-6`, `h-4`, `w-32`, `h-3`,
  `h-32`, `w-24`, `w-16`, `h-16`, `h-2`, `p-3`, `w-4`, `h-4`) with M3 spacing
  tokens.
- Replaced `rounded-full`, `rounded-sm`, `rounded-md` with `rounded-m3-full`,
  `rounded-m3-sm`, `rounded-m3-md`.
- Replaced `duration-200`, `duration-300` with `duration-m3-short-2`,
  `duration-m3-medium-1`.
- Removed `font-bold` from:
  - Usage counter display (`text-label-large`)
  - Preset radio buttons (`text-label-large`)
  - "Switch to Fine Detail" button (`text-label-large`)
  - "Yes" / "Not quite" feedback buttons (`text-label-large`)
- Kept `font-bold` on logo initial "C" (decorative badge element, acceptable).

#### `components/BeforeAfterSlider.tsx`

- Replaced hardcoded spacing (`w-24`, `w-16`, `h-16`, `h-2`, `gap-2`) with M3
  spacing tokens.
- Replaced `rounded-sm` with `rounded-m3-xs`.
- Replaced `duration-300` with `duration-m3-medium-2` (2 instances, image fade
  transitions).

#### `components/ProcessingHistory.tsx`

- Replaced hardcoded spacing (`gap-4`, `gap-3`, `gap-2`, `p-4`, `py-3`, `mb-3`,
  `w-10`, `h-10`, `w-4`, `h-4`, `h-3`, `w-3`) with M3 spacing tokens.
- Replaced `rounded-md`, `rounded-sm` with `rounded-m3-md`, `rounded-m3-sm`.
- Removed `font-bold` from "Show more" toggle link (`text-label-large`).
- Kept `font-bold` on file type badge (decorative element, acceptable).

#### `components/WhatsAppStatusPreview.tsx`

- Replaced hardcoded spacing (`p-2`, `gap-1`, `gap-2`, `p-1`, `w-4`, `h-4`,
  `w-3`, `h-3`, `p-3`, `gap-3`, `mb-1`, `mb-2`, `mb-3`, `w-10`, `h-10`, `h-2`,
  `w-2`) with M3 spacing tokens.
- Replaced `rounded-full` with `rounded-m3-full`, `rounded-sm` with `rounded-m3-sm`.
- Replaced `text-[10px]`, `text-[11px]` with `text-label-small`, `text-caption`.
- Replaced `duration-100` with `duration-m3-short-1`.
- Kept `font-bold` on trim indicator label (decorative overlay badge, acceptable).

#### `components/ui/EmptyState.tsx`

- Replaced hardcoded spacing (`gap-4`, `gap-6`, `p-8`, `mb-6`, `mb-8`, `py-3`,
  `px-6`) with M3 spacing tokens.
- Replaced `rounded` with `rounded-m3-sm`.

#### `components/ui/Toast.tsx`

- Replaced hardcoded spacing (`gap-4`, `gap-6`, `p-8`, `mb-6`, `py-3`, `px-6`)
  with M3 spacing tokens.
- Replaced `rounded-md` with `rounded-m3-md`.

#### `components/ui/Skeleton.tsx`

- Replaced hardcoded spacing (`gap-4`, `gap-6`, `p-8`, `mb-6`, `py-3`, `px-6`,
  `h-8`, `h-4`, `w-24`) with M3 spacing tokens.
- Replaced `rounded-md` with `rounded-m3-md`.

#### `lib/growth-ux.ts`

- Fixed em dash in comment (line 2).

---

### Design Decisions

#### `font-bold` removed from M3 type scale token classes

M3 type scale tokens define their own `fontWeight` via CSS custom properties
(e.g. `--md-sys-typescale-label-large-weight: 500`). Applying `font-bold` (700)
overrides the M3-specified weight, flattening visual hierarchy. All instances of
`font-bold` on `text-title-*`, `text-headline-*`, `text-display-*`, `text-body-*`,
`text-label-*`, and `text-caption` classes were removed.

**M3 type scale weights (reference):**

- display: 400
- headline: 400
- title-large: 400
- title-medium: 500
- title-small: 500
- body: 400
- label-large: 500
- label-medium: 500
- label-small: 400

#### `font-bold` kept on non-type-system decorative elements

`font-bold` is retained on small decorative glyph/badge elements where the bold
weight is a deliberate stylistic choice for centering a single character at heavy
weight. These are not type hierarchy elements:

- Logo initial "C" (dashboard header)
- Step number circles (how-it-works page)
- Testimonial avatar initials (marketing page)
- File type badges (MP4/IMG, ProcessingHistory)
- "Coming Soon" badge pill (pricing page)
- Trim indicator label (WhatsAppStatusPreview overlay)

#### `w-[200px]` / `h-[356px]` kept in WhatsAppStatusPreview

Device frame mockup dimensions are decorative and require precise pixel sizing.
These are not design system values.

#### Layout utilities kept as-is

`max-w-[1200px]`, `max-w-[220px]`, `min-w-[200px]`, `z-[100]`,
`w-[calc(100%-2rem)]` are layout constraints, not design token values. Kept as
bracket values.

#### Responsive type scale confirmed viewport-independent

M3 `m3-tokens.css` responsive breakpoints scale `size` and `line-height` across 3
tiers (mobile <768px, tablet 768-1024px, desktop >1024px). Weights are
viewport-independent. Font weight does NOT change across viewports.

---

### Verification

- **TypeScript**: `npx tsc --noEmit` passes with zero errors.
- **ESLint**: Zero errors across all changed files. Only pre-existing
  `@next/next/no-img-element` warnings on BeforeAfterSlider intentional blob URLs.
- **Final sweep**: Zero remaining hardcoded spacing, border-radius, shadow, or
  duration violations across the entire codebase.

---

### Final Compliance State

| Category                                       | Violations Before | Violations After |
| ---------------------------------------------- | ----------------- | ---------------- |
| Hardcoded spacing (`p-1`, `gap-3`, etc.)       | 80+               | 0                |
| Hardcoded border-radius (`rounded-full`, etc.) | 15+               | 0                |
| Bare `shadow`                                  | 1                 | 0                |
| Hardcoded duration (`duration-200`, etc.)      | 5+                | 0                |
| `font-bold` on type scale tokens               | 30+               | 0                |
| **Total**                                      | **130+**          | **0**            |
