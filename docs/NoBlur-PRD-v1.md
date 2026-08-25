# NoBlur — Product Requirements Document

**Version:** 1.1
**Status:** Milestone Update — Adaptive Engine Implemented

**Revision note (v1.1):** Records the adaptive encoding engine milestone shipped after the v1.0 "Final — Ready for Implementation" baseline: scene analysis (FR-16), policy-selected encoding profiles (FR-16), AV1 + VMAF quality gating (replacing the earlier "H.264 only / VMAF is Phase 2" constraints), job destinations, and share-for-credits (FR-17). Section 21 now mirrors the shipped Prisma schema.

---

## 1. Executive Summary

NoBlur is a mobile-first Progressive Web App (PWA) that prepares photos and videos for WhatsApp so they survive WhatsApp's own compression with the least possible visual quality loss. Users upload media, get a smart default destination pre-selected for them (WhatsApp Status, WhatsApp Chat, or a custom target size), and NoBlur runs an automated FFmpeg-based optimization pipeline — resolution, bitrate, codec, and container selection — tuned specifically to how WhatsApp re-compresses media. The user downloads a file that is measurably sharper after being sent through WhatsApp than the unprocessed original would be.

NoBlur does not bypass, disable, or trick WhatsApp's compression. It never claims to. It pre-optimizes media so that whatever compression WhatsApp applies afterward has less damage to do.

**Measurable quality bar:** "As good as possible" is defined concretely — NoBlur's output, after passing through actual WhatsApp compression, must score at least 0.05 higher on SSIM than an unprocessed original sent at the same final delivered file size, measured against a fixed 20-clip reference test set before launch (Section 13, Section 36). This bar is enforced by a working SSIM verification step (`lib/pipeline.ts`), not just a target on paper.

## 2. Product Summary

- **Name:** NoBlur
- **Form factor:** Mobile-first PWA (installable, offline-shell, no app store dependency)
- **Core promise:** "Upload your media. Download a WhatsApp-ready version that looks as good as possible."
- **Core mechanism:** Server-side FFmpeg pipeline that analyzes source media and re-encodes it with WhatsApp-aware settings (resolution caps, bitrate ladders, codec choice, container, and — for Status videos over the length ceiling — automatic splitting).
- **No login for MVP.** Freemium usage limits tracked by device/session fingerprint + IP — an intentional soft, best-effort limit, not an abuse-proof system (Section 27).

## 3. Problem Statement

WhatsApp aggressively re-compresses every photo and video sent through Chat or Status to keep bandwidth and storage costs low. Most users upload media that is poorly matched to WhatsApp's re-encoding behavior (wrong resolution, wrong bitrate, incompatible codec/container, wrong duration for Status), so WhatsApp's compression pass causes visible artifacts, blur, banding, and blockiness. Users have no visibility into or control over WhatsApp's pipeline, and manually tuning export settings in a video editor requires technical knowledge most users don't have and don't want.

## 4. Opportunity

Generic compression tools — HandBrake, CapCut's social export presets, generic "video compressor" mobile apps — are not WhatsApp-aware. They compress to a size or a generic social-media preset but don't target WhatsApp's specific re-encode thresholds (its own resolution ceilings, bitrate behavior, and duration limits). No existing consumer product is built solely around "match your output to how WhatsApp itself will re-encode it." That specific, defensible gap is what NoBlur is built on, and it is validated post-launch via the feedback loop in Section 29, not assumed indefinitely.

Every WhatsApp user who has ever said "why does my video look so bad after I send it" is a potential user; small business owners and online sellers who depend on WhatsApp as a storefront are the most quality-sensitive segment, since blurry product media directly costs them sales.

## 5. Goals

- Let a non-technical user get a WhatsApp-optimized file in under 3 taps, with the preset pre-selected by smart defaults (Section 12).
- Meet a defined performance test matrix, not a single arbitrary clip length:
  - 15s clip, 720p source → under 12s processing
  - 60s clip, 720p source → under 20s processing
  - 90s clip, 1080p source → under 35s processing
    (Targets for standard worker hardware; validated in Milestone 5.)
- **Interaction responsiveness (addition):** Any user tap that does not require a network round trip (preset chip selection, onboarding skip button, file picker open) must respond with a visible UI change within **100ms** — the threshold below which a UI change feels instantaneous. Any tap that does require a network round trip (submit job, load usage) must show an optimistic UI update within **300ms**, with a loading state if the real response takes longer. These are initial targets, to be tuned from real RUM data in Phase 2 — not locked numbers.
- Measurably reduce visible compression artifacts versus uploading the original file directly (Section 1's SSIM bar).
- Support both video and image workflows with the same simple UX.
- Build a sustainable freemium funnel (free daily quota → premium high-cap tier) using proven conversion patterns rather than a generic paywall (Section 12).

## 6. Non-Goals (MVP)

- No generative AI enhancement, no AI upscaling, no frame interpolation. The processing pipeline is deterministic rule-based logic and a bitrate formula (Section 13), not machine learning — it is never marketed as "AI."
- No native iOS/Android app (PWA only).
- No direct WhatsApp API integration or auto-send. Output is a downloadable file only.
- No user accounts/login in MVP (deferred; Section 33).
- No editing features (trim, filters, captions, stickers) beyond what's required for Status splitting.
- No support for formats outside the confirmed list (MP4, MOV, AVI, MKV, JPEG, PNG, WEBP).
- No public/programmatic API for bulk or automated access in MVP — web UI only, rate-limited.

## 7. User Personas

**7.1 Amaka — Online Seller (primary)**
Sells clothing via WhatsApp Status and Business chat broadcast lists. Records product videos on her phone. Cares about products looking sharp; has no video editing skill. Uses NoBlur on mobile data on a mid-range Android device with variable 3G/4G connectivity — this constraint directly shapes the NFRs in Section 10.

**7.2 Tunde — Small Business Owner**
Sends promotional videos/flyers to customer broadcast lists. Occasionally batches multiple files (premium use case). Time-poor; wants a "just make it good" button.

**7.3 Zara — Digital Marketer / Content Creator**
Manages WhatsApp channels/status for a brand. Needs consistent, predictable output quality and sometimes needs a specific target file size to fit multi-slide Status campaigns.

**7.4 Chidi — Everyday User**
Sends birthday videos, family clips, memes. Wants zero-configuration: upload, download, done.

**Network/regional context:** The primary launch market for these personas has variable, often constrained mobile connectivity. This is an explicit NFR (Section 10), not an afterthought — it directly requires resumable/chunked upload as a Phase 1 feature.

## 8. User Stories

- As a user, I want to upload a video and have the right preset already selected for me, so I don't have to think about it.
- As a user, I want to override the suggested preset if it's wrong for my file.
- As a user, I want to specify an exact target file size within a realistic WhatsApp-relevant range so I have control for a specific need.
- As a user, I want to see a progress indicator during processing so I know the app hasn't frozen, and I want it to feel like it's moving toward a finish line, not stuck.
- As a user, I want to see a visual before/after comparison, not just a size number, so I can actually see why this is better than sending the original.
- As a user, I want to download the optimized file directly to my device.
- As a user, I want to share the optimized file directly to WhatsApp with one tap, so I don't have to download, open WhatsApp, and attach manually.
- As a user, I want the WhatsApp share message to include a trusted, branded link (noblur.app), not a suspicious-looking URL shortener.
- As a user, I want my very first use of the app to show me full value, even if I'm on the free tier, so I know it's worth coming back to.
- As a free user, I want to know how many free jobs I have left today, and if I run out, I want to understand what I'm giving up by not upgrading, not just what I'd gain.
- As a premium user, I want to upload multiple files at once and get all of them processed, within a fair daily cap.
- As a user, I want confidence that my uploaded file will be deleted and not stored indefinitely, and I want that deletion to actually be verifiable.
- As a user on a slow connection, I want my upload to resume if it's interrupted, not fail and force a full restart.

## 9. Functional Requirements

**FR-1 Upload:** Accept single or (premium) multi-file upload via file picker or drag-drop. Enforce format allowlist and size ceiling (Section 10). Upload must support resumable/chunked transfer.

**FR-2 Smart Default Preset Selection:** On file analysis, the system pre-selects the most likely-correct preset — WhatsApp Status, WhatsApp Chat, or Custom Target Size — using the heuristic implemented in `lib/smart-defaults.ts`: portrait video under the current Status duration ceiling defaults to Status; landscape or over-ceiling defaults to Chat; small portrait images default to Status, other images default to Chat. The user sees this as a pre-selected, one-tap-to-change chip rather than a blank decision (see Section 12, "Smart Defaults"). Custom Target Size is bounded **1–16MB**, matching WhatsApp's actual media-message compression trigger — not an arbitrary ceiling. UI copy explains: "For files larger than this, WhatsApp sends as a document instead of compressing — that's a different use case than what this tool optimizes for."

**FR-3 Media Analysis:** System probes the file (via `ffprobe`) for resolution, duration, codec, bitrate, container, frame rate, and (for images) dimensions/format. Implemented in `lib/pipeline.ts`'s `probe()`.

**FR-4 Automatic Parameter Selection:** System computes target resolution, bitrate, codec, and container from analysis + preset, per Section 14 logic and the Section 16 config table (`config/platform-limits.json`). No user-facing sliders for these values in MVP.

**FR-5 Compression Execution:** FFmpeg job runs server-side in a worker process, queued via BullMQ. Implemented in `lib/pipeline.ts`'s `encode()`.

**FR-6 Video Splitting:** If preset is "WhatsApp Status" and source duration exceeds the current Status per-item duration ceiling (90 seconds, per `config/platform-limits.json`), the system automatically splits into sequential segments, each independently optimized. This is a secondary/minority-case feature, not a headline Phase 1 workflow, since most user clips fall under the current 90-second ceiling.

**FR-7 Quality Verification — two distinct retry paths (implemented in `lib/pipeline.ts`'s `runPipeline()`):**

- **Size-triggered retry:** if output file size is outside tolerance (±10%) of target, adjust bitrate by the measured delta (`lib/bitrate.ts`'s `adjustBitrateForSizeRetry`) and re-encode.
- **Quality-triggered retry:** if the SSIM check (sampled at fixed 2-second intervals across the full duration, `lib/pipeline.ts`'s `measureSSIM`) flags degradation below a 0.90 floor, drop one resolution tier (`lib/resolution.ts`'s `dropOneResolutionTier`) and recompute bitrate — a different corrective lever than the size path, since re-encoding at the same bitrate would reproduce the same artifacts.
- **Fine Detail Mode override:** If a user prefers original screen resolution and detail over the SSIM quality floor, they can run the job with "Fine Detail" enabled. This bypasses the quality-triggered resolution drops, ensuring only size-triggered retries are performed at the initial resolution.
- Maximum 2 retries total across both paths combined.

**FR-8 Goal-Gradient Progress Indicator:** Client polls or subscribes (SSE/WebSocket) to job status: `queued → analyzing → encoding → verifying → done/failed`. The displayed percentage is intentionally front-loaded (`lib/progress-stages.ts`) so early, fast stages visibly move the bar rather than sitting near 0%, and the final stretch shows a counting-down step indicator ("1 step left") rather than a raw percentage — exploiting the goal gradient effect without misrepresenting actual job state, which remains truthfully tracked server-side.

**FR-9 Download with Before/After Proof:** On completion, user is shown a visual before/after frame comparison (source frame vs. optimized output frame, side-by-side or slider) alongside the size comparison — the size number alone does not demonstrate the product's core value proposition. The primary action is "Send to WhatsApp" (FR-15), with "Download to device" as a secondary option. For Status splits, one button per segment plus a "download all as zip" option.

**FR-10 Auto-Deletion:** Uploaded source and processed output files are deleted from storage after a fixed retention window (Section 22/24), via a single deletion code path (the cleanup cron job is the sole writer of `deletedAt`) rather than two uncoordinated mechanisms.

**FR-11 Usage Limits with First-Job Reciprocity:** Free tier is limited to an initial 5 jobs/day (explicitly an initial value, to be tuned from real Phase 1 usage data). **The first job for any new fingerprint always runs the full pipeline and shows the full before/after comparison**, regardless of remaining quota (`lib/growth-ux.ts`'s `isFirstJobExemptFromQuota`) — every new user experiences real value once before ever hitting a limit or an upsell screen. Premium tier has a high daily cap (initial: 100 jobs/day) rather than unbounded "unlimited," to bound compute cost, plus batch upload.

**FR-12 Loss-Aversion Upsell Framing:** When quota is exhausted, the upsell screen leads with what the user is giving up by staying on the free tier (`lib/growth-ux.ts`'s `buildUpsellCopy`) — e.g., files sent at lower quality once the daily limit is hit — shown _before_ the subscription price, so the price is judged against that cost rather than in isolation (contrast effect).

**FR-13 Light Onboarding Preferences (IKEA Effect):** Before a new user's first upload, two lightweight, non-blocking preference questions (`lib/growth-ux.ts`'s `ONBOARDING_QUESTIONS`) — what they mainly share, and what matters most to them — bias copy tone and default emphasis. Answers are never required and never gate functionality; this preserves the no-login constraint while giving the user a small stake in shaping their own experience.

**FR-14 Error Surfacing:** Any failure (unsupported format, corrupt file, encode failure) surfaces a plain-language error with a retry option.

**FR-15 Share to WhatsApp:** On completion, the primary action is a "Send to WhatsApp" button that opens WhatsApp's share sheet (`https://wa.me/`) with a pre-filled message containing a branded NoBlur link (`noblur.app`) and a short, honest description of the tool. This reduces the tap count from 3 (download, open WhatsApp, attach) to 1 (tap, confirm send). A secondary "Download to device" button is always available for users who prefer to save first or share to other platforms. The share message must never claim NoBlur bypasses or disables WhatsApp compression. Implemented in `lib/whatsapp-share.ts`.

**FR-16 Adaptive Encoding Engine:** Before encoding, every video job runs a lightweight analysis pass that produces a scene profile: face presence, text-presence (edge density), and motion scores sampled at 1 fps (`workers/analysis-worker.ts` → `lib/opencv_analyze.py`), alongside `ffprobe` source metadata and magic-byte validation. A policy engine (`lib/policy-engine.ts`) then selects an encoding profile from `config/encoding-profiles.json` — 9 profiles across 3 families (`whatsapp_normal_*` H.264 Main @ L3.1 no-B-frames 1200 kbps cap, `whatsapp_hd_*` H.264 High @ L3.1 with B-frames 3000 kbps cap, `av1_document_*` SVT-AV1 with no bitrate cap), each with face/text/balanced variants — using hard-constraint filtering (face/text/motion thresholds) before CRF modifier selection. AV1 (`libsvtav1`) is the primary codec on the document/preview path; H.264 (`libx264`) remains the fallback on the WhatsApp chat path. The encoded output is scored with VMAF against the bundled model on a middle 5-second segment; a score below the floor (80) triggers a single re-encode at CRF reduced by 3 (`lib/vmaf.ts`, `Job.reencodeCount`). This supersedes the v1.0 "H.264 only" and "VMAF is Phase 2" constraints.

**FR-17 Share = Credit:** Sharing NoBlur on WhatsApp grants 3 bonus daily compressions, once per day, tracked via `UsageRecord.bonusCount` and surfaced through `POST /api/v1/usage/share-bonus` (idempotent per day). The bonus stack on top of the free daily quota; `shareBonusAvailable` is exposed in the usage response and drives the share prompt in the dashboard.

## 10. Non-Functional Requirements

- **Performance:** See the test matrix in Section 5.
- **Interaction responsiveness (addition — initial values, tune from real RUM data in Phase 2):** Any user tap that does not require a network round trip (preset chip selection, onboarding skip, file picker open) must respond with a visible UI change within **100ms** — the threshold below which a UI change feels instantaneous (Miller 1968 / Nielsen 1993). Any tap that does require a network round trip (submit job, load usage) must show an optimistic UI update within **300ms**, with a loading state if the real response takes longer.
- **Network resilience:** Primary launch market has variable 3G/4G connectivity. Upload must be resumable/chunked (e.g., tus protocol or multipart with resume support) as a **Phase 1 requirement**, not best-effort.
- **Max upload size:** 50 MB per file, free tier; 500 MB premium (source file upload ceiling, distinct from the 1–16MB _output_ custom-size range in FR-2).
- **Availability:** 99.5% uptime target for MVP (single-region deployment acceptable), **plus an explicit queue-wait SLA:** p95 time from `queued` to `analyzing` under 30 seconds under normal load.
- **Hosting region:** selected for latency to the primary launch market, not defaulted to US/EU by convenience.
- **Scalability:** Queue-based workers must scale horizontally (stateless workers, shared queue/storage).
- **Mobile performance:** Frontend must be usable and performant on mid-range Android devices over 3G/4G; PWA must be installable and pass a Lighthouse PWA audit.
- **Security:** All uploads scanned for MIME-type spoofing; all transfers over HTTPS/TLS.
- **Privacy:** No file content is retained beyond the retention window; no file content is used for any purpose beyond the requested job.
- **Accessibility:** WCAG 2.1 AA for core flows (upload, progress, download).
- **Platform-constant configurability:** All WhatsApp-platform-dependent constants (duration limits, resolution caps, size ceilings) live in a config table (`config/platform-limits.json`, backed by the `PlatformLimit` Prisma model in production), not hardcoded in application code — WhatsApp has changed its Status duration limit twice in under two years (30s → 60s → 90s), so these values must be updatable without a redeploy.
- **SEO indexability:** Marketing pages (`/`, `/about`, `/pricing`, `/how-it-works`) must be server-rendered or statically generated so their content is crawlable without JavaScript execution; transient job pages (`/jobs/:id`) are explicitly excluded from indexing (`X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`).

## 11. Complete User Flow

1. User lands on NoBlur (mobile web). Sees single primary CTA: "Upload Media."
2. **(New user only, non-blocking)** Two light onboarding preference questions appear (FR-13); user can answer or skip.
3. User selects/drops a file (or picks from camera roll on mobile).
4. Client validates format/size client-side (fast fail) before upload.
5. System analyzes the file and pre-selects a preset via smart defaults (FR-2); user can override with one tap.
6. User taps "Optimize."
7. File uploads to R2 (direct-to-storage presigned upload, resumable/chunked) with a progress bar.
8. Job is enqueued; client shows processing status (`analyzing → encoding → verifying`) with the goal-gradient progress indicator (FR-8) and plain-language stage labels.
9. On completion, client shows: (a) a before/after size comparison (e.g., "42 MB → 15.8 MB"), and (b) a visual before/after frame comparison, so the user can see the quality difference, not just the size difference. If the quality-triggered retry path dropped the resolution, the client displays a non-intimidating notification offering to re-run in "Fine Detail" mode.
10. If Status preset triggered splitting (only for clips over the current duration ceiling — a minority case), client shows a segmented list ("Part 1 of 2," etc.) each downloadable, plus "Download All."
11. User taps "Send to WhatsApp" to share directly, or "Download to device" to save locally; can then manually share via WhatsApp or other apps (NoBlur does not auto-post).
12. **(If quota exhausted, and not the user's first-ever job — FR-11)** an upsell screen appears, leading with the loss-aversion framing (FR-12) before the price.
13. Some time after download, an optional, non-blocking prompt may appear: "Did it look good after you sent it on WhatsApp?" (thumbs up/down) — closing the loop on the product's actual claimed outcome.

## 12. UX Principles

**Visual design system:**

- **Material 3 (M3)** governs structural components and visual styling: buttons, sheets, elevation tokens, shape system, motion curves, color tokens. Followed as specified, not diluted.
- **Apple-native simplicity** is scoped specifically to information architecture, not component styling: one primary decision per screen (softened further by smart defaults below), minimal screen count, restrained copy, no nested menus. It does not mean flattening M3's elevation or component style — those stay M3.
- **WhatsApp visual familiarity:** Primary accent color drawn from WhatsApp's teal/green family (ASSUMPTION: `#25D366` accent, `#075E54` deep accent), applied within the M3 color token system.
- **Zero jargon:** No mention of "bitrate," "codec," or "resolution" in the user-facing UI. Internally computed, never exposed, unless the user opts into an "Advanced" collapsed section (post-MVP).
- **Trust signals:** Explicit, persistent microcopy near upload: "Files are deleted automatically after processing" and "We never post to WhatsApp for you."

**Conversion & behavioral UX patterns (implemented, not just described — see `lib/growth-ux.ts`, `lib/smart-defaults.ts`, `lib/progress-stages.ts`):**

- **Smart Defaults:** The preset decision is pre-made from file analysis (FR-2) so the user starts from an already-good choice instead of a blank state, which is where most onboarding drop-off happens.
- **Goal Gradient Effect:** Progress display is front-loaded and finishes with a step countdown rather than a flat percentage (FR-8), so the app visibly speeds toward completion rather than reporting mechanically.
- **Reciprocity:** The first job for any new user always shows full value — including the before/after comparison — before any quota limit or upsell can appear (FR-11). Value is demonstrated before anything is asked of the user.
- **IKEA Effect:** A light, skippable onboarding preference step (FR-13) gives the user a small hand in shaping their own experience, increasing investment without adding friction or gating.
- **Loss Aversion:** Upsell copy leads with what the user gives up by staying free, not only what they'd gain by upgrading (FR-12).
- **Contrast Effect:** The "cost of staying free" is shown before the subscription price, so the price is anchored against that cost rather than judged in isolation (FR-12).

## 13. Automated Processing Pipeline

Named "Automated," not "AI": the pipeline is deterministic rule-based logic and a bitrate formula, not machine learning or generative AI, consistent with Section 6's non-goals.

1. **Upload:** Client obtains a presigned R2 upload URL (60-minute expiry, chosen to accommodate constrained-network users per Section 10) from the API, uploads directly to storage with resumable/chunked support.
2. **File Validation:** Worker verifies real file type via magic-byte sniffing (not just extension), checks size ceiling, rejects corrupt/unreadable files.
3. **Media Analysis:** The analysis worker (`workers/analysis-worker.ts`) runs `ffprobe` to extract duration, resolution, frame rate, codec, container, audio stream info (video) or dimensions/format/EXIF (images), plus a scene-analysis pass (`lib/opencv_analyze.py`) scoring face presence, text presence, brightness, and contrast at a 1 fps sample (FR-16).
4. **Smart Default + Bitrate Calculation:** `lib/smart-defaults.ts` selects the likely preset; `lib/bitrate.ts` computes target video/audio bitrate from target size and duration (Section 14).
5. **Resolution Optimization:** `lib/resolution.ts` balances resolution vs. bitrate, never upscaling past source resolution, capped at the preset's config-table ceiling.
6. **Profile Selection & Compression:** `lib/policy-engine.ts` selects an encoding profile (H.264 or AV1, per FR-16) from `config/encoding-profiles.json` based on destination + scene scores; FFmpeg executes with the profile parameters and the adaptive preset/pass ladder (Section 19).
7. **Quality Verification:** Output file size compared against target tolerance (±10%); VMAF is scored on a middle 5-second segment against the bundled model (`lib/vmaf.ts`, floor 80) with SSIM retained as the secondary metric. A VMAF failure triggers a single CRF-3 re-encode; size or SSIM failures trigger the two distinct retry paths defined in FR-7.
8. **Status Splitting:** Only triggered if duration exceeds the current Status per-item ceiling; split at fixed-interval cut points before final encode (scene-aware cuts are a Phase 2 enhancement).
9. **Download:** Output pushed to R2, presigned download URL returned to client; source file marked for deletion via the single deletion code path.

## 14. Compression Logic (Bitrate Mathematics)

Given a target output file size `S_target` (in megabytes) and media duration `D` (seconds):

```text
BitrateTotal (kbps) = (S_target_MB * 8 * 1024) / D_seconds
```

Split between video and audio streams:

```text
AudioBitrate (kbps) = clamp(64, 128, based on source channels)
VideoBitrate (kbps) = BitrateTotal - AudioBitrate
```

A safety margin accounts for container/muxing overhead:

```text
VideoBitrate_final = VideoBitrate * 0.92
```

**Worked example (verified in `tests/bitrate.test.ts` against real computation, not just on paper):** Target size 16 MB, duration 30s.

```text
BitrateTotal = (16 * 8 * 1024) / 30 ≈ 4369 kbps
AudioBitrate = 96 kbps (stereo, source has stereo audio)
VideoBitrate = 4369 - 96 = 4273 kbps
VideoBitrate_final = 4273 * 0.98 ≈ 4188 kbps
```

**Note on the 2% margin:** This margin was empirically validated and tuned in Milestone 3 (changed from the initial 8% assumption to 2% in `lib/bitrate.ts`). Real-world MP4/H.264/AAC encodes show that a 2% overhead margin is extremely accurate for targeting video sizes, resulting in direct convergence on the first pass (Attempt 0) without triggering slow re-encoding retries.

A minimum floor bitrate per resolution tier (`BITRATE_FLOORS_KBPS` in `lib/bitrate.ts`) prevents the formula from producing an unusably low bitrate for long videos - if the computed bitrate falls below the floor for the current resolution, the system automatically downscales resolution instead of degrading bitrate further.

## 15. Image Optimization Pipeline

1. Validate format (JPEG, PNG, WEBP) and read dimensions/EXIF.
2. Strip non-essential metadata (GPS/EXIF beyond orientation) for privacy and size (orientation tag preserved, all else stripped).
3. Determine target dimensions from the config table (`config/platform-limits.json`'s `IMAGE` block):
   - WhatsApp Chat preset: cap long edge at 1600px.
   - WhatsApp Status preset: cap long edge at 1080px.
   - Custom size: iteratively adjust JPEG quality (and, if needed, dimensions) via binary search to hit target size within tolerance.
     These caps are flagged for the same empirical validation required for video constants (Section 16), scheduled in Milestone 2.
4. Re-encode to JPEG (default) at quality computed via binary search against target size, or WEBP if source was WEBP and user preset doesn't require JPEG compatibility.
5. Convert PNG-with-no-transparency to JPEG for better compression; preserve PNG only when alpha channel is present and non-fully-opaque.
6. Output + quality-verify (file size within tolerance); if not, adjust quality one step and re-encode (max 2 retries).

## 16. Video Optimization Pipeline

**WhatsApp platform constants — sourced, config-table-driven values (`config/platform-limits.json`), not hardcoded:**

| Preset          | Max duration                                                     | Resolution cap | File size ceiling                    | Notes                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------- | -------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp Status | 90 seconds per item                                              | 720p           | 16MB                                 | WhatsApp raised this from 30s → 60s → 90s over 2024–2026; re-verify empirically before every major release (Milestone 2, and periodically post-launch). |
| WhatsApp Chat   | No app-enforced duration limit; practical ceiling driven by size | 720p           | 16MB (compression trigger threshold) | Encoding at this ceiling avoids WhatsApp's own lossy downscale doing damage on top of ours.                                                             |

1. Determine target resolution tier from the config table above based on preset + source resolution (`lib/resolution.ts`'s `chooseInitialResolution`). Never upscale below source resolution.
2. Select codec/container via the policy engine (FR-16): H.264 (libx264) in MP4 for the WhatsApp chat path (Main profile @ L3.1 without B-frames for the normal family, High profile @ L3.1 with B-frames for the HD family); AV1 (libsvtav1) in MP4 as the primary codec on the WhatsApp document/preview path. H.265 is explicitly rejected.
3. Compute bitrate per Section 14.
4. Encode settings come from the selected profile in `config/encoding-profiles.json` (CRF, `-profile:v`, bitrate cap, `-pix_fmt yuv420p`, GOP/color flags), over the adaptive preset/pass ladder defined in Section 19.
5. Audio: AAC, 64–128kbps depending on source channel count, downmix to stereo if source is multichannel.
6. Frame rate: preserve source, unless source exceeds 30fps and preset is Status/Chat, in which case downsample to 30fps.
7. **Status splitting:** only triggered if duration exceeds the 90-second config-table ceiling — understood as a secondary/minority-case feature (most user clips fall under 90s), not a Phase 1 headline workflow. When triggered, split at fixed intervals (scene-detection-based smart cuts deferred to Phase 2) and encode each segment independently with the same target-size-per-segment logic.

**Empirical validation:** The full pipeline — analyze, compute bitrate/resolution, select profile, encode, verify via VMAF + SSIM, retry — has been run end-to-end against a real generated 1080p/10-second test clip (`sample/source_1080p_10s.mp4`) using the worker pipeline, confirming the mechanism works before any WhatsApp-specific constant tuning. Tuning the constants themselves against real WhatsApp sends is a periodic re-validation task, not a one-time check (Section 30).

## 17. System Architecture

```text
[Client PWA (Next.js/React)]
        |
        | (1) request presigned upload URL (60-min expiry, resumable/chunked)
        v
[API Server (Fastify)] <---> [PostgreSQL (Prisma)]
        |                          ^
        | (2) direct upload            |
        v                          |
[Cloudflare R2 (source bucket)]        |
        |                          |
        | (3) enqueue job              |
        v                          |
[BullMQ Queue (Redis, AOF persistence + managed backup)]
        |
        | (4) jobs picked up
        v
[Worker Pool (Railway/Render, FFmpeg + ffprobe + OpenCV/Python, region chosen for launch-market latency)]
        |
        | (5a) media-analysis worker — probe + scene analysis (lib/probe.ts, lib/opencv_analyze.py)
        | (5b) media-encode worker — policy engine → profile → encode → VMAF gate (lib/vmaf.ts)
        v
[Cloudflare R2 (output bucket)]
        |
        | (6) presigned download URL returned via API/status endpoint
        v
[Client downloads file]

Monitoring: Sentry (errors, all services) + PostHog (product analytics, client + server events)
SEO/marketing layer: Next.js SSR/SSG for /,/about,/pricing,/how-it-works — lib/seo.ts, app/sitemap.ts
```

- API server never touches raw file bytes — uploads/downloads go directly client↔R2 via presigned URLs, keeping the API stateless and cheap to scale.
- Workers are stateless; horizontal scaling is just adding worker instances subscribed to the same BullMQ queue.
- **Redis reliability:** Redis must run with AOF persistence enabled and be a managed/backed-up instance — not ephemeral default config. A Redis restart during a load spike must not silently drop queued jobs; BullMQ's stalled-job recovery is relied upon on worker restart, paired with a user-facing "still processing" state rather than silent loss (Section 25).

## 18. API Design

Base path: `/api/v1`

**POST `/uploads/presign`**
Request: `{ filename, mimeType, sizeBytes }`
Response: `{ uploadUrl, fileKey, expiresAt }` (60-minute expiry)

**POST `/jobs`**
Request: `{ fileKey, preset: "status" | "chat" | "custom", targetSizeMB?: number, prioritizeDetail?: boolean, destination?: "WHATSAPP_NORMAL" | "WHATSAPP_HD" | "WHATSAPP_DOCUMENT" | "PREVIEW_WEB" }`
Validation: `targetSizeMB` is only accepted, and required, when `preset: "custom"` (bounded 1–16, per FR-2). If present for `status` or `chat` presets, the request is rejected with a 400 and a clear error message. `prioritizeDetail` is optional (default: false). `destination` is optional and defaults to `WHATSAPP_NORMAL`; it routes the policy engine's profile selection (FR-16).
Response: `{ jobId, status: "queued" }`

**GET `/jobs/:jobId`**
Response: `{ jobId, status, stage, progressPercent, stepsRemaining, outputs: [{ segmentIndex, downloadPath, sizeBytes }], resolutionDropped: boolean, prioritizeDetail: boolean, error? }`
`progressPercent` and `stepsRemaining` are computed via `lib/progress-stages.ts` for the goal-gradient display, not raw compute-time fractions.

**GET `/jobs/:jobId/stream`** (SSE)
Streams status updates as the job progresses through stages; falls back to polling `GET /jobs/:jobId` if SSE unsupported.

**GET `/usage`**
Response: `{ jobsUsedToday, jobsRemainingToday, isPremium, isFirstJobToday, shareBonusAvailable }` — keyed by device fingerprint + IP. `isFirstJobToday` drives the reciprocity exemption in FR-11; `shareBonusAvailable` surfaces whether the daily share bonus (FR-17) has not yet been claimed.

**POST `/usage/share-bonus`** (FR-17)
Grants 3 bonus compressions for sharing NoBlur, once per day, idempotent per fingerprint. Response: `{ granted: boolean, bonusCount, jobsRemainingToday }`.

**POST `/onboarding`**
Request: `{ primary_use, priority }` (optional, non-blocking — FR-13)
Response: `{ emphasis, primaryUse }` — used client-side only to bias copy tone, never to gate access.

**POST `/billing/checkout`** (Phase 2 — payment integration)
Initiates a Flutterwave checkout session for subscription payment. Flutterwave is the locked payment provider (AGENTS.md Q2); all checkout, subscription, and billing-webhook code must integrate against Flutterwave's API only.

**POST `/billing/webhook`** (Phase 2 — payment integration)
Receives Flutterwave payment webhook notifications. Must verify `x-verif-hash` signature before processing. Idempotent by `tx_ref`. Returns `{ status: 'success' }` on successful processing.

All endpoints return standard error envelope: `{ error: { code, message } }`. Rate-limited per IP (Section 23).

## 19. Processing Queue Design

- **Queue engine:** BullMQ on Redis (AOF persistence + managed backup, per Section 17).
- **Queues:** `media-analysis`, `media-encode` (separate so encode concurrency can be tuned independently from lightweight analysis jobs).
- **Analysis vs. encode split:** `media-analysis` jobs run ffprobe probing + the OpenCV scene analysis (FR-16) and write the scene scores to `Job.analysisResult`; `media-encode` jobs consume those scores through the policy engine, select the profile, encode, and run the VMAF quality gate. A VMAF failure below the floor triggers at most one CRF-3 re-encode inside the same job (tracked by `Job.reencodeCount`), which is a quality retry distinct from the size/SSIM retry paths in FR-7.
- **Concurrency:** Configurable per worker instance based on CPU cores (1 concurrent encode per 2 vCPUs, since FFmpeg encoding is CPU-bound).
- **Priority:** Premium jobs get higher queue priority than free-tier jobs (fair-use, not exclusive access).
- **Adaptive encode policy** — a single documented ladder, stepping down together as queue depth increases:
  - Low queue depth: `-preset slow` + two-pass encoding.
  - Moderate queue depth: `-preset medium` + two-pass.
  - High queue depth: `-preset fast` + single-pass CRF-capped.
- **Failure classification:** before retrying a failed FFmpeg job, classify the failure: OOM/signal-killed → treat as transient, retry; "invalid data found"/decode errors → treat as permanent, fail immediately with no retry.
- **Job timeout:** 5 minutes for video, 30 seconds for images, after which the job is marked failed and the user is notified.
- **Cleanup job:** a scheduled worker (cron via BullMQ repeatable job) is the single source of truth for deletion: it deletes the R2 object and writes `deletedAt` in Postgres in the same operation, rather than relying on an uncoordinated R2 lifecycle rule.

## 20. Database Design

Core entities: `Job`, `MediaFile` (source + output), `UsageRecord` (daily quota tracking by fingerprint), `PlatformLimit` (config table for WhatsApp constants), and later `User`/`Subscription` (Phase 2+). MVP is intentionally login-free, so `UsageRecord` is the only per-"user" tracking table, keyed by an anonymous device fingerprint hash + IP hash (not raw IP, for privacy — Section 24).

**Deletion consistency:** `MediaFile.deletedAt` is written exclusively by the cleanup cron job at the same time it deletes the R2 object. R2's own lifecycle rule is retained only as a secondary safety net, explicitly not the primary deletion path — this avoids dual-source-of-truth drift, since Postgres would otherwise have no visibility into storage-layer deletions.

## 21. Complete Prisma Data Model

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum JobStatus {
  QUEUED
  ANALYZING
  ENCODING
  VERIFYING
  DONE
  FAILED
}

enum PresetType {
  STATUS
  CHAT
  CUSTOM
}

enum MediaKind {
  VIDEO
  IMAGE
}

// JobDestination is stored as a String in the shipped schema; valid values:
// WHATSAPP_NORMAL (default), WHATSAPP_HD, WHATSAPP_DOCUMENT, PREVIEW_WEB.

model Job {
  id             String     @id @default(cuid())
  status         JobStatus  @default(QUEUED)
  preset         PresetType
  targetSizeMB   Int?       // only set when preset = CUSTOM, validated 1-16 at API layer
  prioritizeDetail Boolean  @default(false)
  mediaKind      MediaKind
  destination    String     @default("WHATSAPP_NORMAL") // routes policy-engine profile selection (FR-16)
  sourceFile     MediaFile? @relation("SourceFile", fields: [sourceFileId], references: [id])
  sourceFileId   String?    @unique
  outputs        MediaFile[] @relation("OutputFiles")
  errorMessage   String?
  fingerprintHash String
  ipHash         String
  isPremium      Boolean    @default(false)
  isFirstJobForFingerprint Boolean @default(false) // drives FR-11 reciprocity exemption

  // Adaptive engine fields (FR-16)
  analysisResult           Json?                 // SceneAnalysis: face/text/motion scores per sampled frame
  profileId                String?
  profile                  EncodingProfile?      @relation(fields: [profileId], references: [id])
  vmafScore                Float?                // final VMAF score after verification
  reencodeCount            Int                   @default(0) // VMAF-triggered re-encode count

  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  completedAt    DateTime?

  @@index([fingerprintHash, createdAt])
  @@index([status])
  @@index([profileId])
}

model MediaFile {
  id           String   @id @default(cuid())
  storageKey   String   @unique
  mimeType     String
  sizeBytes    Int
  durationSec  Float?
  width        Int?
  height       Int?
  segmentIndex Int?     // only populated for the minority case: Status videos over the duration ceiling
  role         String   // "source" | "output"
  jobAsSource  Job?     @relation("SourceFile")
  jobAsOutput  Job?     @relation("OutputFiles", fields: [jobOutputId], references: [id])
  jobOutputId  String?
  expiresAt    DateTime
  deletedAt    DateTime?  // written exclusively by the cleanup cron job — single source of truth
  createdAt    DateTime @default(now())

  @@index([expiresAt])
}

model UsageRecord {
  id              String   @id @default(cuid())
  fingerprintHash String
  ipHash          String
  date            DateTime @db.Date
  jobCount        Int      @default(0)
  bonusCount      Int      @default(0) // compressions granted via WhatsApp share, once per day (FR-17)

  @@unique([fingerprintHash, date])
  @@index([ipHash, date])
}

model PlatformLimit {
  id              String   @id @default(cuid())
  preset          PresetType
  maxDurationSec  Int?
  maxResolutionW  Int
  maxResolutionH  Int
  maxSizeMB       Int
  effectiveFrom   DateTime @default(now())
  notes           String?
}

// Encoding profile catalog consumed by the policy engine (FR-16).
// Mirrors config/encoding-profiles.json; the JSON file is the dev-source.
model EncodingProfile {
  id              String   @id @default(cuid())
  name            String   @unique
  codec           String   // "libsvtav1" | "libx264" | ...
  container       String   @default("mp4")
  crf             Int
  videoBitrateMax Int?     // optional bitrate ceiling (kbps), null for pure CRF
  speedPreset     String   // SVT-AV1: "0-13", x264: "ultrafast-slow"
  pixelFormat     String   @default("yuv420p")
  audioCodec      String   @default("aac")
  audioBitrate    Int      @default(96) // kbps

  // Scene-score thresholds that select this profile
  minFaceScore    Float?
  minTextScore    Float?
  minMotionScore  Float?
  maxMotionScore  Float?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  jobs            Job[]

  @@index([codec])
}

model OnboardingPreference {
  id              String   @id @default(cuid())
  fingerprintHash String   @unique
  primaryUse      String?
  priority        String?
  createdAt       DateTime @default(now())
}

// Phase 2+ (accounts/billing) — included for forward compatibility, not active in MVP
model User {
  id                   String   @id @default(cuid())
  email                String   @unique
  isPremium            Boolean  @default(false)
  flutterwaveCustomerId String?
  balance              Int      @default(0) // kobo, ledger-paired via LedgerEntry
  premiumExpiresAt     DateTime?
  createdAt            DateTime @default(now())
}

// Phase 2+ (billing ledger) — audit trail for all balance changes
model LedgerEntry {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  amount      Int      // kobo — positive = credit, negative = debit
  oldBalance  Int
  newBalance  Int
  type        String   // "CREDIT" | "DEBIT"
  reference   String?  // Flutterwave tx_ref for idempotency
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
}

// Phase 2+ (payment records) — idempotency and audit trail for payment processing
model Payment {
  id          String   @id @default(cuid())
  reference   String   @unique // Flutterwave tx_ref — idempotency key
  status      String   // "successful" | "failed" | "pending"
  amount      Int      // kobo
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
}
```

## 22. Storage Strategy

- **Buckets:** Separate R2 buckets (or prefixes) for `uploads/` (source) and `outputs/` (processed), enabling different lifecycle rules.
- **Direct upload/download:** Presigned URLs for both directions, resumable/chunked on upload; API server never proxies file bytes.
- **Retention:** Source files deleted immediately after successful job completion (or after job timeout/failure + 1 hour grace period for debugging). Output files retained for 24 hours then deleted.
- **Deletion authority:** the cleanup cron job is the single source of truth for deletion — it removes the R2 object and marks `deletedAt` in Postgres atomically. R2's native lifecycle rule remains configured as a secondary safety net only.
- **No CDN caching of user content** beyond the download window, to avoid retention beyond stated policy.

## 23. Security

- All traffic over HTTPS/TLS; HSTS enabled.
- Presigned URLs scoped narrowly (single object; 60-minute expiry for uploads, to accommodate constrained-network users; 24-hour expiry for downloads matching retention).
- File type verified by magic bytes server-side, not trusted from client-supplied MIME type or extension.
- Rate limiting per IP on `/jobs` and `/uploads/presign` (20 requests/minute/IP) to prevent abuse.
- Fingerprint + IP hashing (salted, one-way) for usage tracking — no raw IP stored.
- Worker processes run FFmpeg in a sandboxed/isolated environment (containerized, no shell injection — all FFmpeg args passed as an argument array, never string-interpolated into a shell command) to prevent command injection via crafted filenames/metadata. Implemented this way in `lib/pipeline.ts` (`execFileSync` with an argument array, no shell string).
- **Content-Security-Policy** scoped to only the third parties NoBlur actually uses (GA4/GTM, Sentry) — implemented in `next.config.ts` — plus `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.
- Dependency and container image scanning in CI.

## 24. Privacy

- No account required in MVP; no persistent personal data collected beyond hashed fingerprint/IP for quota enforcement, and the two optional, non-blocking onboarding preference values (FR-13), which never gate access.
- Uploaded media is used only to produce the requested output and is deleted per the retention schedule in Section 22 (via the single, verifiable deletion path) — never used for training, analytics content, or shared with third parties.
- EXIF/GPS metadata stripped from images by default (Section 15).
- Privacy policy and terms surfaced at upload time with a one-line trust statement, full policy linked.
- Analytics events (Section 28) capture behavioral/technical metadata only, never file content or derived thumbnails.
- `llms.txt` (Section 37) and `robots.txt` explicitly disallow crawling of `/jobs/*`, since those pages can reference transient, user-specific presigned links.

## 25. Error Handling

| Scenario                                              | Handling                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unsupported file format                               | Reject at client-side validation with plain-language message before upload begins                                                                                              |
| File exceeds size ceiling                             | Reject at client-side validation, show upgrade prompt if relevant                                                                                                              |
| Corrupt/unreadable file                               | Fail fast at analysis stage; classified as a permanent failure (Section 19), no retry — "This file couldn't be read. Try a different file."                                    |
| FFmpeg encode failure — transient (OOM/signal-killed) | Auto-retry up to 2x with backoff (Section 19 classification)                                                                                                                   |
| FFmpeg encode failure — permanent (invalid data)      | Fail immediately, no retry, generic failure with retry button offered to the user manually                                                                                     |
| Verification tolerance never met after retries        | Show the actual achieved result transparently — e.g., "We got as close as possible: 18.2MB instead of your 16MB target, because going smaller would have visibly hurt quality" |
| Upload interrupted/network drop                       | Resumable/chunked upload resumes from last confirmed chunk, not a full restart                                                                                                 |
| Quota exceeded (not first job)                        | Clear, loss-aversion-framed upsell screen (FR-12), no dead-end error                                                                                                           |
| Job timeout                                           | Mark failed, notify user, log to Sentry with job metadata (no file content)                                                                                                    |
| Redis/queue restart mid-job                           | BullMQ stalled-job recovery on worker restart reconciles job state; user sees "still processing," not silent job loss                                                          |

## 26. Edge Cases

- Zero-duration or single-frame "video" files (treat as image if truly static, or reject).
- Vertical vs. horizontal video mismatched to preset aspect assumptions (Status often portrait) — pipeline must handle both orientations without forcing letterboxing.
- Extremely short clips (<1s) where computed bitrate formula produces implausible values — apply floor/ceiling clamps.
- Source file already smaller than any reasonable target — skip re-encode, pass through with minimal/no transcoding but still normalize container/codec if needed for compatibility.
- Audio-less video files — skip audio bitrate allocation entirely, all budget to video.
- Animated WEBP/PNG (rare) — MVP rejects animated images with clear messaging (static only).
- Custom target size smaller than technically achievable minimum for the duration — clamp to pipeline's minimum viable bitrate/resolution and inform the user transparently (Section 25 pattern).
- Multiple rapid duplicate submissions from same fingerprint — dedupe/debounce at API layer.
- A Status-preset video that lands exactly at or near the 90-second config-table ceiling — must not off-by-one incorrectly trigger or skip splitting; test explicitly at 89s/90s/91s boundaries.
- A returning user whose `isFirstJobForFingerprint` flag was already consumed but who cleared cookies — the reciprocity exemption only ever applies once per fingerprint at the database level, not per browser session, to avoid trivial repeat exploitation while still keeping the mechanism a soft (not hard) limit overall (Section 27).

## 27. Business Model

- **Free tier:** 5 jobs/day (an initial value, to be tuned from Phase 1 usage data), with the first job always exempt from the count itself being blocking (FR-11) — single-file upload only, max 50MB source file.
- **Premium tier:** high daily cap — initial value 100 jobs/day — rather than unbounded "unlimited," to keep compute cost predictable while still feeling unlimited for any normal use case; batch upload, higher max source file size (500MB), priority queue placement.
- **Currency:** All monetary values are denominated in **Nigerian Naira (NGN)**, stored in **kobo** (1 NGN = 100 kobo) as integer fields in the database (see `LedgerEntry.amount`, `Payment.amount` in Section 21). The primary launch market is Nigeria (Section 7 personas).
- **Pricing:** Subscription model (monthly/annual) — **pricing is a Phase 2 concern**. No price point is set, displayed, or hard-coded in Phase 1 code or copy. The exact price point will be determined before Phase 2 billing integration begins (Section 32).
- **Upsell moments:** Quota exhaustion screen (loss-aversion + contrast framing, FR-12), batch-upload attempt on free tier, large-file rejection on free tier.
- **Share = Credit (FR-17):** Sharing NoBlur on WhatsApp grants 3 bonus compressions once per day (`UsageRecord.bonusCount`), a low-cost virality loop that stacks on the free quota without touching the premium tier's value proposition.
- **Quota enforcement — explicit tradeoff:** Fingerprint + IP-based quota enforcement is a soft, best-effort limit, not abuse-proof — it can be defeated by clearing site data or switching browsers. This is an accepted, deliberate MVP tradeoff because per-job compute cost is low and the resulting business risk is bounded; hard enforcement arrives with Phase 2 accounts.

## 28. Analytics Events (PostHog)

- `upload_started`, `upload_completed`, `upload_failed`
- `onboarding_answered`, `onboarding_skipped`
- `smart_default_preset_shown` (props: preset), `smart_default_preset_overridden` (props: from, to)
- `job_submitted`, `job_stage_changed` (props: stage), `job_completed` (props: sizeBefore, sizeAfter, durationMs, ssimScore), `job_failed` (props: errorCode, classification: transient/permanent)
- `download_clicked` (props: segmentIndex if applicable)
- `share_to_whatsapp_clicked`
- `before_after_comparison_viewed`
- `post_send_feedback_submitted` (props: thumbsUp/thumbsDown)
- `quota_exhausted_shown`, `upgrade_clicked`, `checkout_started`, `checkout_completed`
- `pwa_installed`

**Additional implemented events:** The shipped client also fires `file_selected`, `job_created` (with `job_id`, `preset`), `quota_exceeded`, `upsell_shown`, `upsell_cta_clicked`, `upsell_dismissed`, `onboarding_step_completed`, `feedback_given`, `share_bonus_clicked`, `download_clicked` (with `output_index`), and the history events `history_redownload`, `history_entry_removed`, `history_cleared`. New features should use the canonical names above as the primary source; add new events only when the list does not cover the interaction.

## 29. Success Metrics

- **Activation:** % of visitors who complete at least one full job (upload → download).
- **Quality perception:** two layers — (a) immediate post-download thumbs up/down, and (b) the delayed post-send prompt asking specifically about how it looked after being sent on WhatsApp, which is the metric that actually validates the core promise.
- **Smart default accuracy:** % of jobs where the suggested preset was NOT overridden — a direct signal of whether the heuristic in `lib/smart-defaults.ts` is actually saving users a decision.
- **Retention:** % of free users returning within 7 days.
- **Conversion:** Free-to-premium conversion rate, tracked specifically for users who saw the loss-aversion upsell screen vs. a control framing (A/B test recommended in Phase 2).
- **Performance:** p50/p95 job completion time by media type/size, measured against the Section 5 test matrix.
- **Reliability:** Job failure rate (%), retry success rate, split by transient vs. permanent failure classification.
- **SEO:** organic search impressions/clicks (Google Search Console), indexed-page count vs. submitted sitemap count, Core Web Vitals pass rate on marketing pages.

## 30. Risks

- WhatsApp's internal compression behavior can and does change over time (its Status duration limit changed twice in under two years) — requires periodic empirical re-validation against real WhatsApp sends, not a one-time check. Mitigated by keeping all such constants in a config table (Section 16/21) rather than hardcoding them.
- FFmpeg compute cost at scale could erode freemium unit economics if free-tier abuse isn't well throttled — mitigated but not eliminated by the fingerprint/IP quota tradeoff (Section 27).
- Users may misunderstand the value proposition and expect NoBlur to "bypass" WhatsApp compression despite explicit messaging — ongoing UX/copy risk requiring careful onboarding language.
- Presigned direct-upload approach requires correct CORS/bucket configuration; misconfiguration is a common launch blocker.
- Behavioral UX techniques (loss aversion, contrast framing) must stay within honest, non-manipulative bounds — copy is always specific and truthful (Section 25's transparent-messaging pattern), never fabricated urgency or invented numbers.

## 31. Assumptions

Items marked ASSUMPTION: accent color hex values (Section 12), retention window exact hours (1hr source / 24hr output), verification tolerance (±10%), SSIM floor (0.90), rate limit thresholds (20 req/min/IP), job timeouts (5 min video / 30s image), initial free/premium job-count values (explicitly flagged in Section 27 as tunable), and the 8% mux overhead margin (Section 14, flagged for empirical tuning in Milestone 3). WhatsApp platform limits (duration, resolution, size ceilings) are sourced values in the config table (Section 16/21), subject to periodic re-verification, not open-ended assumptions. Payment provider is locked to Flutterwave (AGENTS.md Q2); Stripe references in prior drafts are superseded.

## 32. Open Questions

- **Premium price point and billing cadence** — this is a **Phase 2 decision**, not Phase 1. Flutterwave is the locked payment provider (AGENTS.md Q2); all checkout/subscription code will integrate against Flutterwave's API only. No pricing is set, displayed, or hard-coded in Phase 1.
- Should free tier be capped by fingerprint+IP only, or is a lightweight non-blocking email capture acceptable for MVP to reduce abuse, given the explicit tradeoff in Section 27?
- Should Status splitting use fixed-interval cuts or invest in scene-detection cuts for MVP (currently deferred to Phase 2, and lower-priority given splitting is a minority-case feature)?
- Legal review needed on WhatsApp trademark usage in app naming/marketing ("WhatsApp Status/Chat preset" terminology).
- What cadence should the empirical WhatsApp validation (Milestone 2) repeat at post-launch — monthly, or on every WhatsApp app update?
- Should the onboarding preference answers (FR-13) ever be surfaced back to the user (e.g., "since you care most about quality, we..."), or kept purely as an invisible copy-tone input?

## 33. Future Features

- User accounts with job history and saved presets.
- AI-assisted scene-aware Status splitting (smart cut points) — genuinely AI/ML-based, to be clearly distinguished in marketing from the deterministic MVP pipeline. (Fixed-interval splitting plus the scene *analysis* used for profile selection are shipped; smart *cut points* are not.)
- Native share-to-WhatsApp intent (where platform APIs allow) instead of manual download.
- Native share sheet integration using Web Share API for platforms that support it, falling back to the current wa.me link approach.
- Batch presets and folder-level processing for premium.
- Support for additional destinations (Instagram Stories/Reels, Telegram) as parallel preset families.
- Optional AI upscaling as a premium add-on (explicitly excluded from MVP per constraints).
- A/B testing framework for upsell copy variants (loss-aversion vs. gain-framing) to validate Section 29's conversion metric with real data.

## 34. Phased Roadmap

**Phase 1 — MVP**
Core upload → smart-default preset → optimize → download flow (with visual before/after comparison and goal-gradient progress) for video and image, no login, freemium quota with first-job reciprocity, WhatsApp Status/Chat/Custom presets sourced from verified current limits, resumable upload, single-file processing, PWA installable shell, indexable marketing pages with full SEO/structured data.

**Phase 2**
Batch upload for premium, payment integration (checkout, subscription management), scene-aware Status splitting (smart cut points), expanded analytics dashboard, optional user accounts (non-mandatory, for history/sync), hard quota enforcement tied to accounts, A/B testing for upsell copy.

> Note: VMAF quality verification and the scene-analysis engine were originally listed as Phase 2 features. They shipped as part of the v1.1 adaptive engine milestone (FR-16) and are no longer future work.

**Phase 3**
Additional destination presets (Instagram/Telegram), multi-region hosting for latency, optional AI upscale add-on, native share-sheet integration, advanced/expert mode with exposed manual controls for power users.

## 35. Development Milestones

1. Repo scaffolding: Next.js frontend, Fastify API, Prisma schema, R2 buckets, Redis (with AOF persistence)/BullMQ wiring. _(Done in prototype: `lib/`, `config/`, `app/sitemap.ts`, `next.config.ts`.)_
2. Empirical WhatsApp limits/behavior validation: manual test sends across Status/Chat on current device/OS versions, to lock real constants for resolution, duration, size, and compression thresholds into the `PlatformLimit` config table — before any pipeline code is built against guessed numbers.
3. Analysis + bitrate engine: `ffprobe` integration, Section 14 formula implementation, unit tests against known inputs. _(Done in prototype: `lib/bitrate.ts`, `lib/resolution.ts`, `tests/bitrate.test.ts` — 9/9 passing.)_
4. Video pipeline: FFmpeg encode wrapper, resolution/codec rules from the validated config table, Status splitting logic, quality-vs-size dual retry paths. _(Done in prototype: `lib/pipeline.ts`, verified against a real generated 1080p/10s clip.)_
5. Image pipeline: binary-search quality encoder, dimension capping, EXIF stripping.
6. Job status system: SSE/polling endpoint, progress UI with goal-gradient display, visual before/after comparison component. _(Progress-stage logic done in prototype: `lib/progress-stages.ts`, `tests/growth-ux.test.ts`.)_
7. Growth/conversion layer: smart defaults, first-job reciprocity, onboarding preferences, loss-aversion upsell copy. _(Done in prototype: `lib/smart-defaults.ts`, `lib/growth-ux.ts`, fully unit-tested.)_
8. Quota system: fingerprint/IP hashing, `UsageRecord` enforcement, upsell UI.
9. Cleanup/retention: single-source-of-truth deletion cron (R2 delete + Postgres `deletedAt` atomically), R2 lifecycle rule configured only as backup.
10. SEO layer: metadata/structured data component, sitemap, robots.txt, llms.txt, CSP headers. _(Done in prototype: `lib/seo.ts`, `app/sitemap.ts`, `public/robots.txt`, `public/llms.txt`, `next.config.ts`.)_
11. Monitoring: Sentry + PostHog wired across client and server, including growth/UX events.
12. Adaptive engine — analysis worker: `ffprobe` probing + OpenCV scene analysis (face/text/brightness/contrast at 1 fps) + magic-byte validation, writing scene scores to `Job.analysisResult` (FR-16). _(Done: `workers/analysis-worker.ts`, `lib/analysis.ts`, `lib/opencv_analyze.py`.)_
13. Adaptive engine — policy engine + profiles + quality gate: `lib/policy-engine.ts` selecting from `config/encoding-profiles.json` (9 profiles, 3 families), AV1 (`libsvtav1`) primary on the document/preview path with H.264 fallback, VMAF gate (`lib/vmaf.ts`, floor 80, single CRF-3 re-encode) with SSIM secondary (FR-16). _(Done: migrations `add_encoding_profiles`.)_
14. Destinations + share credits: `Job.destination` end-to-end (migration `add_job_destination`), `UsageRecord.bonusCount` + `POST /api/v1/usage/share-bonus` (migration `add_share_bonus_credits`, FR-17).
15. Final QA pass: re-validate against real WhatsApp Status/Chat sends one more time before launch, confirming the `PlatformLimit` constants still hold and the quality bar is met on the 20-clip reference test set.

## 36. Acceptance Criteria

- A user can upload a video, get a correctly pre-selected preset from smart defaults, override it if needed, and receive a downloadable MP4 that scores at least 0.05 higher on SSIM than the unprocessed original would, at the same final delivered file size.
- Every video job passes through the adaptive engine (FR-16): the analysis worker produces a scene profile, the policy engine selects a profile from `config/encoding-profiles.json`, and the output clears the VMAF floor of 80 (or triggers at most one CRF-3 re-encode that does).
- A user who shares NoBlur on WhatsApp receives 3 bonus compressions for the day, exactly once per day, and cannot claim the bonus twice (FR-17).
- A user can upload a video longer than the current Status duration ceiling (90 seconds, sourced from the `PlatformLimit` config table, not hardcoded) and receive correctly split, independently downloadable segments.
- A user can specify a custom target size within the 1–16MB range and receive output within ±10% of that target, or a transparent explanation if that wasn't achievable.
- A user's first job always completes and shows the full before/after comparison, regardless of any quota state.
- Free-tier users are blocked from submitting a 6th job in a rolling day (excluding a still-unused first job) and shown a loss-aversion-framed upgrade prompt, without needing to log in.
- All uploaded source files are verifiably deleted from storage within the stated retention window, confirmed by a single, auditable deletion code path.
- The download screen shows both a size comparison and a visual before/after frame comparison — not size alone.
- The primary post-optimization action is "Send to WhatsApp" with a pre-filled branded share message; "Download to device" is always available as a secondary option.
- The progress indicator visibly front-loads early stages and counts down remaining steps near completion.
- No user-facing copy anywhere in the app claims to "bypass" or "remove" WhatsApp compression, or refers to the deterministic pipeline as "AI."
- Marketing pages are indexable and pass a structured-data validation check (Rich Results Test) for Organization and SoftwareApplication schema; job pages are confirmed non-indexed.
- The app passes a Lighthouse PWA installability audit and functions correctly, including resumable upload recovery, on a mid-range Android device over throttled/interrupted 4G.

## 37. SEO & Discoverability

**Meta tags & structured data:** Every marketing page (`/`, `/about`, `/pricing`, `/how-it-works`) is server-rendered with unique title, description, canonical URL, Open Graph, and Twitter Card tags via a shared metadata builder (`lib/seo.ts`). Organization and SoftwareApplication JSON-LD structured data is rendered once in the root layout, describing NoBlur's actual free/paid model accurately — structured data must never overstate pricing or capability beyond Section 27's real business model.

**Crawling & indexing:** `public/robots.txt` allows marketing pages and explicitly disallows `/jobs/*` and `/api/*`, since those hold transient, user-specific state. `app/sitemap.ts` generates a dynamic sitemap covering only static, indexable routes. Job pages additionally carry `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` headers (`next.config.ts`) as defense in depth beyond robots.txt.

**AI crawler guidance:** `public/llms.txt` gives AI/LLM crawlers a concise, accurate summary of what NoBlur is and does — explicitly stating that NoBlur does not bypass WhatsApp compression, mirroring the product's own honesty commitment (Section 24) so AI-generated answers about NoBlur don't misrepresent it.

**Content Security Policy:** Scoped narrowly to the third parties NoBlur actually uses — Google Tag Manager/Analytics (wildcarded subdomains per Google's own CSP guidance, since exact hostnames can change) and Sentry — implemented in `next.config.ts`, tested by loading a page with GA4 enabled and confirming no CSP violations in the browser console before launch.

**Google Search Console workflow (operational, not code):** verify the property via DNS TXT (domain property, covers all subdomains/protocols) at launch; submit the sitemap path once; use URL Inspection + Request Indexing only for individual new/changed high-value pages, not bulk; monitor the Pages/Indexing report weekly for "Crawled – currently not indexed" symptoms (a common signal for client-rendered pages that aren't actually server-rendering their content); validate structured data via the Rich Results Test after any schema change.

## 38. Growth & Conversion UX (Behavioral Design)

This section documents the specific behavioral UX patterns implemented in the product, each backed by working code and unit tests in the prototype, so they're auditable rather than just described:

| Pattern              | Where applied                  | Implementation                                                                                                           |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Smart Defaults       | Preset selection (FR-2)        | `lib/smart-defaults.ts` — heuristic based on aspect ratio, duration, and file size; tested in `tests/growth-ux.test.ts`. |
| Goal Gradient Effect | Progress indicator (FR-8)      | `lib/progress-stages.ts` — front-loaded display percentage, step countdown near completion.                              |
| Reciprocity          | First-job exemption (FR-11)    | `lib/growth-ux.ts`'s `isFirstJobExemptFromQuota` — guarantees full value shown before any limit.                         |
| IKEA Effect          | Onboarding preferences (FR-13) | `lib/growth-ux.ts`'s `ONBOARDING_QUESTIONS` / `applyOnboardingPreferences` — light, skippable, never gating.             |
| Loss Aversion        | Upsell copy (FR-12)            | `lib/growth-ux.ts`'s `buildUpsellCopy` — leads with cost of staying free.                                                |
| Contrast Effect      | Upsell copy ordering (FR-12)   | Same function — the "cost" line is returned/rendered before the price line, anchoring perception.                        |

**Guardrail:** every one of these patterns is implemented using real, specific, truthful data (actual jobs blocked, actual price, actual file characteristics) — never fabricated scarcity, invented counters, or misleading claims. This is a hard constraint, not a style preference (Section 30).
