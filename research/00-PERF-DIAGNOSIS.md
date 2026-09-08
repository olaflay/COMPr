# Noblur - Performance Diagnosis (evidence-based)

Date: 2026-08-27
Method: live checks (curl), code reading, git log. No assumptions without evidence.
Audience: product owner (non-coder). Plain ASCII.

## 0. The headline

Noblur is NOT deployed anywhere. The two URLs the docs point to serve
something else or nothing:

- https://noblur.vercel.app -> HTTP 200, but the page is "ISA EDITOR -
  Batch Blur & Denoise", an Indonesian tool (lang="id", lynk.id link).
  NOT Noblur. [A - direct fetch]
- https://noblur-api.up.railway.app -> HTTP 404 "Application not found"
  (Railway host routing). No API deployed. [A - direct fetch]
- https://noblur.app -> DNS does not resolve (000). Domain not pointed. [A]

So "slow loading" today is mostly local dev mode (`npm run dev` compiles
routes on first visit - famously slow), plus real architectural problems
below that would make a production deploy slow too. Fix the architecture
first, then deploy.

## 1. Slow loading - causes

| # | Cause | Evidence | Severity |
|---|-------|----------|----------|
| L1 | Nothing deployed; user tests in `next dev` (on-demand compile, slow first paint) | README quick start = npm run dev; live URLs serve other apps/dead | HIGH |
| L2 | Database + storage are in a US/EU Supabase region, far from Lagos (200-350ms RTT per query). .env comment literally says region is a "best guess" | .env SUPABASE_S3_REGION comment; Supabase has no African region | HIGH |
| L3 | Dashboard is one heavy client component: M3 tokens + Tailwind + Sentry + PostHog + BeforeAfterSlider all in the initial bundle; multiple API calls on mount (usage, history) | app/dashboard/dashboard-client.tsx; providers.tsx; next.config.ts | MEDIUM |
| L4 | GET /usage cache only 5s TTL (added 2026-08-24), still a network round trip per page load through the cross-origin API | git 04c1441 | MEDIUM |
| L5 | Marketing pages: no explicit cache headers (only /jobs gets no-store). Depends on Vercel defaults | next.config.ts headers() | LOW |

## 2. Slow uploading - causes

| # | Cause | Evidence | Severity |
|---|-------|----------|----------|
| U1 | Per-chunk presign round trips: for EVERY 5MB chunk the client calls the API (Fastify -> Supabase S3 presign) then PUTs the chunk. A 50MB file = 10 chunks x (1 API call + 1 PUT), each API call is 1-2 RTTs to a far-away API + far-away storage. On 3G this is 30+ sequential network ops | app/dashboard/dashboard-client.tsx lines ~211-300 (multipart/start, multipart/presign-part per chunk, sequential loop) | HIGH |
| U2 | Chunks upload SEQUENTIALLY (one at a time) | dashboard-client.tsx upload loop | HIGH |
| U3 | Region guess risk: if S3 region constant is wrong, every presign PUT fails and retries 5x per chunk | .env comment "Region is a best guess"; client retry loop (5 attempts/chunk) | HIGH |
| U4 | No client-side pre-compression: raw 50MB camera file uploads in full. Images (5-15MB) upload in full before being shrunk server-side | app/dashboard; lib/file-validation.ts | MEDIUM |

## 3. Slow optimization - causes (the worst area)

| # | Cause | Evidence | Severity |
|---|-------|----------|----------|
| O1 | The queue-depth speed ladder (fast/1-pass vs slow/2-pass) only applies to the LEGACY fallback path. The ADAPTIVE path (the default for every video job) always encodes at the profile's speedPreset: x264 `medium` or `slow`, or SVT-AV1 preset 6 | workers/encode-worker.ts (cpuPreset/passCount passed only to runPipeline fallback); config/encoding-profiles.json (whatsapp_hd_* = preset slow; av1_document_* = preset 6) | HIGH |
| O2 | AV1 (SVT-AV1 preset 6) on a small CPU worker is extremely slow (minutes for a 60s clip). It is the PRIMARY codec on the document/preview path | config/encoding-profiles.json; FR-16 | HIGH |
| O3 | Double download: analysis worker downloads the source from storage, probes it, DELETES the temp file. Encode worker downloads the SAME file again. Every video crosses the network twice | workers/analysis-worker.ts (unlinkSync in finally); workers/encode-worker.ts (downloadFromR2 again) | HIGH |
| O4 | Scene analysis runs Python + OpenCV (face/text detection on sampled frames) for EVERY video job before encoding, even when the queue is busy | lib/analysis.ts (opencv_analyze.py); lib/pipeline.ts runAdaptivePipeline step 1 "Analyze scene" | HIGH |
| O5 | Verification stack per video job: size check + VMAF (decode + libvmaf on sampled keyframes) + SSIM measure (another decode pass). Then up to 2 retries (size-triggered, quality-triggered, VMAF CRF-3 re-encode). Each retry = full re-encode | lib/pipeline.ts (runPipeline: measureSSIM; runAdaptivePipeline: VMAF gate + retries); lib/vmaf.ts; FR-7 | HIGH |
| O6 | Encode concurrency = max(1, cpus()/2) with lockDuration 60s. On a 2-vCPU host = 1 concurrent encode. Two-pass slow encodes queue up | workers/encode-worker.ts tail | MEDIUM |
| O7 | BullMQ attempts:3 + exponential backoff 10s on both queues; transient storage errors add minutes of silent waiting | lib/queue.ts | MEDIUM |
| O8 | 5-minute video job timeout can be exceeded by slow + 2-pass + retries on 1080p/90s clips -> user sees FAILED after waiting | PRD section 19 | MEDIUM |
| O9 | Storage = Supabase S3 (no edge), so worker downloads/uploads go over the public internet to a US/EU region | .env; server/services/storage.ts | MEDIUM |

## 4. Slow everything - systemic

- No African compute/storage region anywhere in the stack (DB, Redis,
  storage, API, workers all US/EU). Lagos users pay 200-400ms RTT per hop.
- Frontend stack weight: Next.js 15 + React 19 + Tailwind + M3 + Sentry +
  PostHog on a mid-range Android over 3G.
- No CDN involvement in upload/download paths.
- Workers and API are TypeScript run via node --experimental-strip-types
  (fine) but the whole pipeline is CPU-bound FFmpeg on small hosts.

## 5. What CAN be done (candidate fixes, ordered by expected impact)

1. Upload: batch-presign all chunk URLs in ONE API call; upload chunks in
   parallel (2-3 concurrent); keep the localStorage checkpoint resume.
   Expected: 50MB upload on 3G goes from ~minutes+ of serial ops to ~1/3
   the time.
2. Upload: pre-compress images client-side (canvas resize to 1600px long
   edge before upload). A 12MB photo becomes ~300KB. 40x less upload data.
3. Optimize: make the speed ladder apply to the adaptive path (pass
   queue depth in; fast preset under load). Kill AV1 as default for MVP
   (keep x264 medium; AV1 only for the document path, deferred).
4. Optimize: delete the double download (analysis worker keeps the temp
   file / hands the local path to the encode step on the same host).
5. Optimize: make scene analysis queue-aware and cheaper (ffprobe-only
   when busy; skip OpenCV for images; cap sampled frames at 12).
6. Optimize: single verification pass (SSIM sampled at 2s intervals is
   enough; run VMAF only when SSIM fails or on the document path; cut
   re-encode retries from 2 to 1 unless size is the goal).
7. Loading: deploy a production build (next build + next start) instead
   of dev; move DB/storage to the closest available region (eu-west
   London for Supabase today, or evaluate Fly.io Johannesburg for API +
   workers); extend usage cache TTL and mirror quota in localStorage for
   instant paint.
8. Loading: split the dashboard bundle (lazy-load BeforeAfterSlider),
   defer analytics, add cache headers to marketing pages.
9. Deploy: fix the actual deployment (Vercel project is serving a
   different app; Railway API is dead). Evaluate Fly.io af-jnb for
   API+workers as the single biggest latency lever for Lagos users.
10. UX (from competitor research, pending): one-tap share, before/after,
    trust microcopy - already in PRD; align to research findings.

## 6. What WILL be done (commit to this after Gate 1)

Pending research results (3 subagents in flight: competitive teardown,
performance playbook + WhatsApp constants, market/UX brief). The final
fix list will be merged into the refined PRD and a build plan. The
sequence: fix upload path -> fix encode path -> fix loading path ->
deploy correctly -> verify with real timings.

## 7. Verification method (how we prove it is fast)

- Upload: time a 50MB upload from this host to the target storage; repeat
  5x; report p50/p95.
- Optimize: run the PRD test matrix (15s/720p <12s, 60s/720p <20s,
  90s/1080p <35s) on the real worker host and quote real seconds.
- Load: Lighthouse mobile on a throttled 4G profile for / and /dashboard;
  report LCP/TBT/TTI.
- All before/after numbers in the gate submission, never on paper.
