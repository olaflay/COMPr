# Noblur - Department Review: Market Analyst / QA / Auditor
# Subject: 05-BUILD-SPEC.md (v2 speed + trust milestone) - BEFORE Gate G4 approval

Date: 27 Aug 2026
Reviewers: Market Analyst, QA, Auditor (Company OS role-play, one agent, three lenses)
Inputs: NoBlur-PRD-v1.md (v1.2), AGENTS.md, research 00-05 + M2-DOSSIER, role files.
Rule: every claim graded A-F with source; [UNVERIFIED] where unverifiable; plain ASCII; blunt.

## GATE VERDICT (read this first)

CONDITIONAL APPROVE. The architecture decisions in 05 (P0 upload speed, P1 encode/load
cuts, honest constants) are right and evidence-backed. But the spec as written ships
TWO blockers and SEVEN majors, all fixable in copy, guards, and one small feature
(Web Share file send). Fix the two blockers, apply the APPLY-NOW items in Section 2,
and the gate evidence must include the Section 5 field matrix. Full list: Section 4.

--------------------------------------------------------------------------------

# 1. PER-DEPARTMENT NEEDS

## 1.1 Market Analyst - what Noblur NEEDS to convert a Nigerian seller

| # | Need | Grade |
|---|------|-------|
| M-N1 | TRUE 3-tap delivery: tap -> optimize -> file IN WhatsApp. The current flow ends at "download, then find the file, then attach" - that is 5 taps, not 3, and the one-tap share button does not attach the file (it opens wa.me with a text message). The 3-tap promise is the competitor bar (SqueezeVid/Compresso do result-in-3) and 05 never touches it. | A (FR-15 semantics; 03-C3) |
| M-N2 | The data-saved story must be computed from the ORIGINAL file size, not the pre-compressed upload size. With P0.2 an image is resized to ~300KB before upload; if "before" in the before/after or "You just save X MB" uses the uploaded size, the headline number is fake and the Nigeria wedge dies (1 min 1080p = ~90MB, compress cuts 4-6x is the wedge). | A (00-U4; 03-B4; 02 AMPLIFY) |
| M-N3 | Upload must be the fastest, most resumable, best-communicated step in the app. 50MB on 3G (0.5-2 Mbps) is 5-10 minutes of user patience; that is where sellers quit. P0.1 (batch presign + parallel) is right; it must be paired with an honest time/data estimate shown BEFORE upload starts. | A (01-B4; 00-U1/U2) |
| M-N4 | Trust copy must survive a hostile read. The "Photo dey stay for your phone. No upload." line in P1.6a is false under P0.2 (a resized version IS uploaded). One false claim makes every other trust line suspect. The auto-delete promise is the honest replacement, but its number must match real policy. | A (04-R1; 03-C1/C5) |
| M-N5 | First-run value in under 60 seconds on 3G: demo button + first-job-free + instant preset. The demo button exists (P2.4) but is parked at the end of the build; it is an activation feature, not polish. | B (03-C8) |
| M-N6 | NGN framing only where verified. MB-level data math is verified (11-16 Mbps median upload, 90-120MB per 1080p minute); naira conversions stay illustrative until live FX + operator pricing are verified (currently F-grade [UNVERIFIED]). | B (03-B1..B5; 03 UNVERIFIED list) |

## 1.2 QA - what Noblur NEEDS to survive the field

| # | Need | Grade |
|---|------|-------|
| Q-N1 | Prove the PRD Section 5 matrix (15s/720p <12s, 60s/720p <20s, 90s/1080p <35s) on REAL worker hardware with the P0.3 ladder + P1.1 verification cuts active - not in dev mode, not on the legacy path. Every timing claim in the gate submission must be a quoted run. | A (PRD 5; 00-PERF 7) |
| Q-N2 | Field-test on actual budget devices (Tecno Spark, Infinix Hot, Samsung A-series = ~48% of the Nigerian market) over real throttled/interrupted 3G, not only DevTools profiles. PRD 36 criterion 14 demands "mid-range Android over throttled/interrupted 4G" and the spec's verify steps are all local e2e. | A (03-B7; PRD 36) |
| Q-N3 | Client image pre-compression (P0.2) must handle EXIF orientation (portrait photos coming out sideways is the classic canvas bug), alpha channels, 48MP+ OOM on 2GB RAM, and MUST have a fallback to raw upload when it fails. The spec has no fallback path. | A (known browser behavior; PRD 15.5) |
| Q-N4 | Resume/checkpoint must survive tab kill, network drop mid-chunk, battery saver, Chrome data saver, and iOS Safari private mode (localStorage throws). PRD 26/36 already require the interrupted case; 05 only tests "tab reload". | A (PRD 10, 26, 36) |
| Q-N5 | Every new Pidgin string is a test artifact: present on the right screen, honest, no English-only leakage, and no string that contradicts a locked rule (bypass/AI/retention). Copy moved into the QA checklist in this milestone. | A (AGENTS Q3.4; 05 P1.6) |
| Q-N6 | Browser reality matrix: Chrome Android (majority), Samsung Internet (pre-installed), UC Browser, Firefox Android, Opera Mini (proxy mode breaks JS - marketing pages must still render, dashboard must degrade honestly), iOS Safari 15-17 (17.4% of market). | B (03-B6; 03 UNVERIFIED list) |

## 1.3 Auditor - what Noblur NEEDS to stay honest and complete

| # | Need | Grade |
|---|------|-------|
| A-N1 | No false statement in any new copy. P1.6a as written ("No upload" for images) is false. This is the exact pattern 04-R1 rejected for video; it does not become true for images because they are resized first. | A (04-R1; spec reading) |
| A-N2 | Docs must match approved amendments. PRD body still says VMAF 2s/5s (FR-7, Section 13), AV1 primary on document path (FR-16/Section 13), and the "16MB compression trigger" (FR-2) - all superseded by AGENTS.md locks + 04-D. A builder following the PRD body re-introduces the rejected choices. | A (PRD vs AGENTS Q2 diff) |
| A-N3 | The share step must do what it says. FR-15's "reduce tap count from 3 to 1" and user story 8 ("share the optimized file directly to WhatsApp with one tap") are not what wa.me does. Either attach the file (Web Share API with files) or say what the button actually does. | A (FR-15 semantics) |
| A-N4 | The never-upscale rule (AGENTS Q3.17) must hold in the client resize path. P0.2 as written upscales small sources to the preset long edge. | A (AGENTS 17; P0.2 text) |
| A-N5 | Retention claims in copy must equal the documented retention policy. "delete itself after 30 minutes" vs PRD 22 (source deleted at job completion +1hr grace on failure; output 24h). | A (PRD 22; P1.6a text) |
| A-N6 | Every URL shipped in a share message, llms.txt, or structured data must be live and owned. noblur.app does not resolve (00-PERF 0); P1.4 defers DNS. A share message pointing at a dead domain is a trust killer, not a growth loop. | A (00-PERF 0; 05 P1.4) |

--------------------------------------------------------------------------------

# 2. PER-DEPARTMENT ADDS TO 05-BUILD-SPEC

Verdict legend: APPLY NOW / FUTURE SCOPE / REJECT. Items that change something already
in 05 are marked AMEND with the exact change. Max 8 per department.

## 2.1 Market Analyst adds

### M-ADD-1. Original-size baseline for before/after and data-saved
AMEND P0.2 + P1.6c: the client keeps originalSizeBytes (and original dims, already
planned) when it pre-compresses; the result card size comparison, "You just save ~X MB
of data", and the before/after slider ALL compute against the ORIGINAL size, never the
~300KB upload. Files: app/dashboard/dashboard-client.tsx, lib/growth-ux.ts,
components/BeforeAfterSlider.tsx, result-card copy.
Verdict: APPLY NOW - without it the headline claim is wrong (M-N2).

### M-ADD-2. True one-tap send: Web Share API Level 2 with file attachment
ADD: after a job completes, the primary button calls navigator.share({ files: [output] })
where supported (Chrome Android - the majority of an 82.5% Android market); the file is
attached to the user's chosen WhatsApp chat in one tap. Fallback (no support / iOS quirks):
current wa.me + download path, with copy that says exactly what it does. Note: 04-F7
deferred the share-TARGET direction (receiving), NOT file-send; no conflict with vetting.
Files: lib/whatsapp-share.ts, app/dashboard/dashboard-client.tsx.
Verdict: APPLY NOW - this is the difference between the 3-tap promise and a 5-tap chore.

### M-ADD-3. Honest upload time + data estimate before upload
ADD: on file select, show a Pidgin line: "Dis file go take about 4 min for 3G, ~35MB
data. E go resume if network cut." Estimate from file size + navigator.connection
effectiveType (Chrome Android). Never a fake precision - ranges only.
Files: lib/estimate.ts (new, pure + unit tests), dashboard-client.tsx.
Verdict: APPLY NOW - manages 3G expectations and builds the "we understand your data"
trust (03-B4); the spec currently shows no pre-upload expectation at all.

### M-ADD-4. Promote the demo button from P2.4 to P1
AMEND P2.4 -> P1: "Try wetin don ready" (bundled sample photo) ships with the P1.6
trust work, not at the end of the build. It is the activation path for users who will
not upload their own media on the first visit (Squoosh/TinyPNG pattern, 03-C8).
Files: app/dashboard/dashboard-client.tsx, public/ sample asset.
Verdict: APPLY NOW - it is a few lines and a static asset; parking it in P2 wastes the
first-run moment.

### M-ADD-5. Post-send feedback fires off SHARE, not download
ADD (spec currently silent; PRD 11.13 says "some time after download"): the
"Did e look good after you send am?" prompt (PRD 29's core metric - the only one that
validates the actual promise) triggers after a share/send action, or 24h after download
as fallback. Prompting after a plain download asks about an event that never happened.
Files: lib/job-history.ts, dashboard-client.tsx.
Verdict: APPLY NOW - the metric is PRD 29's "quality perception"; tying it to the wrong
event corrupts the launch signal.

### M-ADD-6. NGN data-cost explainer page (transparent math)
ADD (later): /how-it-works section: "1 minute of 1080p = about 90-120MB. Noblur fit cut
am to 15-22MB." MB math from verified inputs (01-B4, 03-B4); naira conversions flagged
illustrative until live FX + operator pricing verified (03-B2 is F-grade).
Files: app/(marketing)/how-it-works/page.tsx.
Verdict: FUTURE SCOPE - launch with the MB-level data-saved line (P1.6c); naira needs
verification first. REJECT naira numbers today.

## 2.2 QA adds

### Q-ADD-1. Pre-compression fallback path
AMEND P0.2: if createImageBitmap/canvas.toBlob fails (OOM on 48MP, unsupported input,
SVG, memory pressure), upload the ORIGINAL and let the server pipeline handle it.
Acceptance adds: forced-failure test (stub that throws) proves fallback upload + job
completes. Files: lib/image-precompress.ts, dashboard-client.tsx.
Verdict: APPLY NOW - no fallback = hard user-facing failure on the exact devices that
dominate the market.

### Q-ADD-2. Orientation and alpha correctness in pre-compression
AMEND P0.2: decode with imageOrientation: "from-image" so portrait photos stay portrait;
do NOT JPEG-convert PNG/WebP sources with alpha (server rule PRD 15.5 preserved -
flatten to JPEG only when alpha is fully opaque). Acceptance adds: portrait photo from a
Tecno camera comes out portrait; alpha PNG keeps transparency.
Files: lib/image-precompress.ts.
Verdict: APPLY NOW - both are classic, visible, market-wide browser bugs.

### Q-ADD-3. Real-device field matrix becomes a gate artifact
ADD: the Section 5 matrix (physical Tecno Spark / Infinix Hot / Samsung A-series,
throttled 3G + interrupted upload + battery saver + data saver) is executed and its
outputs quoted at Gate G4. PRD 36 criterion 14 is not satisfiable from a laptop.
Files: scripts/field-matrix.md (new), gate evidence pack.
Verdict: APPLY NOW - this is the difference between "tests pass" and "it works in
Lagos on a Tecno".

### Q-ADD-4. Browser matrix
ADD: test pass across Chrome Android, Samsung Internet, UC Browser, Firefox Android,
Opera Mini (graceful degradation: SSR marketing readable; dashboard shows an honest
"your browser no support this app" state instead of a broken JS screen), iOS Safari
15-17 (HEIC/MOV handling, download attribute, PWA install).
Files: scripts/test-downloads-compat.ts extension, QA matrix doc.
Verdict: APPLY NOW.

### Q-ADD-5. Core Web Vitals into PostHog from launch
AMEND P1.5: send web vitals (LCP/CLS/INP) via PostHog; acceptance adds "web vitals
event present in PostHog on first paint". Tuning the 100ms/300ms interaction targets
(PRD 10) is impossible without field data.
Files: app/providers.tsx.
Verdict: APPLY NOW - cheap and the PRD explicitly says the targets get tuned from real
RUM data in Phase 2; the data must start collecting at launch.

### Q-ADD-6. Video source-frame extraction for the before/after slider
ADD: the analysis worker extracts one source frame (1s mark) to a small JPEG in the
output bucket. Without it, the visual comparison (PRD 36 criterion 9) is impossible for
video once the source file is deleted per retention - and no artifact in 05 or the PRD
produces that frame. Files: workers/analysis-worker.ts, lib/pipeline.ts, storage keys.
Verdict: APPLY NOW - the feature is a PRD acceptance criterion; the spec must name the
mechanism that feeds it.

### Q-ADD-7. Video smart-default preset timing
AMEND FR-2 flow as built: for VIDEO, the preset chip is confirmed AFTER server analysis
(fast, pre-encode) because duration/orientation are not reliably available client-side
from a File object (MP4 duration needs a demux). For IMAGES keep the instant client chip
(P0.2 gives dims locally). Acceptance adds: preset shown matches server probe on 10/10
reference clips; preset override stays one tap.
Files: dashboard-client.tsx, lib/smart-defaults.ts.
Verdict: APPLY NOW - PRD 36 criterion 1 ("correctly pre-selected preset") is untestable
until this timing is defined; a wrong pre-upload guess reads as a stupid product.

### Q-ADD-8. Worst-case timeout margin
AMEND P1.1/P0.3 acceptance: run the worst case (90s/1080p source, fast ladder, VMAF
CRF-3 re-encode triggered, split into 2 segments) and assert completion with margin
inside the 5-minute video job timeout (PRD 19). 00-PERF O8 already flagged that the
old stack could exceed it.
Files: workers/encode-worker.ts, verify script.
Verdict: APPLY NOW.

## 2.3 Auditor adds

### A-ADD-1. Kill the false "No upload" image claim
AMEND P1.6a: images ARE uploaded (a small version). Reword to: "We don resize am for
your phone first - na small version wey go up. Your photo no go use plenty data." and
"Your video delete itself after processing. Nothing dey stay." Never "No upload".
Files: drop-zone copy, lib/growth-ux.ts, FAQ, privacy microcopy.
Verdict: APPLY NOW - BLOCKER as written. It is the exact false-claim pattern 04-R1
rejected, and PRD 38's guardrail forbids it.

### A-ADD-2. Data-saved baseline = original size
AMEND P1.6c: identical to M-ADD-1; the Auditor frames it as a truthfulness rule, not a
marketing one. "You just save X MB" must equal ORIGINAL - pre-compressed-upload size.
Verdict: APPLY NOW.

### A-ADD-3. Live-URL discipline for share links
AMEND P1.4: the brand URL is config-driven (lib/whatsapp-share.ts reads one constant);
share message, llms.txt, and structured data all use the LIVE deployed Vercel URL until
noblur.app is purchased and DNS'd. Never ship a share message pointing at a dead domain.
Acceptance adds: share message URL returns 200 when curled.
Files: lib/whatsapp-share.ts, public/llms.txt, lib/seo.ts, config.
Verdict: APPLY NOW.

### A-ADD-4. Extend the P1.3 copy sweep to every surface
AMEND P1.3: the "no unverified claim" sweep must cover SEO meta descriptions, JSON-LD
structured data (PRD 37 forbids overstating), llms.txt, the share message, FAQ, PRD FR-2
UI copy ("For files larger than this, WhatsApp sends as a document instead of
compressing" - the 16MB-as-trigger phrasing), and PRD Section 12 trust line. Acceptance:
grep + a named human review checklist, not just grep.
Files: all copy sources listed in P1.3 + app/(marketing) pages.
Verdict: APPLY NOW - 16MB as a hard "document trigger" is [UNVERIFIED] (01-A4); it must
not appear anywhere as fact.

### A-ADD-5. PRD doc consistency sweep (vs approved amendments)
AMEND P1.1/P1.3: update the PRD BODY where stale vs AGENTS.md locks + 04-D approvals:
FR-7 (VMAF "fixed 2-second intervals" -> keyframes every 4s), Section 13 (VMAF "middle
5-second segment" -> sampled keyframes every 4s; SSIM secondary only), FR-16/Section 13
(AV1 "primary codec on the document/preview path" -> H.264 everywhere in MVP, AV1
deferred), FR-2 (16MB "compression trigger" wording). Docs that contradict the locks
cause the next agent to re-introduce rejected decisions.
Files: docs/NoBlur-PRD-v1.md.
Verdict: APPLY NOW - doc debt, but it is cheap and it is how the build stays honest.

### A-ADD-6. Retention copy = retention policy
AMEND P1.6a: either (a) make "30 minutes" the real guarantee (cleanup cron sweeps
sources within 30 min of job completion and this is documented), or (b) reword to
"delete itself after processing" and state the exact windows (source: completion +1hr
grace; output 24h - PRD 22) in the privacy policy linked from the drop zone. A specific
number that does not match policy is a misrepresentation.
Verdict: APPLY NOW.

### A-ADD-7. Never-upscale guard in P0.2
AMEND P0.2: resize target = min(preset long edge, source long edge). An 800px photo
must not become 1600px. This is AGENTS Q3.17 applied to the new client path; the spec
as written violates it.
Files: lib/image-precompress.ts.
Verdict: APPLY NOW - rule violation as written (AGENTS Q3: task failed if violated).

### A-ADD-8. Product-name consistency
ADD (doc): pick one spelling - "Noblur" (build spec, files, noblur.app domain) vs
"NoBlur" (PRD, AGENTS.md). Sweep docs and code comments to the chosen name. Cosmetic,
but a product whose own docs disagree on its name will disagree on everything.
Files: docs/, config, code comments.
Verdict: APPLY NOW (trivial sweep; human picks the name).

--------------------------------------------------------------------------------

# 3. THE ONE-BUTTON-TO-OUTPUT FLOW REVIEW (joint - centerpiece)

Flow: from the single primary "Upload Media" button (PRD 11.1) to the user holding the
optimized file and sharing it. Steps below reflect the flow AS BUILT + AS AMENDED by
05 (P0.x/P1.x). Market lens: does this step convert a Nigerian seller (data, trust,
time)? QA lens: what breaks in the field? Auditor lens: any unverified/exaggerated/
dishonest claim? 05 item in parens where the spec touches the step.

| Step | Market lens | QA lens | Auditor lens | Gap + fix |
|------|-------------|---------|--------------|-----------|
| T1. Landing + single Upload CTA (P1.5) | First paint on 3G must be fast or the seller bounces back to WhatsApp; one button, trust line, demo button visible. [A - 03-C8] | LCP/TBT on throttled 4G mid-range; SSR marketing + client dashboard; no CSP violations. [A - 00-L3] | Landing copy must not claim "no upload" (P1.6a conflict); SEO meta must not state unverified constants. [A - 04-R6] | AMEND P1.6a copy (A-ADD-1); extend P1.3 sweep to SEO/structured data (A-ADD-4). |
| T2. Onboarding preferences, skippable (FR-13) | On 3G every extra screen costs data; must be one screen, skippable, never re-asked. [A - PRD 11.2] | Skip tap <100ms; answers never gate upload; e2e "skip -> first job still free". [A - PRD 10] | Answers must not be used to fabricate "personalized" claims. [A - PRD 38] | No gap in 05 (untouched); add skip-path e2e to QA matrix. |
| T3. File picker opens | Camera roll must be the default for images (sellers shoot in-app); "choose file" confuses non-technical users. [B - 03-C3] | Some budget browsers ignore the accept attribute; content:// URIs; 48MP photo can OOM the picker; file.type often empty on Android. [B - field knowledge] | No claims yet; no file-content analytics (AGENTS 13). [A] | Label + accept hint for camera roll; picker row in field matrix (Section 5). |
| T4. Client validation, fast fail (FR-14) | Instant Pidgin rejection saves data and face; never a spinner. [A - PRD 11.4] | file.type empty on Android -> sniff first bytes or be lenient and let the server reject; oversize 50MB free cap message + upgrade prompt. [B] | Server magic-byte check remains the authority (AGENTS 15); client check is advisory. [A] | No gap; ensure Pidgin error strings with retry (FR-14). |
| T5. Images: client pre-compress (P0.2) / Videos: batch-presign + parallel upload (P0.1) | Images: 40x less upload data = honest Squoosh story. Videos: full upload still costs 5-10 min on 3G - show expected time/data (M-ADD-3). [A - 00-U4, 01-B4] | Canvas EXIF rotation bug; alpha PNG flattened to JPEG; 48MP OOM; NO fallback path in spec. [A - known browser bugs] | P0.2 violates never-upscale (AGENTS 17) for small sources; "Photo dey stay... No upload" is false (upload happens); data-saved baseline must be original size. [A - spec reading] | AMEND P0.2: never-upscale guard, alpha passthrough, fallback to raw upload (Q-ADD-1/2, A-ADD-7); AMEND P1.6a copy (A-ADD-1); carry originalSizeBytes (M-ADD-1). |
| T6. Upload in flight: progress + resume (P0.1) | Honest progress + time estimate; 3G users measure the app against the clock (fake bars backfire). [A - 03-C6] | Resume after tab kill / network drop mid-chunk; localStorage checkpoint - Safari private mode throws; 6 parallel x 5MB in memory on 2GB devices. [B] | Batch-presign (P0.1) is a new surface: must still enforce size ceiling + format allowlist server-side and stay rate-limited (PRD 23). [A] | AMEND P0.1 acceptance: server-side validation retained on presign-all (A-ADD-9 in Section 4); Safari-private + interrupted-3G matrix rows. |
| T7. Smart default preset chip + one-tap override (FR-2) | Right preset pre-picked = trust; a wrong guess reads as a stupid product. [A - PRD 12] | For VIDEO the client cannot reliably know duration/orientation from a File object - the pre-upload chip can be wrong until the server probes. [A - file metadata limits] | PRD 36 criterion 1 ("correctly pre-selected preset") is untestable until this timing is defined; 05 is silent. [A] | Define video preset timing: confirm after server analysis, pre-encode (Q-ADD-7); acceptance: preset matches probe on 10/10 clips. |
| T8. Tap Optimize -> enqueue -> analyzing/encoding/verifying (P0.3, P0.4, P1.1, P1.2) | Encode must hit PRD matrix times; Status fast-path (P1.2) delivers the short-clip quick win. [A - PRD 5] | P0.4 localPath is only valid on the SAME host - horizontal scaling falls back to download (acceptance must say <=1, not exactly 1); fast preset may raise VMAF re-encode rate; 5-min timeout margin on worst case. [B] | P1.1 matches AGENTS locks (VMAF 4s, floor 80, SSIM secondary) - but PRD FR-7/Section 13 still say 2s/5s; docs contradict the locks. [A] | AMEND P0.4 acceptance (same-host conditional, Q-ADD-8); 20-clip regression for ladder + sampling (05 risk, make it a gate check); PRD doc sweep (A-ADD-5). |
| T9. Result card: before/after + data-saved (P1.6c) | The conversion moment: size + visual + "You just save X MB" in Pidgin. [A - 03-C7] | Video before/after needs a SOURCE frame - nothing in 05 or the PRD produces it; source is deleted per retention. [A - PRD 22 vs 11.9] | "save ~X MB" must be computed from ORIGINAL size, never fabricated (PRD 38 guardrail). [A] | ADD source-frame extraction at analysis (Q-ADD-6); originalSizeBytes baseline (M-ADD-1/A-ADD-2). |
| T10. Send to WhatsApp / Download (FR-15, share bonus FR-17) | One-tap send is the 3-tap target; wa.me opens WhatsApp with a TEXT MESSAGE about the tool - the FILE is not attached. Seller still downloads, finds the file, attaches: 5 taps. [A - FR-15 semantics] | wa.me deep link behavior on Tecno/Infinix/Samsung (chooser, WhatsApp vs WhatsApp Business); download attribute on iOS Safari; 24h link expiry vs history re-download (dead link state). [B] | PRD user story 8 claims "share the optimized file... with one tap" - false as implemented; FR-15's "3 to 1 taps" is exaggerated; share URL must be live (noblur.app not owned). [A - 00-PERF 0] | ADD Web Share API with files (M-ADD-2); honest fallback copy; config-driven live URL (A-ADD-3); fix PRD FR-15 wording; expired-download honest state. |
| T11. Quota exhausted -> loss-aversion upsell; post-send feedback (FR-11/12) | Upsell copy leads with real cost of staying free; first-job exemption must visibly hold before any upsell. [A - PRD 12] | Fingerprint-cleared mid-day edge (PRD 26); share bonus idempotent once/day; feedback prompt must fire after SEND, not download. [B] | No fabricated scarcity/counters (AGENTS 3); upsell never appears before the first job completes. [A] | Trigger feedback off share (M-ADD-5); keep upsell copy data-driven; add quota edge cases to matrix. |

Joint conclusion on the flow: the pipe is sound (upload -> encode -> verify -> result),
and 05 makes it genuinely faster. The flow FAILS at the last 10%: T7 (video preset
timing undefined), T9 (video before/after frame missing), T10 (share button does not
deliver the file - the actual product promise). None are architectural; all three are
fixable in this build.

--------------------------------------------------------------------------------

# 4. THE AUDIT VERDICT (05-BUILD-SPEC vs PRD 36 + AGENTS.md)

## 4.1 Findings vs PRD Section 36 acceptance criteria

| ID | PRD 36 criterion | 05 status | Severity | Fix |
|----|------------------|-----------|----------|-----|
| F1 | Correctly pre-selected preset from smart defaults | Undefined timing for video (client lacks duration/orientation) | MAJOR | Q-ADD-7 (confirm preset post-analysis for video; 10/10 probe match test) |
| F2 | Adaptive engine + VMAF floor 80 | P1.1 preserves; P0.3 ladder may raise re-encode rate | MINOR | 20-clip regression becomes a gate check, incl. fast-preset pass rate |
| F3 | Share bonus exactly once/day | Untouched (existing code) | PASS | none |
| F4 | >90s splitting with downloadable segments | Untouched; 89/90/91 boundary tests not in 05 | MINOR | add boundary rows to Section 5 matrix |
| F5 | Custom 1-16MB within +/-10% or transparent explanation | Untouched; P1.3 rewrites the reason copy | PASS | none (keep A-ADD-4 sweep) |
| F6 | First job always completes with full before/after | Untouched | PASS | none |
| F7 | 6th job blocked, loss-aversion upsell, no login | Untouched | PASS | none |
| F8 | Verifiable source deletion, single code path | P1.4 keeps cron as sole authority - good | PASS | none (but see F9 copy conflict) |
| F9 | Download screen: size AND visual before/after | Video source frame never produced; source deleted per retention | MAJOR | Q-ADD-6 (extract source frame at analysis) |
| F10 | Primary action = Send to WhatsApp with prefilled share; download secondary | Spec silent; wa.me does not attach the file; FR-15 "3->1 taps" exaggerated | MAJOR | M-ADD-2 (Web Share with files); honest copy; fix PRD FR-15 wording |
| F11 | Goal-gradient progress, front-loaded, step countdown | P1.6b keeps honest - consistent | PASS | none |
| F12 | No bypass/AI copy anywhere | P1.3 aligns; NEW copy risk: P1.6a "No upload" is a false claim (not bypass, but dishonest - PRD 38 guardrail) | BLOCKER | A-ADD-1 (reword image trust line) |
| F13 | Marketing indexable + structured data; jobs noindex | P1.4 acceptance includes noindex check | PASS | extend sweep to structured data (A-ADD-4) |
| F14 | Lighthouse PWA + resumable upload on mid-range Android, throttled/interrupted 4G | 05 verifies via DevTools 3G + one real-phone test; interrupted real-3G on budget devices absent | MAJOR | Q-ADD-3 (field matrix as gate artifact) |

## 4.2 Findings vs AGENTS.md (Q2 locks and Q3 never-rules)

| AGENTS rule | 05 status | Severity | Fix |
|-------------|-----------|----------|-----|
| Q3.1 no bypass claims | PASS (P1.3 aligns copy) | - | but A-ADD-1: false "no upload" is a separate honesty breach (PRD 38, 04-R1) - BLOCKER |
| Q3.2 never call it AI | PASS | - | none |
| Q3.3 no fabricated stats/scarcity | PASS with caveat | MAJOR | data-saved must use ORIGINAL baseline (M-ADD-1/A-ADD-2), else it is fabricated |
| Q3.4 Pidgin everywhere | PASS with caveat | MINOR | P1.3/P1.6 copy examples are English in the spec; acceptance must enforce Pidgin + grep lang=pcm |
| Q3.5 no login | PASS | - | none |
| Q3.6/7 custom size 1-16MB + 400 on wrong preset | PASS | - | none |
| Q3.8 premium capped | PASS | - | none |
| Q3.9 first-job reciprocity | PASS | - | none |
| Q3.10 Flutterwave signature | PASS (Phase 2, untouched) | - | none |
| Q3.11 retention windows | CONFLICT: P1.6a "delete itself after 30 minutes" vs PRD 22 policy (completion +1hr grace; output 24h) | MAJOR | A-ADD-6 (make copy match policy or change policy to 30-min sweep) |
| Q3.12 deletedAt single writer | PASS (P1.4 keeps cron) | - | none |
| Q3.13 no third-party file use | PASS | - | none |
| Q3.14 no raw IP | PASS | - | none |
| Q3.15 magic-byte authority | PASS (client fast-fail advisory) | - | none |
| Q3.16 EXIF strip, orientation kept | PASS server-side; client re-encode drops EXIF anyway | MINOR | Q-ADD-2: bake orientation into pixels client-side, alpha passthrough |
| Q3.17 never upscale | VIOLATED by P0.2 as written (resize to preset long edge, no source guard) | BLOCKER | A-ADD-7 (min(source, preset) guard) |
| Q3.18/19 distinct retry paths, max 2 | PASS | - | none |
| Q3.20 no shell interpolation | PASS | - | none |
| Q3.21 jobs noindex | PASS (P1.4 acceptance) | - | none |
| Q2 VMAF 4s / SSIM secondary / floor 80 | PASS (P1.1 matches) | - | but PRD body text stale (FR-7, Section 13) - fix in A-ADD-5 |
| Q2 H.264 everywhere, AV1 not selected | PASS (05 keeps AV1 out) | MAJOR | PRD FR-16/Section 13 still say AV1 primary on document path - next builder may re-enable; A-ADD-5 |
| Q2 profiles/CRF locked | P0.3 overrides speedPreset at runtime - human-approved (04-D), consistent | MINOR | acceptance: VMAF floor + profile CRF/bitrate caps unchanged (already in P0.3) |

## 4.3 Additional audit findings (not rule-bound)

| ID | Finding | Severity | Fix |
|----|---------|----------|-----|
| F15 | P0.1 batch-presign endpoint: must retain server-side size/format allowlist + rate limiting before minting part URLs (new abuse surface; PRD 23) | MAJOR | AMEND P0.1 acceptance: presign-all validates same as today's endpoint |
| F16 | P0.4 "exactly ONE downloadFromR2" only holds on single-host; horizontal scaling (PRD 17) breaks it - fallback correct but acceptance overclaims | MINOR | AMEND P0.4 acceptance: "<=1 download; 0 when encode runs on the analysis host" |
| F17 | noblur.app not owned/DNS'd; P1.4 defers; share message + llms.txt + structured data must use the LIVE URL | MAJOR | A-ADD-3 |
| F18 | Product name inconsistent: "Noblur" (spec/files) vs "NoBlur" (PRD/AGENTS) | MINOR | A-ADD-8 |
| F19 | P1.2 premium priority shift is dead code in MVP (no premium users exist until Phase 2 billing) - harmless, note in code comment | MINOR | add comment; no behavior change |
| F20 | 05 has no error-path acceptance for P0.2 (canvas fail) or for expired download links from localStorage history after 24h retention | MINOR | Q-ADD-1 + expired-link honest state (T10) |

## 4.4 Bottom line

Two BLOCKERS (F12/A-ADD-1 false "No upload" claim; AGENTS 17/A-ADD-7 never-upscale
guard), seven MAJORs, six MINORs. All blockers and majors are copy, guards, one small
feature (Web Share file send), and doc sync - no architecture change required. The
spec's core bets (parallel upload, client image pre-compress, adaptive speed ladder,
verification cost cut, eu-west deploy, honest constants) are correct and evidence-
backed. Fix the blockers and majors, execute the field matrix, then re-submit the gate.

--------------------------------------------------------------------------------

# 5. TEST MATRIX ADDITIONS (field tests beyond 05's verify steps)

05 verifies locally (DevTools 3G, unit tests, e2e under load, Lighthouse, one real-
phone upload). PRD 36 criterion 14 and the Nigeria market require the following field
rows. Each: scenario | why | pass bar.

| # | Scenario | Why | Pass bar |
|---|----------|-----|----------|
| FM1 | Tecno Spark (Android 12, 2-3GB RAM), Chrome, throttled 3G 0.5-2Mbps: 50MB video upload, network killed at chunk 5, resumed after 20s | PRD 36.14 resumable recovery; budget device + 3G is the persona | Resumes from last confirmed chunk (no full restart); job completes; wall-clock <= PRD matrix target + 20% |
| FM2 | Infinix Hot 30, 12-48MP portrait JPEG from camera: P0.2 pre-compress | OOM/rotation bug class; orientation is a seller's product photo | Payload <=500KB; orientation correct; no crash; before/after uses ORIGINAL dims + size; data-saved = original delta |
| FM3 | Samsung A14, battery saver ON, tab backgrounded mid-upload | aggressive Android power management kills XHR/timers | Upload survives backgrounding or resumes on return; no silent fail; user sees "still dey go" state |
| FM4 | Chrome Data Saver / Lite mode, mid-range device | degrades images, blocks background fetch | Flow completes; comparison frames not visibly degraded below usable |
| FM5 | Samsung Internet (pre-installed, high NG share): full flow + PWA install | second-most-likely browser after Chrome | Install prompt works; upload/encode/share flow identical to Chrome |
| FM6 | UC Browser + Opera Mini (extreme mode): marketing pages + dashboard | proxy-mode browsers cannot run the PWA | SSR marketing readable; dashboard shows honest unsupported-state copy (no broken JS screen) |
| FM7 | iPhone SE/X, iOS 15-17 Safari: HEIC photo pick, MOV/HEVC 1080p60 video | 17.4% iOS share; HEIC/HEVC source handling | HEIC arrives as JPEG (or is rejected with clear Pidgin error); MOV/HEVC -> MP4/H.264 output; download attribute saves file; PWA install prompt |
| FM8 | Video 89s / 90s / 91s Status preset | PRD 26 off-by-one at the config ceiling | Splits exactly at ceiling; no 90s clip wrongly split, no 91s clip wrongly kept; segments play independently |
| FM9 | MKV, AVI, WebM, MP4/H.265 source -> MP4/H.264 output; garbage file rejected | allowlist coverage + magic-byte authority | All allowlisted formats probe+encode; garbage rejected with Pidgin error before queue |
| FM10 | PNG-with-alpha and animated GIF/WebP | PRD 15.5 alpha preservation; PRD 26 animated rejection | Alpha PNG stays transparent (client passthrough, server rule); animated rejected with clear message |
| FM11 | No-audio video; 5.1-audio video | audio budget edge cases (PRD 26) | No-audio: all bitrate to video; 5.1 downmixed stereo AAC <=128k; sizes converge on first pass |
| FM12 | 20-clip reference set regression: VMAF 4s + fast ladder vs baseline | P1.1/P0.3 must not move the quality bar | VMAF drift <1 point; floor-80 pass rate unchanged; wall-clock improvement quoted |
| FM13 | Real WhatsApp round-trip: send output to a second phone, ffprobe the received file | the ONLY test that validates the core promise (PRD 30) | Received file respects 720p/480p caps + duration; SSIM >= 0.05 better than sending the original at same delivered size; constants table still holds |
| FM14 | Share flow on Tecno/Infinix/Samsung: wa.me deep link + (if M-ADD-2) Web Share with file | one-tap send is the conversion promise | wa.me opens WhatsApp with prefilled message; Web Share attaches the file to the chosen chat on Chrome Android; WhatsApp Business also handled |
| FM15 | Quota edges: cookie-clear mid-day, 6th job, share bonus double-tap | PRD 26/FR-17 idempotency + soft-limit honesty | New fingerprint gets first-job exemption once (DB-level); 6th job blocked with loss-aversion upsell; bonus granted exactly once/day |
| FM16 | Low-storage device + iOS Safari private mode | output save failure; localStorage checkpoint throws | Clear Pidgin error + retry on save failure; private mode degrades to no-resume upload WITHOUT crashing |

--------------------------------------------------------------------------------

# 6. SOURCE / GRADE LIST

Primary artifacts reviewed (all read in full for this review):
- docs/NoBlur-PRD-v1.md (v1.2) - A (the authority on WHAT)
- docs/AGENTS.md - A (the authority on HOW + never-rules)
- research/00-PERF-DIAGNOSIS.md - A (live evidence: nothing deployed, U1-U4, O1-O9, L1-L5)
- research/01-PERFORMANCE-PLAYBOOK.md - A/B/C (verified constants: Status 90s A, 720p/480p + 64/100MB A, HD-not-for-Status A, 2GB document B; 16MB trigger [UNVERIFIED])
- research/02-COMPETITIVE-TEARDOWN.md - A (real competitive set; wa.me/share patterns; Squoosh local story)
- research/03-MARKET-UX-BRIEF.md - A/B/C (Nigeria stats B1-B13; UX patterns C1-C8; cost math)
- research/04-ENGINEERING-VETTING.md - A (S1-S10, F1-F9, R1-R6, D1-D4 amendments)
- research/05-BUILD-SPEC.md - A (the subject of this review)
- research/M2-DOSSIER.md - A (gate assembly)
- roles/market-analyst.md, qa.md, auditor.md - A (objection lenses)

Key external facts relied on (verified inside 01/03, not re-fetched this session):
- WhatsApp Status 90s ceiling - A (WABetaInfo 2025-04/05)
- Video caps 64MB/480p slow, 100MB/720p fast - A (WhatsApp FAQ)
- HD not available for Status - A (WhatsApp FAQ)
- Compression happens on sender device (client-side encode) - A (WABetaInfo 2025-10)
- 16MB "compression trigger" - [UNVERIFIED] (01-A4) - must not appear as fact
- Median mobile upload 11-16 Mbps; 1GB ~USD 0.39 - A (Ookla, Cable.co.uk via 03-B)
- Android 82.5%; Tecno/Infinix/Samsung ~48% - A (StatCounter via 03-B)
- iOS 17.4% - A (StatCounter via 03-B)

Claims made in this review and their basis:
- "wa.me share does not attach the file" - A (FR-15 describes a prefilled MESSAGE + link; the protocol sends text, not media; PRD itself contradicts user story 8)
- "P0.2 + P1.6a 'No upload' claim is false" - A (P0.2 text: server pipeline still validates the uploaded small file)
- "P0.2 upscales small sources" - A (P0.2 text: resized to preset long edge, no min guard; AGENTS 17)
- "Client cannot reliably know video duration pre-upload" - A (File object exposes size/type/name only; MP4 duration requires demux)
- "Safari private mode localStorage throws" - B (documented behavior; not re-tested this session)
- "Budget-browser accept-attr and empty file.type quirks" - B (field knowledge; not re-verified this session)
- "VMAF 4s/fast preset impact on re-encode rate" - C (judgement; needs the 20-clip run)
- Opera Mini / UC Browser share in Nigeria - [UNVERIFIED] (row FM6 remains valid as graceful-degradation insurance regardless)

-- End of department review --
