# DEPARTMENT REVIEW - UX + TRUST (Pre-Gate, 05-BUILD-SPEC.md)

Deliverable: DEPARTMENT-REVIEW-UX-TRUST.md
Date: 27 Aug 2026. Departments: Product Designer, Frontend, Trust Lead (Company OS roles).
Scope: review of 05-BUILD-SPEC.md (v2 speed + trust milestone) against PRD v1.x section 11 flow, AGENTS.md locked rules, and research 00-05 + M2. Plain ASCII. Every claim graded A-F with source.

## Headline findings (blunt)

- H1. The primary "Send to WhatsApp" button cannot attach the file. PRD FR-15 uses wa.me, which sends TEXT ONLY. The PRD's own user story (section 8: "share the optimized file directly to WhatsApp with one tap, so I don't have to download, open WhatsApp, and attach manually") is unimplemented as specced, and 05-BUILD-SPEC does not fix it. The centerpiece action of the product's one-button flow is a text-message button today. [A: PRD FR-15 vs PRD section 8; 03-C4]
- H2. 05 contradicts itself on privacy copy. P0.2 uploads a client-compressed image to the server; P1.6a then tells the user "Photo dey stay for your phone. No upload." Both cannot be true. As written, the spec ships a false claim - a direct AGENTS.md Rule 1 violation. [A: 05-BUILD-SPEC P0.2 vs P1.6a, same document]
- H3. The "Your video delete itself after 30 minutes" line (05 P1.6a) is a fabricated number that contradicts locked policy: sources are deleted immediately on job completion (timeout/failure + 1h grace), outputs after 24h (PRD section 22, AGENTS.md Rule 11). "30 minutes" violates AGENTS.md Rule 3 (no fabricated numbers). [A: 05 P1.6a vs PRD section 22 vs AGENTS.md Rule 11]
- H4. Preset selection happens AFTER upload (server-side analysis, PRD section 13 step 3), so a user can burn 50MB of 3G data uploading for a preset that is wrong for their file. Smart-default chips must render BEFORE upload from client-readable metadata (size, duration, orientation). [A: PRD section 11 step 5 vs section 13 step 3; 03-B4 data-cost math]
- H5. The quota-exhausted upsell has no MVP call to action. Pricing is Phase 2 (PRD section 27: "No price point is set, displayed, or hard-coded in Phase 1"), so the loss-aversion screen (FR-12) ends in a dead end - no payment, no unlock. The real MVP unlock exists (FR-17 share-bonus, +3 jobs) and is never wired into the exhausted state. [A: PRD FR-12 vs FR-17 vs section 27]
- H6. 05-BUILD-SPEC has no end-to-end flow section. It is a performance + copy spec; screen-level states, reconnect behavior, share attachment, and pre-upload preset timing are owned by nobody in the build. Every gap in section 3 below is a consequence. [A: 05 structure]

Gate recommendation: APPROVE WITH CONDITIONS. Blocking (must land with P0/P1): TR-A1 (honest copy), PD-A2 (pre-upload preset chips), PD-A3 (file-attaching share), TR-A4 (no dead-end quota). Everything else in section 2 is follow-up. Do not ship P1.6a copy as written.

---

## 1. PER-DEPARTMENT NEEDS

### Product Designer - what the product NEEDS from the design lens

| # | Need | Grade |
|---|------|-------|
| PD-N1 | The core flow must reach a shareable result in 3 taps: pick media -> preset (smart-defaulted) -> result+share. This is the verified competitor bar (SqueezeVid, Compresso) and the product's own goal (PRD section 5). | A (03-C3, 02) |
| PD-N2 | The preset decision must appear BEFORE upload so a wrong smart default can be corrected before any mobile data is spent; after-upload correction means the user pays twice. | B (derived from 03-B4 data math + PRD FR-2) |
| PD-N3 | Every wait (upload, processing, download) must show honest, phase-labeled progress with an ETA, never an unbounded spinner; Nigerian users on 3G measure tools against the clock and a fake or frozen bar burns trust instantly. | A (03-C6) |
| PD-N4 | The result screen must prove value visually: before/after frame slider, size badge, data-saved figure, with "Send to WhatsApp" as the dominant action and "Save to phone" secondary. | A (02 EMULATE, 03-C7) |
| PD-N5 | Empty, error, offline, and quota states must be designed, not incidental: Pidgin copy, a visible escape (retry / demo button), and zero dead ends. | B (PRD section 25 table exists but no screen states specced) |
| PD-N6 | Zero jargon in UI ("bitrate", "codec", "resolution" never appear) and native Pidgin copy throughout, per locked rules. | A (AGENTS.md Rule 4, PRD section 12) |

### Frontend - what the product NEEDS from the frontend lens

| # | Need | Grade |
|---|------|-------|
| FE-N1 | Upload must survive 3G (0.5-2 Mbps): parallel chunked upload with one batched presign call, per-chunk retry, and localStorage checkpoint resume. Today a 50MB file is 30+ serial network ops. | A (00 U1/U2, 05 P0.1) |
| FE-N2 | Images must be pre-compressed client-side so a 12MB camera photo uploads as roughly 300KB instead of full size. | A (00 U4, 05 P0.2) |
| FE-N3 | The app must paint fast on the target device class (Tecno/Infinix/Samsung budget Android, ~48% of the market): production build, cached quota with local mirror, lazy-loaded heavy components, deferred analytics. | A (00 L3/L4, 05 P1.5, 03-B7) |
| FE-N4 | Every screen needs defined states (idle / loading / empty / error / offline / success) plus a reconnect story: SSE with polling fallback and backoff, job ID persisted so a tab close or network drop does not lose the job. | B (PRD section 25 covers server errors, not client disconnect) |
| FE-N5 | File metadata probing must be client-side and instant (size, duration, orientation via object URL + video preload=metadata) so smart-default chips render before any upload. | B (feasibility: standard browser APIs; needed by PD-N2) |
| FE-N6 | Output delivery must be reliable on mobile: in-app download progress, shareable File object, and honest handling of the 24h retention expiry. | B (PRD section 22 retention vs history re-download) |

### Trust Lead - what the product NEEDS from the trust lens

| # | Need | Grade |
|---|------|-------|
| TR-N1 | Every user-facing claim must match real policy and real behavior: deletion timing, upload vs no-upload, resolution drops. Copy that overstates or fabricates numbers is a Rule 1/3 violation, not a copy nit. | A (AGENTS.md Rules 1, 3, 11 vs 05 P1.6a) |
| TR-N2 | The share button must do what it says: "Send to WhatsApp" must attach the file, and any referral sharing must be visibly separate, previewed, and user-confirmed. Bait-and-switch here kills the product's reason to exist. | A (PRD section 8 vs FR-15 contradiction; 03-C4) |
| TR-N3 | Never claim "never uploaded" for videos (server-side encode makes it false); the honest story is auto-delete plus no-retention. For images the honest story changed with P0.2 - the FULL-SIZE photo never leaves, but a compressed copy does. | A (04 R1, AGENTS.md Rule 1, 05 P0.2) |
| TR-N4 | Trust signals must appear at the point of upload, not buried in a policy page: one-line statement, policy link, EXIF/GPS-strip disclosure for images, "we no dey post to WhatsApp for you". | A (PRD section 24, 03-C1/C5) |
| TR-N5 | Quota and upsell screens must never dead-end the user or fabricate numbers: MVP has no price, so the exhausted state needs real options (share-bonus, tomorrow reset, honest waitlist), not a fake "upgrade" CTA. | A (AGENTS.md Rule 3, PRD section 27) |
| TR-N6 | The share-for-credits loop (FR-17) must be transparent: user sees and controls the message before it sends; the bonus grant is idempotent and honestly labeled. | B (FR-17 mechanics exist; UX not specced) |

---

## 2. PER-DEPARTMENT ADDS TO THE SPEC

Verdict legend: APPLY NOW / FUTURE SCOPE / REJECT. "AMEND" = changes something already in 05-BUILD-SPEC or PRD 11.

### Product Designer adds (8)

| ID | Item | What / Why / Files | Verdict |
|----|------|--------------------|---------|
| PD-A1 | ETA on progress (AMEND 05 P1.6) | Add "About X more minute" to the processing screen, derived from real measured stage durations (first value: none until RUM data exists - never invent an ETA). Users on 3G time you (03-C6). Files: lib/progress-stages.ts, dashboard-client.tsx. | APPLY NOW (amends P1.6) |
| PD-A2 | Pre-upload smart-default chips | Move preset selection BEFORE upload: probe size/duration/orientation client-side (object URL + video metadata), render Status/Chat/Custom chips with the smart default pre-selected, one-tap change, zero jargon. Wrong preset then costs one tap, not 50MB of re-upload. Files: dashboard-client.tsx, lib/smart-defaults.ts (add client-probe input), new lib/client-probe.ts. Amends PRD section 11 steps 5-6 ordering. | APPLY NOW |
| PD-A3 | File-attaching share + separate referral (AMEND FR-15) | "Send to WhatsApp" must deliver the FILE: Web Share API navigator.share({files}) on Android Chrome (works, no new stack, Level 2 file share is distinct from the share-TARGET rejected in 04-F7), fallback to download + "open WhatsApp and attach" steps. The wa.me referral becomes a separate, clearly-labeled "Share Noblur" button (credit per FR-17). Files: components/ResultCard.tsx, lib/whatsapp-share.ts. | APPLY NOW |
| PD-A4 | Relocate onboarding (AMEND FR-13 placement, PRD section 11 step 2) | The two preference questions currently sit between the CTA and the file picker, adding a tap to the 3-tap budget for every new user. Move them to after the first successful result (post-value, where IKEA effect lands best) or a non-blocking bottom sheet on the result screen. Copy unchanged, still skippable, still non-gating. Files: app/onboarding, dashboard-client.tsx. | APPLY NOW |
| PD-A5 | Designed offline/error/empty states | Map PRD section 25's error table to concrete screen states: offline banner on dashboard when /usage fails, Pidgin empty state with the demo button (P2.4), error state with retry on every step. Files: components/ui/EmptyState.tsx, components/ui/Toast.tsx, dashboard-client.tsx. | APPLY NOW |
| PD-A6 | Upload-time + data-cost estimate before commit | Before the user taps Optimize, show an honest range: "This go take about X-Y minutes for your network" computed from real file size and navigator.connection.downlink, plus "you go use about X MB". A range, never a fake precision. Files: dashboard-client.tsx, lib/api-client.ts. | APPLY NOW |
| PD-A7 | Advanced quality/size sliders in result | Would violate zero-jargon (PRD section 12) and AGENTS.md Craft Bar 1 (zero optional toggles); Custom preset already covers size control. | REJECT |
| PD-A8 | PWA as Web Share target (user picks Noblur from WhatsApp's share sheet) | Real value, but needs install + platform quirks; already deferred to Phase 3 (04 F7, PRD section 33). | FUTURE SCOPE (trigger: install rate data) |

### Frontend adds (8)

| ID | Item | What / Why / Files | Verdict |
|----|------|--------------------|---------|
| FE-A1 | Adaptive chunk size (AMEND 05 P0.1) | 5MB chunks on 3G 0.5 Mbps = ~80s per chunk; a dropped chunk costs a full retry. Pick chunk size from navigator.connection: 2MB on slow, 5MB default; keep concurrency 4-6 and checkpoint resume. Files: dashboard-client.tsx, lib/api-client.ts. | APPLY NOW (amends P0.1) |
| FE-A2 | SSE reconnect + job restore | SSE over 3G drops constantly. Add exponential-backoff reconnect, polling fallback, and persist jobId in localStorage so a tab close mid-job restores state from GET /jobs/:id on return (job continues server-side). Files: lib/api-client.ts, dashboard-client.tsx, lib/job-history.ts. | APPLY NOW |
| FE-A3 | Quota cache invalidation (AMEND 05 P1.5) | The 30s Redis TTL + localStorage mirror must refresh on job submit/complete, or the UI shows stale "5 jobs left" after using one. Explicit event: mirror updates on job_completed, share-bonus claim. Files: dashboard-client.tsx, lib/api-client.ts. | APPLY NOW (amends P1.5) |
| FE-A4 | Download progress + wake lock | 15MB blob download over 3G with no progress feels dead; stream fetch -> blob with a progress bar. Use Screen Wake Lock during upload/processing so the screen does not sleep mid-job. Files: dashboard-client.tsx, components/ResultCard.tsx. | APPLY NOW |
| FE-A5 | Performance budget as acceptance (AMEND 05 P1.5) | Add measurable gate: dashboard initial JS <= 170KB gzip, LCP <= 2.5s on throttled 4G, no layout shift on status transitions. Without numbers, P1.5's "report before/after" is unenforceable at gate. Files: next.config.ts, gate checklist. | APPLY NOW (amends P1.5 acceptance) |
| FE-A6 | Queue-aware analysis skip (AMEND 05 P2.2) | P2.2 skips OpenCV scene analysis for images; extend to videos when queue depth is high (ffprobe-only + balanced profile default). Keeps the VMAF floor as the quality gate. Flag at gate as a behavior amendment to AGENTS.md Q2 scene-analysis wording. Files: workers/analysis-worker.ts, lib/analysis.ts. | APPLY NOW (amends P2.2; gate flag) |
| FE-A7 | Service-worker offline processing queue | Processing is server-side; an offline queue implies local processing (04 F1) or fake local progress. Offline shell for landing/marketing only. | REJECT |
| FE-A8 | WebCodecs client-side video pre-transcode | 10-20MB WASM / battery drain / no VMAF gate client-side; images already get the client treatment (P0.2). | FUTURE SCOPE (trigger: >50% users on 4G+, per 04 F1) |

### Trust Lead adds (8)

| ID | Item | What / Why / Files | Verdict |
|----|------|--------------------|---------|
| TR-A1 | Policy-true deletion copy (AMEND 05 P1.6a) | Replace "Your video delete itself after 30 minutes" with "Your video delete itself as soon as we finish. Nothing dey stay." (matches PRD section 22 / AGENTS.md Rule 11). Replace image copy "Photo dey stay for your phone. No upload." with "We shrink am for your phone first. The full-size photo no dey leave your phone." (matches P0.2 reality - a compressed copy IS uploaded; claiming otherwise is Rule 1 violation). Files: drop zone + result card copy strings. | APPLY NOW (amends P1.6a; blocking) |
| TR-A2 | Upload-point privacy block | At the upload step: one-line trust statement + privacy policy link (PRD section 24), image line "We remove location data from your photo" (EXIF/GPS strip, PRD section 15), persistent "We no dey post to WhatsApp for you" (PRD section 12). Files: drop zone component, /privacy page, Pidgin strings. | APPLY NOW |
| TR-A3 | Mandatory resolution-drop disclosure | When the quality-triggered retry dropped resolution, the result card must show it non-dismissibly ("We reduce am small so e go still sharp") with the Fine Detail re-run option. PRD section 11 step 9 has a "non-intimidating notification" - upgrade it to a visible result-card element, not a toast. Files: components/ResultCard.tsx, lib/growth-ux.ts. | APPLY NOW (amends PRD 11 step 9) |
| TR-A4 | No dead-end quota state | Quota-exhausted screen: primary CTA "Share Noblur, get 3 more today" (real, FR-17), secondary "come back tomorrow, your free jobs reset", tertiary honest premium "dey soon" (no price - Phase 2), plus the loss-aversion lead built from real data (FR-12). No fabricated urgency (AGENTS.md Rule 3). Files: dashboard-client.tsx, lib/growth-ux.ts. | APPLY NOW (blocking) |
| TR-A5 | Share preview + confirm | The referral share renders the actual message in-app before opening WhatsApp: branded noblur.app link (never a shortener, PRD section 8), honest description, no "bypass" language, user taps confirm. Distinct from the file share (PD-A3). Files: lib/whatsapp-share.ts, components/ResultCard.tsx. | APPLY NOW (amends FR-15) |
| TR-A6 | Data-saved qualifier (AMEND 05 P1.6c) | "You just save about X MB" from the real delta with "about" qualifier; never convert to NGN money claims (per-operator prices [UNVERIFIED], 03-B2). Files: lib/growth-ux.ts dataSaved helper, result card. | APPLY NOW (amends P1.6) |
| TR-A7 | "Never uploaded" claim for videos | Impossible with server-side encode; would violate AGENTS.md Rule 1 and 04 R1. The auto-delete story (TR-A1) is the honest alternative. | REJECT |
| TR-A8 | Deletion receipt / verifiable-deletion UI | "Show me my file don delete" - real trust value, but scope creep for MVP; deletion already verifiable server-side (single cron path). | FUTURE SCOPE (trigger: post-launch trust/activation metric) |

---

## 3. THE ONE-BUTTON-TO-OUTPUT FLOW REVIEW (joint)

Flow walked: single primary Upload button -> file picked -> preset -> Optimize -> upload -> processing -> result -> share. Every row notes states, mid-range-Android/3G risk, trust message, what the user sees during processing, and the minimum needed to end in an actual share. Gaps are flagged against PRD 11 + 05 with a concrete fix.

| Step | Screen | UX lens | Frontend lens | Trust lens | Gap + fix |
|------|--------|---------|---------------|------------|-----------|
| 1 | Landing (marketing, SSR) | One primary CTA ("Upload Media"), one decision, Pidgin hero, demo button visible (P2.4) so first-run value is one tap away (03-C8). States: idle, loading, offline. | SSR/SSG (already locked), LCP < 2.5s throttled 4G, analytics deferred so it never blocks paint (05 P1.5d). | Hero must state the honest promise (survive WhatsApp compression, never "bypass") and the first trust line above the fold: "We no dey keep your files. We no dey post for you." (PRD section 12, 03-C1/C5). | Gap: no spec for hero copy or demo-button placement (P2.4 exists but placement unspecified). Fix: PD-A4 note + homepage placement for P2.4; trust line as a designed component, not a footnote. |
| 2 | Dashboard shell (quota + history load) | Skeleton, not spinner; quota visible instantly so the user knows they can work. States: loading, offline (cached), error. | Cached quota from localStorage mirror + 30s Redis cache, background sync (05 P1.5b); mirror must refresh on job events (FE-A3); bundle under budget (FE-A5). | Quota number must be real and current; a stale "5 jobs left" is a small honesty breach (AGENTS.md Rule 3). | Gap: offline state of dashboard unspecced; quota mirror invalidation unspecced. Fix: FE-A3 + offline banner (PD-A5). |
| 3 | Onboarding (new user, 2 questions, skippable) | Extra step before value breaks the 3-tap budget (03-C3). Should appear after first result, not before upload (IKEA effect works on users who already got value, PRD FR-13). States: idle, skip. | Instant render; POST /onboarding is fire-and-forget, must never delay upload start (100ms/300ms rules, PRD section 10). | Microcopy must explain why: "We go use your answer make the app better for you. No login, no email." Answers optional and non-gating (FR-13). | Gap: placement (PRD 11 step 2) adds a tap pre-value. Fix: PD-A4 (relocate after first job). |
| 4 | File picker + client validation | Big tap targets, "Pick photo or video" + camera shortcut, accept attrs; fast fail on format/size in Pidgin with an honest upgrade note (no dead CTA). Empty state has demo button. States: idle, picking, validating, error (unsupported format / >50MB / animated WEBP). | accept="video/*,image/*"; metadata probe client-side (object URL + preload=metadata) to drive smart defaults (FE-N5); validation from lib/file-validation.ts; no full-file read that janks the main thread. | At pick time, first upload disclosure: what leaves the device, what is deleted when (TR-A2). Oversize (>50MB free): honest message "free limit na 50MB; premium go allow 500MB" - no fake upgrade CTA (pricing is Phase 2). | Gap: PRD 11 step 5's analysis is server-side post-upload, so the preset cannot render here. Oversize dead-end (PRD section 25 says "show upgrade prompt" but no upgrade exists in MVP). Fix: PD-A2 client probe + honest oversize copy. |
| 5 | Preset chips (smart default pre-selected) | Chips render pre-upload: "For Status", "Chat video", "My own size" (zero jargon, PRD section 12); one-tap change; Custom bounded 1-16MB with the honest media-vs-document copy (05 P1.3). States: idle, selected. | Chips respond <100ms (PRD section 10); no re-render jank; Custom stepper is a simple bounded input. | Chip labels must not promise bypass; Custom copy must be the verified-truth wording from 05 P1.3 (no "16MB trigger" claim, which is [UNVERIFIED] - 04 R6). | Gap: chips not placed pre-upload anywhere in 05 (server analysis owns the heuristic). Fix: PD-A2; smart-default accuracy stays a tracked metric (PRD section 29). |
| 6 | Optimize commit + upload | One commit tap; honest % with phase labels; pre-commit ETA and data-cost range (PD-A6); screen must not sleep (wake lock, FE-A4). States: uploading, paused (interrupted), resumed (checkpoint), error, retry. | Parallel chunks + batched presign (05 P0.1), adaptive chunk size (FE-A1), checkpoint resume after reload, 5x capped retries; images go through P0.2 pre-compression first. | Disclosure at first upload: policy link + one-line statement (TR-A2). For images, copy must match P0.2 reality - full-size photo stays local, compressed copy uploads (TR-A1). For videos: "we upload am, process am, delete am as soon as we finish." | Gap: P0.2 vs P1.6a copy contradiction (H2) - a user-visible lie. Fix: TR-A1 (blocking). Gap: no upload ETA. Fix: PD-A6. |
| 7 | Processing (queued -> analyzing -> encoding -> verifying) | Stage labels + goal-gradient % + step countdown (FR-8) are honest because stages are real (05 P1.6b); add ETA (PD-A1); never a frozen bar; "still processing" on worker restart (PRD section 25). States: queued, analyzing, encoding, verifying, error, failed (timeout), offline. | SSE with reconnect + polling fallback; jobId persisted; tab close = job continues, restore on return (FE-A2); dedupe double-submit (PRD section 26); handle 5-min timeout with an honest "e too long, try again" state. | Stage names in Pidgin and truthful ("De dey make am ready"); the front-loaded % must track real stages, never fake (03-C6); no claim that processing happens on-device for video (04 R1). | Gap: no client-reconnect spec in 05; no restore-on-return spec. Fix: FE-A2. Gap: timeout UX only in PRD error table, not built. Fix: PD-A5 error state. |
| 8 | Done: before/after comparison | Result card centerpiece: frame slider + size badge ("42MB -> 15.8MB") + "You just save about X MB" (05 P1.6c) + "you don lose much quality" only where true; Fine Detail notice visible when resolution dropped (TR-A3). States: success, partial (retry hit ceiling, e.g. "18.2MB instead of 16MB" - PRD section 25), split (multi-segment). | Thumbnails, not full frames, for the comparison (data cost on 3G); slider preloaded before render; component lazy-loaded (05 P1.5c); results paint <100ms after DONE. | Comparison must not hide a resolution drop; data-saved from real delta with "about" qualifier (TR-A6); no "bypass" framing anywhere on the card. | Gap: before/after FRAMES are never specced - who extracts them, where they are served (job response has sizeBytes only, PRD section 18). Fix: server thumbnail extraction (ffmpeg frame grab) + presigned thumbnail URLs in GET /jobs/:id outputs. |
| 9 | Share: Send to WhatsApp / Save / Share Noblur | Primary = green WA-glyph "Send to WhatsApp" that actually delivers the file; secondary "Save to phone"; tertiary "Share Noblur, get 3 more" (FR-17). States: sharing, download-in-progress, unsupported (fallback), success. | File share via navigator.share({files}) on Android Chrome; requires the blob downloaded client-side first (FE-A4 progress); detect canShare({files}) and fall back to download + attach instructions. | The file share must attach the file (TR-N2); the referral share must preview the message with noblur.app link, user-confirmed, never auto-post (TR-A5, PRD section 12); bonus grant idempotent (FR-17). | Gap (H1): FR-15's wa.me sends text only; the file never attaches; 04-F7 rejected only the share-TARGET, not share-OUT. Fix: PD-A3 (blocking). Without it the flow ends in the exact 3-step friction the product exists to remove (03-C4). |
| 10 | Quota exhausted (if hit, not first job) | Loss-aversion lead from real data (FR-12): "You don finish your 5 free jobs today"; options, not dead ends. States: quota_exhausted, bonus claimed, reset tomorrow. | Accessible modal, no layout shift; share-bonus call idempotent (FR-17); optimistic UI within 300ms (PRD section 10). | No price shown (Phase 2, AGENTS.md Rule 3); primary CTA = share-bonus unlock; "come back tomorrow" honest; premium "dey soon" waitlist, no fake urgency. | Gap (H5): upsell has no MVP CTA. Fix: TR-A4 (blocking). Gap: PRD 11 step 12 never mentions FR-17 as the exhausted-state path. |
| 11 | Post-send feedback + history | Optional thumbs up/down ("E sharp after you send am?") closing the loop (PRD 11 step 13); history list with re-download in Pidgin. States: idle, submitted, expired. | localStorage history with TTL (job-history.ts exists); re-download checks expiresAt (24h retention); expired entry shows honest "file don expire". | Feedback must never nag; history is local-only (privacy); no fabricated stats in "other users" framing (AGENTS.md Rule 3). | Gap: expired re-download UX unspecced (retention is 24h - PRD section 22). Fix: honest expired state + remove entry (FE-N6). |

### Minimum the flow needs to end in the user actually sharing the file

1. A file-attaching share path: navigator.share({files}) where supported, else download + explicit attach steps. (PD-A3, blocking)
2. The output downloadable within the 24h window with visible progress. (FE-A4)
3. Honest, ETA-bearing status during upload + processing so the user stays on the page. (PD-A1, PD-A6, FE-A2)
4. Trust copy that matches reality at every step (no "no upload" lie, no "30 minutes" lie). (TR-A1, TR-A2)
5. Preset decided before upload so no data is wasted on a wrong preset. (PD-A2)
6. Quota exhausted = a real unlock, not a wall. (TR-A4)

---

## 4. VERDICT - 5 THINGS THAT MAKE AMAKA ABANDON THE FLOW

Amaka: online clothing seller, Tecno/Infinix-class Android, 3G/4G, records product videos, no editing skill, pays for mobile data (03 section 7.1, 03-B4).

| # | Abandonment trigger | Why it happens today | Fix | Grade |
|---|---------------------|----------------------|-----|-------|
| 1 | "E don hang" - upload takes minutes with no honest signal | Serial 5MB chunks over 3G (00 U1/U2) + a progress bar that crawls or a spinner that sits; on 3G users time you against the clock (03-C6). | 05 P0.1/P0.2 + FE-A1 adaptive chunks + PD-A6 ETA/data range + FE-A2 reconnect. Verify real timings at gate (00 section 7), never paper numbers. | A (00 U1/U2, 03-C6) |
| 2 | The big green button lied - "Send to WhatsApp" did not attach her file | FR-15 wa.me sends a text message; the file needs download -> open WhatsApp -> attach, the exact friction she came to escape (03-C4; PRD section 8). | PD-A3: file share via Web Share API with honest fallback; referral separated and labeled. Blocking. | A (PRD section 8 vs FR-15) |
| 3 | She catches a trust lie - copy says "no upload" but her data left the phone | P0.2 uploads a compressed image while P1.6a claims "No upload."; "30 minutes" deletion contradicts real policy. One caught lie poisons every other promise (AGENTS.md Rules 1, 3). | TR-A1 exact copy amendments (blocking) + TR-A2 disclosure block. | A (05 P0.2 vs P1.6a; PRD section 22) |
| 4 | Wrong preset burns her data - uploads 40MB, gets the wrong treatment | Smart default computed server-side AFTER upload (PRD 11 step 5 vs 13 step 3); if it guesses wrong (e.g. landscape video that needed Chat auto-defaults wrong, or Status vs Chat confusion), she re-uploads or sends a bad file. | PD-A2 pre-upload chips from client probe; smart-default accuracy tracked (PRD section 29). | B (derived from A-grade data-cost facts) |
| 5 | She hits the wall - 6th job, upsell with nothing to buy | FR-12 loss-aversion screen leads to a CTA with no price and no payment until Phase 2 (PRD section 27); the only real unlock (FR-17 share-bonus) is never offered there. She closes the tab and never returns. | TR-A4: share-bonus primary CTA, tomorrow-reset, honest waitlist; no fabricated numbers (AGENTS.md Rule 3). | A (FR-12 vs FR-17 vs section 27) |

Note: the first-job reciprocity exemption (FR-11) already guarantees Amaka's very first job completes with full before/after - that is the one part of the flow that is unambiguously right for retention. Do not touch it.

---

## 5. SOURCE / GRADE LIST

| Source | Used for | Grade |
|--------|----------|-------|
| NoBlur-PRD-v1.md (v1.2) | FR-2/8/11/12/13/15/17, sections 5, 8, 10, 11, 12, 18, 22, 24, 25, 27, 29, 33 | A (project source of truth) |
| AGENTS.md (NoBlur build rules) | Rules 1, 3, 4, 5, 11; Craft Bar 1-3; Q2 locked choices | A (locked) |
| 00-PERF-DIAGNOSIS.md | U1/U2/U4, L3/L4, O1/O3/O5 - upload/encode/load bottlenecks | A (code + live evidence) |
| 01-PERFORMANCE-PLAYBOOK.md | A1-A3 verified WhatsApp constants; B3/B4 speed data | A/B |
| 02-COMPETITIVE-TEARDOWN.md | EMULATE/AMPLIFY/FIX/IMPROVE; competitor share/preview/trust patterns | A (live fetches) |
| 03-MARKET-UX-BRIEF.md | Amaka persona, C1-C8 UX patterns, B4 data-cost math, "measure against the clock" (C6) | A (verified) / B (derived) / F ([UNVERIFIED] list) |
| 04-ENGINEERING-VETTING.md | S1-S10 verdicts; R1/R6 rejections; F1/F7 future scope; D locked amendments | A/B |
| 05-BUILD-SPEC.md | P0.1-P2.4; P1.6 copy; the object of this review | A (this document) |
| M2-DOSSIER.md | Decision log, cost, risks | A/B |
| Web Share API file support (Android Chrome) | Basis for PD-A3 feasibility | B (stable platform knowledge, not re-fetched this session) |
| Per-operator NGN data prices, WhatsApp NG user count | Explicitly NOT used in any proposed copy | F ([UNVERIFIED], 03) |

Unverifiable items flagged: "16MB compression trigger" (04 R6), WhatsApp exact bitrates (01 A4), NGN money claims (03 B2) - none of the adds in section 2 depend on them; every copy string proposed uses verified policy facts or "about"-qualified real deltas.
