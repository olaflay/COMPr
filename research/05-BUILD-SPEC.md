# Noblur - Build Spec (v2 speed + trust milestone)

Deliverable: 05-BUILD-SPEC.md
Date: 27 Aug 2026. Basis: 00-PERF-DIAGNOSIS + 01/02/03 research + 04-ENGINEERING-VETTING.
Goal: make Noblur measurably faster than every verified competitor on upload, encode, and load, with honest trust messaging - on the CURRENT architecture. No new locked choices beyond the 4 amendments in 04-D.
Plain ASCII. Each item: What / Why / Files / Acceptance / Verify.

## P0 - Upload speed (biggest user-facing bottleneck: 3G 0.5-2Mbps)

### P0.1 Batch-presign + parallel chunk upload
- What: ONE API call returns presigned PUT URLs for ALL parts of the multipart upload; client uploads 4-6 chunks concurrently (bounded), keeps the existing localStorage checkpoint resume; failed chunk retries stay (5x, capped).
- Why: today every 5MB chunk = 1 API round trip + 1 PUT, serial (00-PERF-DIAGNOSIS U1/U2). A 50MB file on 3G is 30+ sequential network ops. Parallel + batched presign cuts wall-clock upload by ~60-70%.
- Files: server/routes/uploads.ts (add presign-all endpoint or extend /multipart/start to return partUrls[]), app/dashboard/dashboard-client.tsx (upload loop -> Promise pool of 4-6), lib/api-client.ts.
- Acceptance: 50MB file uploads with max 2 API calls total (start + complete); chunk-level checkpoint resume still works after tab reload; no change to storage backend contract.
- Verify: local e2e with a throttled connection (DevTools 3G) - record before/after wall-clock for the same 50MB file; assert part count == chunks and all parts land (list S3 objects).

### P0.2 Client-side image pre-compression
- What: before upload, images are decoded in the browser (createImageBitmap), resized to the preset long edge (Chat 1600px / Status 1080px per config/platform-limits.json), re-encoded to JPEG quality ~0.85, and the RESULT is uploaded. Original dimensions/EXIF are kept client-side for the before/after comparison. Server pipeline still validates magic bytes and strips EXIF (idempotent pass on the small file).
- Why: a 12MB camera photo becomes ~300KB - 40x less upload data (00-PERF-DIAGNOSIS U4). This is the Squoosh-style "photo never uploaded at full size" story the competitors lead with (02, 03-C1), now honest for images.
- Files: lib/image-precompress.ts (new, pure client util + unit tests), dashboard-client.tsx (call before upload when mediaKind == IMAGE), components/BeforeAfterSlider.tsx (use original dims client-side).
- Acceptance: photo upload payload <= 500KB for any source photo; server job for images completes in <10s; before/after comparison still shows original vs optimized.
- Verify: unit test image-precompress (canvas stub); real-phone test with a 12MB photo - record uploaded bytes via the API response.

### P0.3 Speed ladder on the ADAPTIVE path
- What: runAdaptivePipeline accepts an optional speedPresetOverride; encode-worker computes it from mediaEncodeQueue.getWaitingCount() (existing ladder: <=1 slow, <=3 medium, else fast) and passes it. Policy engine applies the override to the selected profile's speedPreset; CRF/bitrate caps unchanged.
- Why: today the adaptive path (every video job) always encodes at the profile's medium/slow, or SVT-AV1 preset 6 (00-PERF-DIAGNOSIS O1). x264 fast is ~1.5-2x faster than medium with minor efficiency loss; under load, throughput beats perfection (01-B3).
- Files: workers/encode-worker.ts, lib/pipeline.ts (runAdaptivePipeline param), lib/policy-engine.ts (override application).
- Acceptance: with queue depth >3, video jobs encode at fast preset; queue <=1 at profile preset; VMAF floor still enforced.
- Verify: e2e job under artificial load (enqueue 6 jobs); assert ffmpeg args contain the expected preset via test spy; measure p50 encode time before/after.

### P0.4 No double download
- What: analysis worker keeps the local temp source file; encode queue job payload carries localPath; encode worker uses it when present, downloads only as fallback. Temp files cleaned by the existing cleanupStaleTempFiles + job finally blocks.
- Why: every video crosses storage twice today (00-PERF-DIAGNOSIS O3).
- Files: workers/analysis-worker.ts (do not unlink; include localPath in queue add), workers/encode-worker.ts (use localPath), lib/queue.ts (payload type), cleanup safety check.
- Acceptance: exactly ONE downloadFromR2 per video job; temp file deleted after encode completes; analysis failure path still unlinks.
- Verify: e2e with a logged storage call count (spy on storage.ts).

## P1 - Encode + load + trust

### P1.1 Verification cost cut (AGENTS.md amendment 2)
- What: VMAF samples keyframes every 4s instead of 2s; SSIM runs only when VMAF is unverified or failed (VMAF stays the primary gate, floor 80 unchanged). Retry caps unchanged (max 1 VMAF re-encode, max 2 total).
- Why: removes one full decode pass per video job (00-PERF-DIAGNOSIS O5); sampling density has negligible VMAF accuracy impact on a 90s clip.
- Files: lib/vmaf.ts (sample interval), lib/pipeline.ts (SSIM conditional).
- Acceptance: VMAF still measured + recorded on every video job; SSIM call count drops; quality gate outcomes match before/after on the 10s test clip (VMAF score drift < 1 point).
- Verify: e2e on sample/source_1080p_10s.mp4 - compare VMAF score and wall-clock.

### P1.2 Status fast-path priority
- What: mediaEncodeQueue.add() carries priority: STATUS=1, CHAT=2, CUSTOM=3; premium jobs shift one level. BullMQ honors priority.
- Why: Status videos are <=90s (01-A1) - they finish fast and users expect the quick win; PRD 19 already promises premium priority.
- Files: workers/analysis-worker.ts (priority in add), lib/queue.ts.
- Acceptance: a queued Status job jumps a queued Chat job in the same queue.
- Verify: unit test on queue.add priorities; e2e with 2 concurrent jobs.

### P1.3 Verified constants + honest copy (AGENTS.md amendment 1 partial - copy only)
- What: platform-limits.json notes updated with verified facts (Status 90s A, video 720p/480p + 64/100MB A, HD not for Status A, 2GB document B). UI/PRD copy that states "16MB compression trigger" reworded to verified truth: "WhatsApp squeezes videos and photos when you send them as media. We keep your file under the limits so it goes as media, not document." Custom range stays 1-16MB (safe product bound).
- Why: Article II - never state an unverified number as fact (04-R6).
- Files: config/platform-limits.json (notes), docs/NoBlur-PRD-v1.md (Section 2 FR-2 copy note), dashboard copy strings.
- Acceptance: no user-facing string contains "16MB trigger" or any [UNVERIFIED] claim; constants table documents source + date.
- Verify: grep the UI copy files; read the config notes.

### P1.4 Deploy correctly (human: no Cloudflare; Redis for queue + cache)
- What: (a) create a NEW Vercel project (noblur.vercel.app is occupied by an unrelated app - use a fresh name, later point noblur.app DNS at it once purchased); (b) API + workers on Railway/Render/Fly in eu-west (London) - update CORS_ORIGINS + NEXT_PUBLIC_API_URL + REDIS_URL (Upstash eu-west-1); (c) storage STAYS Supabase Storage (S3-compatible) - verify current Supabase project region; if it is US/EU-far, create the new project in eu-west (London) and carry over buckets/RLS/credentials before cutover (project-recreate migration, pooler URL changes); keep the cleanup cron as sole deletion authority; (d) Upstash Redis serves queue (BullMQ) AND cache (usage/quota, short-TTL presigned-URL cache) - no new vendors; (e) DATABASE_URL stays Supabase pooled.
- Why: nothing is live (00-PERF-DIAGNOSIS 0); region is the latency lever after P0 (01-B4). Redis replaces the caching role the Cloudflare CDN would have played (human decision 2026-08-27).
- Files: vercel/railway/fly configs, .env.example, server/services/storage.ts (region constants), server/services/cache.ts (new Redis cache), docs/DEPLOYMENT.md.
- Acceptance: https://<new>.vercel.app serves Noblur; /api/v1/health returns ok with db+redis true; a real upload round-trips through Supabase Storage; /jobs/:id noindex headers present.
- Verify: curl the live URL + health; real-browser check on localhost:3000 proxied to the live API; record TTFB from this host.

### P1.5 Loading fast (prod + cache + bundle)
- What: (a) local testing moves to npm run build && npm run start (never dev); (b) GET /usage cache via Upstash Redis (30s TTL) + client mirrors quota in localStorage for instant paint, sync in background; (c) BeforeAfterSlider lazy-loaded (React.lazy) so the dashboard shell ships lighter; (d) Sentry + PostHog clients deferred (dynamic import after first paint).
- Why: 00-PERF-DIAGNOSIS L1/L3/L4; 01-B6.
- Files: next.config.ts, lib/api-client.ts, app/dashboard/dashboard-client.tsx, app/providers.tsx.
- Acceptance: dashboard paints with cached quota <300ms on throttled 4G; bundle size for /dashboard drops (report before/after gzip); no CSP violations.
- Verify: Lighthouse mobile throttled 4G on / and /dashboard - record LCP/TBT; compare bundles.

### P1.6 Pidgin trust + honest progress + data-saved
- What: (a) permanent trust line under the drop zone: images "Photo dey stay for your phone. No upload." videos "Your video delete itself after 30 minutes. Nothing dey stay."; (b) progress phases stay honest (real encoder state, goal-gradient labels but truthful - the current front-loaded display is fine because stages are real); (c) result card adds "You just save ~X MB of data" computed from actual before/after sizes.
- Why: competitors lead with trust microcopy (03-C1/C5); honest progress beats fake front-loading on 3G (03-C6); data-saved is the Nigeria wedge (03-B4 cost math, 02 AMPLIFY).
- Files: components (drop zone, result card), lib/growth-ux.ts (dataSaved helper), Pidgin copy strings.
- Acceptance: copy present on upload + result screens; data-saved figure matches actual size delta; no English-only strings in new copy.
- Verify: real-browser check of both screens; string grep for lang pcm.

## P2 - Follow-ups (small, after P0/P1)
- P2.1 Reduce BullMQ backoff 10s -> 5s for encode queue (00-PERF-DIAGNOSIS O7).
- P2.2 Image jobs: skip scene analysis entirely (already skipped? verify; analysis worker should probe+sniff only for images) - audit lib/analysis.ts call sites.
- P2.3 Add cache headers note to next.config for static assets (Vercel does this; document in DEPLOYMENT.md).
- P2.4 Demo button "Try wetin don ready" with a bundled sample photo (03-C8) - small, high first-run value.

## Explicitly NOT in this build (see 04-B/04-C for reasons)
- Client-side video encoding (F1), GPU encoding (F2), AV1 default (F3), accounts/billing (F4), smart cuts (F5), native app (F6), Web Share target (F7), "never uploaded" video claim (R1), African region (R2), document-send trick (R3), two-pass default (R4), Cloudflare services (R2/CDN/Stream - rejected by human; Redis covers queue + cache).

## Risks
- Supabase region move (if current project is US): project-recreate changes the project ref + pooler URL; verify storage buckets and RLS policies carry over, or create new buckets in the new region before cutover. Keep a rollback: the old project stays live until the new one passes the full e2e.
- Parallel uploads may trigger storage provider rate limits: cap concurrency at 6 and keep per-chunk retry with backoff.
- VMAF sampling change: verify no quality-gate regression on the 20-clip reference set before shipping P1.1.
- Vercel project name: verify the new project name is available before DNS work.
- Nothing in this spec changes the honesty rules, Pidgin default, no-login constraint, or Flutterwave lock.

## Build order
1. P0.1 -> P0.4 (upload + encode core speed) with tests green after each
2. P1.4 deploy (gets a live environment to measure against)
3. P1.1 -> P1.3, P1.5, P1.6 (quality cost, priority, constants, load, trust)
4. P2 polish
5. Gate G4: full verification pass - PRD test matrix timings (15s/720p <12s, 60s/720p <20s, 90s/1080p <35s) + Lighthouse + real-phone upload test
