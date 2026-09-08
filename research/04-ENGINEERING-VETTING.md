# Noblur - Engineering Vetting (research -> build decisions)

Deliverable: 04-ENGINEERING-VETTING.md
Date: 27 Aug 2026. Engineer: CTO/Architect role (Company OS), research loaded from 00-04.
Every item: verdict (APPLY NOW / FUTURE SCOPE / REJECT), technical reason, evidence ref, confidence grade.

## Verdict legend
- APPLY NOW = works with the current stack (Next.js + Fastify + BullMQ/Redis + FFmpeg + Supabase->R2), high impact, spec'd in 05-BUILD-SPEC.md
- FUTURE SCOPE = real value but too much cost/complexity for this build; marked with trigger condition
- REJECT = not possible under current constraints or not worth it

## A. APPLY NOW

| ID | Finding | Technical reason it works now | Evidence | Grade |
|----|---------|------------------------------|----------|-------|
| S1 | Batch-presign + parallel chunk upload | Multipart infra already exists (dashboard-client.tsx: multipart/start, presign-part). Change = ONE new API call returning all part URLs + client loop uploads 4-6 chunks concurrently. Cuts 30+ serial network ops to ~7 for a 50MB file on 3G. | 00-PERF-DIAGNOSIS U1/U2; 01-B4 | A |
| S2 | Client-side image pre-compression (canvas resize + JPEG quality) before upload | Canvas/ImageBitmap are built into every browser; a 12MB photo becomes ~300KB before it leaves the phone. Server image pipeline still runs (idempotent, ~1s on small input) so quota/funnel/history stay intact. Doubles as the Squoosh-style "photo never uploaded at full size" story. | 00-PERF-DIAGNOSIS U4; 02 EMULATE; 03 C1 | A |
| S3 | Speed ladder applied to ADAPTIVE path (queue depth -> override profile speedPreset) | runAdaptivePipeline already takes params; pass cpuPreset override derived from getWaitingCount() (the ladder logic exists in encode-worker for the legacy path - reuse it). x264 fast ~1.5-2x faster than medium, ultrafast 5-10x vs medium (B3). | 00-PERF-DIAGNOSIS O1; 01-B3 | A |
| S4 | Kill double download (analysis worker keeps temp file, hands local path to encode worker) | Same host workers share TEMP_DIR; change queue payload to carry localPath. Removes a full storage download per video job. | 00-PERF-DIAGNOSIS O3 | A |
| S5 | Verification cost cut: run SSIM only when VMAF fails/unverified; VMAF sample every 4s | Both metrics already exist (lib/vmaf.ts, lib/ssim.ts). Reordering keeps the VMAF primary gate (AGENTS.md lock) but removes a full decode pass per job. Sampling change = AGENTS.md amendment, flagged at gate. | 00-PERF-DIAGNOSIS O5; 01-B3 | B |
| S6 | Queue priority: Status jobs fast-path (90s cap = short jobs), premium > free | BullMQ supports priority natively; one line in analysis-worker.ts add(). PRD 19 already promises premium priority. | 01-B5; PRD 19 | A |
| S7 | Constants + copy alignment to VERIFIED WhatsApp facts | Config table exists. Verified: Status 90s (A), video 720p/480p + 64/100MB caps (A), HD not for Status (A), 2GB document limit (B). The PRD/copy claim "16MB compression trigger" is [UNVERIFIED] - keep 16MB as a safe product bound but fix the stated REASON in copy to verified facts. | 01-A1..A4; 03-A1 | A |
| S8 | Deploy correctly: new Vercel project (noblur.vercel.app is occupied by a different app), API+workers in eu-west (London = best verified Lagos latency route), storage STAYS Supabase Storage (S3-compatible; human rejected Cloudflare 2026-08-27 - Supabase project to eu-west region at deploy if currently US), Upstash Redis eu-west as queue AND cache | Pure deployment/infra change. Nothing is live today (00-PERF-DIAGNOSIS 0). Redis (already in stack) covers the caching role; upload speed comes from S1 parallel chunks, not edge storage. | 00-PERF-DIAGNOSIS 0/L2; 01-B4 | B |
| S9 | Loading: production build, usage cache 30s + localStorage mirror, lazy-load BeforeAfterSlider, defer Sentry/PostHog | All frontend-only changes. Dashboard paints instantly from localStorage quota, then syncs. | 00-PERF-DIAGNOSIS L3/L4; 01-B6 | B |
| S10 | Pidgin trust + honest progress + data-saved messaging | Copy change only. "Photo dey stay for your phone" (images), "Your video delete itself after 30 minutes" (videos), honest phase labels, "You just save ~70MB data" on result card. | 03-C1/C6; 02 AMPLIFY | A |

## B. FUTURE SCOPE (real value, not now - trigger conditions)

| ID | Finding | Reason deferred | Trigger |
|----|---------|-----------------|---------|
| F1 | Client-side video encoding (WebCodecs / ffmpeg.wasm) | ffmpeg.wasm = 10-20MB download + 2-8x realtime on mid-range Android = still slow for 90s clips; battery drain; VMAF quality gate impossible client-side. Images already get the client-side treatment (S2). | When >50% users are on 4G+ and demand "no upload" for videos |
| F2 | GPU/hardware encoding server-side (MediaConvert, GCP Transcoder, NVENC hosts) | Real cost (~$0.01-0.02/min) with near-zero current volume. x264 fast/medium on eu-west workers covers MVP. | When job volume makes GPU cheaper than CPU time, or premium tier justifies it |
| F3 | AV1 as default codec (document path) | SVT-AV1 preset 6 on 1-2 vCPU = minutes per clip (4-8x slower than x264); low-end Android decode risk. Code + profiles stay, default flips to H.264 everywhere. [AGENTS.md locked - gate item] | GPU workers (F2) or measured idle capacity |
| F4 | Accounts, auth, Flutterwave billing | Already Phase 2 in PRD. | Phase 2 |
| F5 | Scene-aware smart cuts for Status splitting | Already Phase 2 in PRD. | Phase 2 |
| F6 | Native app / Play Store release | PWA is the right distribution for 82.5% Android + data costs; app stores add review friction. | Post-launch retention data |
| F7 | Web Share API native share target | wa.me works on every device today; share-target needs install + Android/iOS quirks. | Phase 3 |
| F8 | "Never uploaded" privacy claim for VIDEOS | Impossible while server-side (R1). | When F1 ships |
| F9 | Instagram/Telegram preset families, AI upscale | Phase 3 per PRD. | Phase 3 |

## C. REJECT (not possible / not worth it)

| ID | Finding | Why rejected | Grade |
|----|---------|--------------|-------|
| R1 | Claim "never uploaded" for video processing | Not possible with server-side encode architecture; claiming it would violate AGENTS.md Rule 1 (honesty) and the Constitution's no-fabrication law. Honest alternative: S10 auto-delete promise. | A |
| R2 | African cloud region for DB/storage | Does not exist for Supabase/Upstash/Railway; AWS af-south-1 (Cape Town) is farther from Lagos than London on the major cable routes (Lagos-London ~75-90ms). Best achievable = eu-west + Cloudflare edge PoP (Lagos has one). | B |
| R3 | "Bypass WhatsApp compression" via document-send trick as a feature | Document-send loses inline preview (verified user pain, 03-A2); would break the product's honesty rules and risks trademark/ToS problems. | A |
| R4 | Two-pass encoding as default | Single-pass CRF is 1.2-1.5x faster with size-retry convergence (2% margin already tuned in lib/bitrate.ts); two-pass only when idle (legacy ladder already does this). | B |
| R5 | Matching 100% local processing for video (Squoosh-style) | Not now - F1. Images yes (S2). | A |
| R6 | The "16MB WhatsApp compression trigger" as a marketing claim | [UNVERIFIED] - no primary source. Verified facts: 720p/480p caps, 64/100MB video limits, 2GB documents. Never publish the unverified number as fact. | A |

## D. Locked-choice amendments (APPROVED by human 2026-08-27: "change any locked decision that is not good")
1. AV1 primary on document path -> H.264 everywhere for MVP (F3). AV1 profiles preserved in config for future GPU/idle use. [human approved]
2. VMAF sampling middle-5s -> sampled keyframes every 4s (S5). Floor 80 unchanged. [human approved]
3. Cloudflare R2 -> Supabase Storage STAYS (S3-compatible). User rejected Cloudflare; Redis (Upstash) is queue + cache. Supabase project region -> eu-west (London) at deploy if currently US. [human approved]
4. Hosting: Vercel FE + Fastify API/workers on Railway/Render/Fly in eu-west; Upstash Redis eu-west for queue + cache. [human approved]
5. No other locked choices touched. Pidgin copy, no-login, Flutterwave, honesty rules all preserved.
