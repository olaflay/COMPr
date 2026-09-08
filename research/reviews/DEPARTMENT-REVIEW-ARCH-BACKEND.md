# Department Review - Noblur Build Spec (05-BUILD-SPEC.md) - PRE-GATE

Date: 27 Aug 2026
Artifact: DEPARTMENT-REVIEW-ARCH-BACKEND.md
Reviewed by: Architect, Backend, Research Office (Company OS roles, one agent)
Target: 05-BUILD-SPEC.md (v2 speed + trust milestone) - input to Gate 4 approval
Method: every claim graded A-F with source per Company OS rules; [UNVERIFIED] where no source exists.
Scope: per-department needs, per-department adds/amendments, joint ONE-BUTTON-TO-OUTPUT flow review, verify list.

## 0. Gate posture (bottom line up front)

The spec is fundamentally sound: P0.1 batch-presign + parallel upload, P0.2 image
pre-compression, P0.3 ladder on the adaptive path, and P1.2 priority are the right
levers, and the locked amendments (H.264 everywhere, VMAF 4s, no Cloudflare, Supabase
storage) are consistent with the evidence. BUT the spec as written cannot be approved
as-is. Four problems are gate-blocking:

1. HONESTY VIOLATION (Research Office): P1.6 copy "Photo dey stay for your phone.
   No upload." for images is FALSE - P0.2 uploads the pre-compressed image to the
   server. "Your video delete itself after 30 minutes" is also FALSE - outputs are
   retained 24h (PRD 22). Both need exact replacement copy. [05 P1.6 vs 05 P0.2,
   PRD 22 - A]
2. QUEUE HAZARD (Architect/Backend): BullMQ lockDuration is 60s (00-O6) but a
   90s/1080p encode at preset slow + VMAF + a retry can run 2-5 min. BullMQ marks
   jobs past lockDuration as stalled and ANOTHER worker re-runs them - double encode,
   duplicate output, doubled cost. lockDuration must scale with the worst-case job.
   [00-O6 - A; BullMQ stalled semantics - B/C]
3. CONTRADICTORY GATE TARGETS (Architect): the PRD matrix (90s/1080p <35s) is
   unreachable at the ladder's low-depth default (preset slow, 00-O1/O6, 05 P0.3) on
   a 2-vCPU worker. Gate G4 would fail on a target the spec's own ladder makes
   impossible. Re-baseline with measured numbers. [PRD 5 vs 05 P0.3 - A]
4. SCALABILITY ASSUMPTION (Architect): P0.4 no-double-download hands a localPath
   between queues. That only holds while analysis + encode run on ONE worker host.
   PRD 10 requires horizontal scaling with stateless workers; the moment a second
   host joins, localPath is a lie and jobs must re-download. P0.4 needs a conditional
   fallback, not "exactly ONE download". [05 P0.4 vs PRD 10/17 - A]

Recommended: APPROVE WITH CONDITIONS (fix 1-4 as specified in section 2, run the
VERIFY list in section 4 at G4). Do not pass the gate on the current P1.6 copy or
the current lockDuration.

---

## 1. What the product NEEDS - per department

### 1.1 Architect lens

Needs (one line each, graded):

- N-ARCH-1: Every network hop in the flow must be measured at Lagos RTT before the
  gate - the .env region comment "best guess" is a known landmine (00-U3, 00-L2) [A].
- N-ARCH-2: The upload path must be optimized against the honest floor of 3G
  bandwidth (0.5-2 Mbps, 50MB = 5-10 min, 01-B4), not against round-trip count alone;
  parallel chunks cut RTT overhead, not physics [A].
- N-ARCH-3: The encode path's worst case (slow preset + VMAF + 2 retries) must fit
  inside the job timeout and the queue lock, or jobs silently fail or double-run [B].
- N-ARCH-4: The job state machine must have no orphan states - QUEUED with no queue
  entry, stalled encodes, half-uploaded multipart objects - each with a defined
  recovery [A].
- N-ARCH-5: No new vendor or SPOF beyond the locked stack (Vercel + Fastify +
  BullMQ/Upstash + Supabase + FFmpeg workers, 04-D3/D4) [A].
- N-ARCH-6: Gate acceptance numbers must be reachable by the spec's own design -
  the matrix (PRD 5) and the ladder defaults (05 P0.3) must not contradict [B].

### 1.2 Backend lens

Needs (one line each, graded):

- N-BE-1: Server-side truth on every file: magic-byte sniff, real size vs claimed
  sizeBytes, server-owned storage keys - never trust client metadata (AGENTS 15,
  PRD 23) [A].
- N-BE-2: Upload completion must be idempotent and retry-safe - a retried
  CompleteMultipartUpload must not error the job (S3 semantics) [A].
- N-BE-3: Explicit 3G timeout/backoff policy on every chunk PUT - framework defaults
  (~30s) will kill 5-8MB chunks mid-transfer on 3G (01-B4) [A].
- N-BE-4: The quota system must fail deliberately - /usage down must not block real
  users (soft-limit tradeoff is already accepted, PRD 27) [B].
- N-BE-5: Every retry path bounded and classified: max 2 pipeline retries, max 1
  VMAF re-encode, 5 chunk attempts, transient vs permanent classification (PRD 19,
  FR-7) [A].
- N-BE-6: Privacy invariants enforced by tests, not prose: no raw IP, EXIF stripped,
  single deletion writer (cleanup cron sole writer of deletedAt) (AGENTS 12/14/16) [A].

### 1.3 Research Office lens

Needs (one line each, graded):

- N-RO-1: No user-facing number that is [UNVERIFIED] or contradicted by the
  architecture - the 16MB trigger fix (P1.3) is right; the image "No upload" copy
  (P1.6) is wrong (01-A4, 05 P0.2/P1.6) [A].
- N-RO-2: Trust copy must match actual retention behavior - "30 minutes" contradicts
  the 24h output window (PRD 22) [A].
- N-RO-3: One-tap share must actually share the FILE, not only a text link - wa.me
  alone does not match competitor result panels (03-C4) [B].
- N-RO-4: Data-cost framing on every result ("you just save ~X MB") computed from
  real sizes with a defined baseline (03-B4 cost math) [A].
- N-RO-5: A measurable auto-delete promise - the retention claim needs an audit
  test, not a copy string (03-C5) [A].
- N-RO-6: The before/after comparison must not force a full source re-download on
  3G - for video this is currently unaddressed in the spec (03-C7, 01-B4) [B].

---

## 2. ADD / AMEND proposals - per department

Verdict legend: APPLY NOW / FUTURE SCOPE / REJECT. AMEND = item already in
05-BUILD-SPEC, exact change given. Grade = evidence grade.

### 2.1 Architect

| # | Item (verdict) | What / Why / Files |
|---|---|---|
| A-1 | AMEND P0.4 no-double-download (APPLY NOW) | localPath is only valid when analysis and encode run on the SAME worker host. PRD 10 mandates stateless horizontal scaling; a second host cannot see the temp file. Exact change: encode worker MUST stat the localPath before trusting it; if missing, fall back to downloadFromR2 (one download, allowed). Acceptance becomes "storage downloads per video job = 0 when localPath is valid, 1 when not - assert via storage spy". Document that horizontal scale forfeits the optimization until a shared temp store exists (A-7 below). Files: workers/analysis-worker.ts, workers/encode-worker.ts, 05 P0.4 acceptance. Grade A (00-O3, PRD 10/17). |
| A-2 | AMEND P0.1 batch-presign (APPLY NOW) | Two exact changes: (a) part-URL expiry must scale with size and slowest supported link: expiry = max(60 min, ceil(sizeBytes * 8 / 0.5 Mbps)), so a premium 500MB file on 3G (67+ min upload) does not expire mid-upload; (b) the localStorage checkpoint must persist the per-part ETags returned by each PUT so CompleteMultipartUpload can be retried idempotently after tab reload instead of re-uploading. Files: server/routes/uploads.ts (expiry calc), app/dashboard/dashboard-client.tsx (ETag checkpoint). Grade A (01-B4, S3 multipart semantics - C/B). |
| A-3 | ADD enqueue reconciliation sweep (APPLY NOW) | If Redis add fails after the Postgres INSERT, the Job row sits QUEUED forever - BullMQ stalled recovery does not cover "never added". What: a periodic sweep (fold into cleanup cron) re-adds jobs stuck in QUEUED > 2 min, or enqueue-then-commit with compensation. Files: server/routes/jobs.ts, lib/queue.ts, workers/cleanup-cron.ts. Grade A (00 architecture read, PRD 25). |
| A-4 | AMEND job timeout policy (APPLY NOW) | Flat 5-min video timeout (PRD 19) is blown by slow preset + VMAF + retry on 90s/1080p (00-O8). Exact change: tiered timeouts - 5 min for clips <= 60s, 10 min for > 60s or when a re-encode triggers; PRD 31 already lists job timeouts as tunable assumptions, so no locked choice is touched. Files: lib/queue.ts, docs/DEPLOYMENT.md, PRD 19 note. Grade B (00-O8, PRD 31). |
| A-5 | ADD lockDuration fix (APPLY NOW) | GATE-BLOCKING. BullMQ lockDuration is 60s (00-O6). Any encode past 60s is marked stalled and re-processed by another worker: double encode, duplicate output, doubled cost. What: media-encode queue lockDuration >= worst-case job (e.g., 15 min) with extendLocks heartbeat; test stalled recovery on a 90s clip. Files: lib/queue.ts, tests. Grade A (00-O6; BullMQ stalled semantics B/C). |
| A-6 | AMEND gate targets (APPLY NOW) | The PRD matrix (15s/720p <12s, 60s/720p <20s, 90s/1080p <35s) assumes preset fast, but the ladder defaults to slow at low queue depth (05 P0.3, 00-O1) - on 2 vCPU, slow 1080p is 2-3x slower than fast. Exact change: re-baseline the matrix per preset from real measured p50/p95 on the target worker class, OR make the ladder default medium and set matrix numbers at fast-preset conditions. Gate G4 must not fail on a target the spec's own design cannot reach. Files: PRD 5 note, 05 Gate G4 line, docs/DEPLOYMENT.md. Grade B (00-O1/O6, 01-B3 C). |
| A-7 | ADD video before/after frames (APPLY NOW) | The before/after comparison is the result-card centerpiece (02, 03-C7), but for VIDEO the source frame is only available if the client still holds the blob (tab reload kills it) or the user re-downloads the source (data-savings story dies on 3G). What: encode worker emits two small comparison JPEGs (source frame + output frame, ~100KB each) in the job payload; BeforeAfterSlider falls back to them. Files: workers/encode-worker.ts, server/routes/jobs.ts payload, components/BeforeAfterSlider.tsx. Grade B (03-C7, 01-B4). |
| A-8 | ADD state-matrix + ephemeral-disk notes (APPLY NOW) | Every JobStatus needs a documented recovery (QUEUED -> sweep; ANALYZING/ENCODING -> BullMQ stalled recovery; DONE -> cleanup; FAILED -> copy + retry). Plus: Railway/Render/Fly worker disks are EPHEMERAL - P0.4 temp files die on container restart, which the A-1 fallback must absorb. What: docs/DEPLOYMENT.md section + state matrix tests. No code change. Grade A (PRD 25, 04-D4). |

FUTURE SCOPE (1): shared temp store (NFS/Redis/S3 scratch) to make P0.4 survive
horizontal scale - real value, but adds a moving part; trigger: second worker host
in production. REJECT (1): client-side video encoding - already F1 in 04-B; nothing
in this review changes that verdict.

### 2.2 Backend

| # | Item (verdict) | What / Why / Files |
|---|---|---|
| B-1 | AMEND P0.1 complete handler (APPLY NOW) | Exact change: the /uploads/complete endpoint must, after CompleteMultipartUpload, HEAD the assembled object and compare its size against the claimed sizeBytes from POST /uploads/presign. Reject on mismatch (quota-evasion via lying about size, FR-1 ceiling enforcement). Files: server/routes/uploads.ts, lib/queue.ts. Grade A (PRD 23, FR-1). |
| B-2 | ADD idempotent complete (APPLY NOW) | A retried complete (client timeout after server success) hits NoSuchUpload and currently errors the job. What: catch NoSuchUpload/404 on complete; if the object exists (HEAD 200), treat as success and return the stored result. Files: server/routes/uploads.ts. Grade A (S3 multipart semantics B/C, 05 P0.1 acceptance "max 2 API calls" implies retry-safety). |
| B-3 | AMEND P0.1 chunk timeouts (APPLY NOW) | Exact change: per-chunk PUT timeout >= 120s (5-8MB at 0.5-2 Mbps = 20-80s+ transfer, 01-B4), jittered exponential backoff, max 5 attempts (kept from spec). Default fetch/axios timeouts (~30s) will kill legitimate 3G chunks and burn all 5 retries on a working link. Files: app/dashboard/dashboard-client.tsx, lib/api-client.ts. Grade A (01-B4). |
| B-4 | ADD quota fail-open policy (APPLY NOW) | /usage behavior on API/Redis/DB failure is undefined. What: default ALLOW with a client-side local counter (mirrors P1.5's localStorage quota), reconcile on the next successful call; the first-job exemption (FR-11) must survive a failed quota check. This converts an infra hiccup into a soft-limit blip instead of a blocked user. Files: lib/api-client.ts, server/routes/usage.ts. Grade B (PRD 27 soft-limit tradeoff). |
| B-5 | ADD rate-limit + dedupe coverage (APPLY NOW) | PRD 23 rate-limits /jobs and /uploads/presign (20/min/IP); the new presign-all and complete endpoints need the same, and POST /jobs needs the PRD 26 dedupe/debounce per fingerprint (exists in PRD, absent from 05). Files: server/routes/uploads.ts, server/routes/jobs.ts, server/plugins/rate-limit.ts. Grade A (PRD 23/26). |
| B-6 | ADD server-owned key prefix (APPLY NOW) | fileKey and part keys must be server-generated (uploads/<fingerprintHash>/<cuid>/part-N), never client-supplied paths; presigned URLs scoped to exactly that key. Add a test that a client-supplied key is rejected. Files: server/routes/uploads.ts, tests. Grade A (PRD 23). |
| B-7 | ADD adaptive polling/SSE policy (APPLY NOW) | SSE dies on carrier NAT and mobile browsers (well-known 3G behavior, 01-B4 context); the fallback poll must be first-class: 3s during active stages, backoff to 10s after 2 min idle, stop on DONE/FAILED. What: document + test the fallback path on throttled 3G. Files: lib/api-client.ts, docs/DEPLOYMENT.md. Grade B/C. |
| B-8 | AMEND P1.2 premium shift (APPLY NOW) | isPremium is always false in MVP (no billing until Phase 2), so the premium priority shift is dead code and unmarketable. Exact change: keep the STATUS=1/CHAT=2/CUSTOM=3 ladder and the premium shift hook, add a regression test asserting free-tier behavior is unchanged, and explicitly do NOT advertise priority in MVP copy (Research Office REJECT R-8). Files: workers/analysis-worker.ts, lib/queue.ts, tests, copy strings. Grade A (PRD 27, 05 P1.2). |

### 2.3 Research Office

| # | Item (verdict) | What / Why / Files |
|---|---|---|
| R-1 | AMEND P1.6 data-saved baseline (APPLY NOW) | "You just save ~X MB" must be computed as ORIGINAL source size (pre-pre-compression for images) minus output size, transmitted via job metadata (originalSizeBytes). Using the uploaded size understates the win for images (P0.2 uploads the ~300KB pre-compressed file) and makes the number meaningless. Exact change: jobs carry originalSizeBytes; dataSaved helper in lib/growth-ux.ts uses it. Grade A (05 P0.2, PRD 29 honesty guardrail). |
| R-2 | AMEND P1.6 trust copy (APPLY NOW) | GATE-BLOCKING honesty fix. (a) "Photo dey stay for your phone. No upload." is FALSE - P0.2 uploads the pre-compressed image for the idempotent server pass. Exact replacement: "Photo don already reduce for your phone. E go delete itself after 30 minutes." (b) "Your video delete itself after 30 minutes" is FALSE for outputs - retained 24h (PRD 22). Exact replacement: "Your video go delete itself automatically. Nothing dey stay." with exact windows on the privacy page. Files: components (drop zone), copy strings, docs/NoBlur-PRD-v1.md. Grade A (05 P0.2 vs P1.6 internal contradiction; PRD 22). |
| R-3 | ADD navigator.share file share (APPLY NOW) | wa.me only pre-fills a TEXT message; the user then still attaches the file manually - competitor result panels share the FILE (03-C4). What: progressive enhancement on the result card - navigator.share({files:[outputFile]}) on Android Chrome (Web Share Level 2, B/C), wa.me fallback everywhere else. Distinct from F7 (share TARGET, receiving into Noblur - stays deferred). Files: components (result card), lib/whatsapp-share.ts. Grade B/C (03-C4, platform support B). |
| R-4 | ADD honest pre-upload wait estimate (APPLY NOW) | Before a video upload starts, show an honest estimate from the verified math: "Na your network go decide: 50MB na ~5-10 min for 3G" (01-B4). No fabricated numbers - ranges only, from the verified 0.5-2 Mbps floor. This sets the 3G expectation the progress bar then meets (03-C6). Files: components (drop zone/upload), Pidgin copy strings. Grade A (01-B4; 03-C6). |
| R-5 | ADD per-preset data-saved estimates (APPLY NOW) | Preset chips should show estimated data saved per option (03-C2) using the existing client lib/size-predictor.ts - the Nigeria wedge (03-B4 cost math) is strongest before the upload, not only after. Files: components (preset chips), lib/size-predictor.ts. Grade B (03-C2/B4). |
| R-6 | ADD WhatsApp empirical self-test as gate item (APPLY NOW) | 01-A4 defines the procedure (send test clips through real WhatsApp, inspect via ffprobe/EXIF on the receiving phone) to confirm Status resolution cap and photo behavior; it is a PRD milestone but absent from 05. What: add to Gate G4 verify; record results into the PlatformLimit table. Files: 05 Gate G4 list, config/platform-limits.json, scripts/test-whatsapp.ts. Grade A (01-A4). |
| R-7 | ADD retention audit test (APPLY NOW) | The auto-delete promise (03-C5) must be measurable: a test that runs the cleanup cron, then lists the bucket and asserts zero objects past the retention window, with deletedAt rows present in Postgres (single writer, AGENTS 12). Files: tests, workers/cleanup-cron.ts. Grade A (AGENTS 12, PRD 22). |
| R-8 | REJECT premium "priority processing" marketing claim (REJECT) | No billing in MVP means premium priority cannot be delivered, demonstrated, or verified - claiming it in copy would violate AGENTS 3 (no fabricated claims). The P1.2 code hook stays (B-8); the marketing claim is rejected until Phase 2. Files: copy strings. Grade A (AGENTS 3, PRD 27). |

---

## 3. THE ONE-BUTTON-TO-OUTPUT FLOW REVIEW (joint, centerpiece)

Walked at SYSTEM level: one tap on the single Upload button -> user holds the
optimized file and shares it. Every hop below is grounded in the code paths
documented in 00-PERF-DIAGNOSIS (dashboard-client.tsx upload loop, workers,
storage.ts, queue.ts) and the P0/P1 changes in 05-BUILD-SPEC.

3G ground rules used (verified): upload throughput 0.5-2 Mbps, so 50MB = 5-10 min
(01-B4); median Nigerian upload 11-16 Mbps on 4G (03-B4, A); Lagos-London RTT
75-90ms (01-B4, B/C); 5-8MB chunks (01-B4).

### 3.1 Flow table

| Step | System hop | Architect lens | Backend lens | Research-office lens | Gap + fix |
|---|---|---|---|---|---|
| 0. Tap Upload, pick file | None (local). Client validation (lib/file-validation.ts) | Tap must respond <100ms (PRD 10); validation mirrors server allowlist | Client check is UX only; server re-validates via magic bytes (AGENTS 15) | Allowlist = verified formats (PRD 6); Pidgin error copy | None blocking |
| 1. Quota check GET /usage | Browser -> Vercel -> Fastify API -> Redis cache (30s TTL, P1.5) -> Postgres UsageRecord | Must run PARALLEL to presign, never serialize before upload; cache is what makes this cheap on 3G (00-L4) | Fail-open policy undefined (B-4); fingerprint+IP hash only, no raw IP (AGENTS 14) | Quota is a soft limit (PRD 27) - UI must not imply hard enforcement | B-4: fail-open + local counter; first-job exemption (FR-11) must survive /usage failure |
| 2. Batch presign POST /uploads/presign (P0.1) | Browser -> API (1 RTT; signing is local SigV4, no storage hop) -> returns partUrls[] for all chunks | Sound: collapses 30+ serial ops to 1 (00-U1). Expiry must scale for premium 500MB on 3G (67+ min) | Server generates keys (B-6), validates size claim, rate-limits (B-5) | 60-min expiry fine for 50MB free tier (5-10 min worst case); premium case undocumented | A-2: expiry = max(60min, 2x slowest-link estimate); ETag checkpoint persistence |
| 3. Parallel chunk PUT (4-6 concurrent) | Browser -> Supabase Storage S3 directly (presigned PUTs, no API proxy) | Sound. Honest floor: 50MB @ 1Mbps = ~6.7 min (arithmetic on 01-B4). Parallelism cuts RTT overhead, NOT bandwidth - the spec's ~60-70% claim must be MEASURED, not assumed | Per-chunk timeout >= 120s (B-3); 403 storm = wrong region constant, fail fast with clear error instead of 5x retries (00-U3) | Longest user-facing wait on 3G; user needs the honest estimate BEFORE this (R-4) | B-3 timeouts; A-2 ETags; R-4 pre-upload estimate; verify item V1 measures the real gain |
| 4. Complete multipart + POST /jobs | Browser -> API (complete: assemble parts) -> API INSERT Job (Postgres) -> Redis queue.add(media-analysis) | Two hops, one DB write, one queue write - fine; Redis-add failure orphans the Job row | Complete must be idempotent (B-2) and verify final size vs claim (B-1); dedupe per fingerprint (B-5) | Quota increments here; FR-11 first-job exemption must hold | A-3: reconciliation sweep re-adds QUEUED > 2 min; B-2 idempotent complete |
| 5. Analysis worker: probe + sniff + scene analysis | Redis -> worker -> storage GET (downloadFromR2) -> ffprobe + OpenCV scene analysis (1fps) -> Postgres analysisResult -> queue.add(encode, {localPath}) (P0.4) | localPath only valid same-host (A-1); ephemeral worker disk kills temp files on restart (A-8) | Corrupt file = permanent fail fast, no retry; download fail = transient, backoff 5s (P2.1) | Hidden cost: OpenCV on EVERY video job (00-O4); 90s clip = 90 frames of Python+OpenCV on 2 vCPU | A-1 fallback; frame cap 12-16 needs HUMAN amendment (AGENTS Q2 locks "1 fps sample") - request at gate |
| 6. Encode worker: policy -> FFmpeg -> VMAF | Worker -> (localPath or download) -> policy engine profile select (H.264, amendment 1) -> FFmpeg encode (ladder, P0.3) -> VMAF (4s samples, P1.1) -> max 1 CRF-3 re-encode -> size check +/-10% -> max 2 retries -> storage PUT output | THE dominant latency. Worst case (slow preset + re-encode + retry) can exceed 5-min timeout (A-4) and 60s lockDuration (A-5, GATE-BLOCKING) | Retry caps bounded (<=2 total, <=1 VMAF re-encode); transient vs permanent classification (PRD 19); VMAF model bundled | VMAF floor 80 with 4s sampling must be validated vs 2s on the 20-clip set before ship (04-S5, B) | A-4 tiered timeout; A-5 lockDuration; A-6 re-baseline matrix; V3 verifies |
| 7. Output storage + status polling | Worker -> storage PUT output -> Postgres DONE -> client GET /jobs/:id (SSE, fallback poll) | SSE dies on carrier NAT; fallback poll must be first-class with adaptive interval (B-7) | Output URL presigned 24h; /jobs noindex + no-store (AGENTS 21) | Before/after must not force source re-download on 3G - images use client blob (P0.2), video unaddressed | A-7: server-side comparison JPEGs for video |
| 8. Result card + share/download | Local render; wa.me deep link (text) / presigned GET download | Share must not block on anything; result renders from cached job payload | Download URL expiry; range requests supported | wa.me shares a LINK, not the FILE (03-C4); data-saved baseline must be original size (R-1) | R-3 navigator.share({files}) progressive enhancement, wa.me fallback; R-1 baseline |
| 9. Cleanup cron (retention) | Cron (BullMQ repeatable) -> storage DELETE + Postgres deletedAt (sole writer) -> lifecycle backup | Single deletion authority is correct; sweep can also absorb A-3 reconciliation | Delete + mark must be atomic-ish and idempotent | Copy says "30 minutes"; reality is source-at-completion, output-24h (R-2); needs audit test (R-7) | R-2 copy fix (GATE-BLOCKING); R-7 audit; fold A-3 sweep here |

### 3.2 Design verdicts (the specific questions asked)

- P0.1 batch-presign + parallel upload: SOUND, with three amendments (A-2 expiry,
  B-3 timeouts, A-2/B-1 ETags + size verification). The 60-70% wall-clock claim
  (05 P0.1 Why) is only true where RTT overhead dominates; on bandwidth-bound 3G
  the gain is smaller. Must be measured at V1, not asserted. Grade A for the design,
  C for the paper claim until measured.
- P0.4 no-double-download: SOUND only single-host. The acceptance "exactly ONE
  downloadFromR2 per video job" is not true under PRD 10's stateless horizontal
  scaling or ephemeral worker disks. Fix A-1 (conditional fallback) or accept a
  documented single-host deployment for MVP. Grade A design intent, B as written.
- P1.2 queue/priority: SOUND for ordering (BullMQ priority, encode queue is the
  real bottleneck), but (a) priority orders, it does not preempt - a running long
  Chat encode still delays a Status job; acceptable for MVP, document it; (b) the
  premium shift is inert until Phase 2 (B-8); (c) the analysis queue does not need
  priority - the encode queue is where it matters, and the spec puts it there. 
  Grade A with amendments.

### 3.3 Cross-cutting gaps (blunt)

1. lockDuration 60s vs 2-5 min encodes = stalled re-runs. Fix A-5. This alone can
   double compute cost and produce duplicate outputs at launch. [A]
2. P1.6 copy contradicts the architecture in two places ("No upload" for images,
   "30 minutes" for videos). Fix R-2. This is an honesty-rule violation (AGENTS 3
   spirit, Article II), not copy polish. [A]
3. Gate matrix (PRD 5) is unreachable at ladder defaults. Fix A-6. Without it,
   G4 fails on a self-inflicted target. [B]
4. Scene analysis cost (00-O4) is only half-addressed: P2.2 skips it for images,
   but the 1fps video sampling stays locked at 90 frames for a 90s clip. Frame cap
   needs a human amendment - surface it at the gate, don't ship the cost. [A]
5. No video before/after frame story (A-7) - the centerpiece comparison UI
   (03-C7) is only solved for images. [B]
6. Nothing in the spec defines what happens to a half-uploaded multipart object
   when a user abandons mid-upload - orphaned parts accumulate until lifecycle
   rules catch them. Add a cleanup-cron pass for incomplete multipart uploads
   (AbortMultipartUpload on stale uploads). Fold into A-8. [B]

---

## 4. VERIFY LIST - the 5 most important things to actually TEST before approval

V1. REAL 3G UPLOAD PATH (P0.1): what - 50MB file with DevTools 3G throttling,
before/after P0.1; how - assert API call count <= 2 (start + complete), part count
== chunks (list S3 objects), kill the connection mid-upload and reload the tab -
resume must continue from the checkpoint with ETags intact; pass bar - upload
completes, resume works without re-uploading completed parts, wall-clock improves,
and the measured gain is reported against the honest bandwidth floor (not the
paper 60-70% claim). [00-U1/U2, 05 P0.1]

V2. PRESIGN/STORAGE ROUND-TRIP ON THE REAL EU-WEST SUPABASE PROJECT (P1.4): what -
presign -> 6 parallel PUTs -> complete -> GET on the actual production project;
how - run from this host against the eu-west project after the region check
(00-U3); pass bar - zero 403s (region constant correct), CORS configured for PUT,
bucket RLS intact, complete returns a valid object, download URL works. A single
403 storm here means every 3G user eats 5x retries per chunk. [00-U3, 05 P1.4]

V3. ENCODE MATRIX + TIMEOUT + LOCK ON THE REAL WORKER HOST: what - the PRD matrix
(15s/720p, 60s/720p, 90s/1080p) x3 runs at the LADDER'S LOW-DEPTH PRESET (worst
case, preset slow), plus VMAF 4s-vs-2s drift on the 10s clip, plus a 90s/1080p job
with a forced re-encode; how - real worker host, ffmpeg arg spy, BullMQ stalled
count; pass bar - p50 within the matrix at the re-baselined numbers (A-6), OR a
documented re-baseline with justification; VMAF score drift < 1 point; NO job
exceeds the timeout; NO stalled re-runs (lockDuration fix A-5 proven). [00-O6/O8,
05 P1.1/P0.3, PRD 5]

V4. FAILURE DRILLS: what - Redis down at enqueue (job must be recovered by the
sweep, A-3, no silent loss); chunk PUT 403 (region misconfig) must fail fast with a
clear error, not 5x retry burn; VMAF failure triggers exactly one CRF-3 re-encode
and total retries <= 2; 89/90/91s Status split boundary (PRD 26); cleanup cron
deletes objects + writes deletedAt, bucket list = 0 past retention (R-7); quota
fail-open (B-4); how - scripted drills, one per scenario, logged outcomes; pass
bar - every drill has a defined, tested, logged outcome; no orphaned Job rows, no
orphaned parts, no orphaned objects. [PRD 19/25/26, AGENTS 12]

V5. REAL-DEVICE END-TO-END (mid-range Android, Tecno/Infinix class, 03-B7): what -
full flow upload -> job -> result -> share on throttled 4G and 3G; how - real
phone, real camera-roll 12MB photo and a 50MB video; pass bar - 3-tap flow (03-C3),
honest stage labels (03-C6), data-saved figure equals original-minus-output (R-1),
image trust copy is the corrected R-2 text (no "No upload"), wa.me AND
navigator.share both work (R-3), Pidgin copy everywhere (AGENTS 4), no CSP
violations, SSE fallback to polling proven, full job < 60s on 4G (03-C3 target).
[03-C3/C4/C6, AGENTS 4]

---

## 5. Source / grade list

- 00-PERF-DIAGNOSIS.md - A (live curl + code reading): L2/L3/L4 loading, U1/U2/U3/U4
  upload, O1/O3/O4/O5/O6/O7/O8 optimize, region best-guess risk.
- 01-PERFORMANCE-PLAYBOOK.md - A1-A3 WhatsApp constants (A/B), A4 self-test
  procedure ([UNVERIFIED] list), B3 preset ladder (C), B4 3G 0.5-2Mbps + 5-10 min
  50MB + Lagos-London 75-90ms (B/C), B5 queue/priority (C).
- 02-COMPETITIVE-TEARDOWN.md - A/B/C: competitive set, EMULATE/AMPLIFY/FIX,
  feature matrix, WhatsApp-compression baseline.
- 03-MARKET-UX-BRIEF.md - A1-A3 problem validation (A/B/C), B1-B7 Nigeria stats
  (A/B/F), B4 median upload 11-16 Mbps (A), C1-C8 UX patterns (B/C), cost math
  (A inputs, arithmetic shown).
- 04-ENGINEERING-VETTING.md - S1-S10 (A/B), F1-F9, R1-R6, D1-D5 locked amendments
  (human approved 2026-08-27).
- 05-BUILD-SPEC.md - P0.1-P2.4 (reviewed artifact; internal contradictions cited
  at P0.2 vs P1.6).
- NoBlur-PRD-v1.md - Section 5 matrix, 10 NFR, 17 architecture, 18 API, 19 queue,
  22 retention, 23 security, 26 edge cases, 27 business model, 31 assumptions
  (job timeouts listed as tunable).
- AGENTS.md (docs/AGENTS.md) - Q2 locked choices (1 fps scene sampling, 90s/4s VMAF
  amendment, H.264, Supabase storage, Redis queue+cache), Q3 never-rules (1, 3, 4,
  12, 14, 15, 21).
- Arithmetic on 01-B4/03-B4 inputs (50MB @ 1 Mbps = ~6.7 min; 500MB @ 0.5 Mbps =
  ~67 min) - transparent, A method on C/B inputs.
- [UNVERIFIED]: exact WhatsApp bitrates, 16MB trigger, Status resolution cap,
  WhatsApp NG user counts, NGN data prices - none are used in proposed copy except
  via verified ranges.

END OF REVIEW
