---
trigger: always_on
---


Governs the FFmpeg/ffprobe processing pipeline and the BullMQ queue that
runs it (`lib/pipeline.ts`, `lib/bitrate.ts`, `lib/resolution.ts`,
`workers/`). States constraints on agent behavior — not an FFmpeg tutorial.

## Retry paths — never conflate them

- There are exactly two retry paths (PRD FR-7):
  - **Size-triggered:** output size outside ±10% tolerance → adjust bitrate
    by the measured delta, re-encode.
  - **Quality-triggered:** SSIM below the 0.90 floor → drop one resolution
    tier and recompute bitrate, re-encode. Never re-encode at the same
    bitrate on a quality failure — it reproduces the same artifact.
- Maximum 2 retries total, combined across both paths, per job
  (AGENTS.md #17, #18). A job that still fails tolerance after that shows
  the user the actual achieved result transparently (PRD §25) — it does not
  attempt a third retry to "get it right."

## Quality verification

- SSIM is sampled at fixed 2-second intervals across the full duration, with
  the source scaled to output resolution via `scale2ref` before comparing
  (PRD §13). Don't sample fewer points to save compute without flagging it.
- VMAF is Phase 2. Do not implement it, wire it in as an optional flag, or
  add a config value for it in Phase 1 (AGENTS.md, PRD §33).

## Resolution and bitrate

- Never upscale a video or image beyond its source resolution, regardless
  of the preset's resolution cap (PRD §16, AGENTS.md #16).
- Codec/container is locked: H.264 (libx264), MP4, AAC audio. H.265/AV1
  requires explicit instruction, not agent judgment (AGENTS.md, PRD §16).
- All WhatsApp platform constants (duration, resolution, size ceilings) come
  from `config/platform-limits.json` / `PlatformLimit` — never a hardcoded
  `90` or `720` in pipeline code.
- The mux overhead margin (`MUX_OVERHEAD_MARGIN` in `lib/bitrate.ts`) is a
  single named constant specifically because it's flagged as empirically
  unvalidated (PRD §14) — never inline it, and never treat it as locked
  without a Milestone 3 validation note.

## Status splitting

- Only triggers when duration exceeds the config-table ceiling (currently
  90s) — it's a minority-case feature, not a headline flow (PRD §16, §11).
- Splitting uses fixed-interval cuts in MVP. Scene-aware/smart cuts are
  Phase 2 — do not build them now even if it looks trivial to add
  (AGENTS.md, PRD §33).
- Boundary behavior at exactly the ceiling (89s/90s/91s) must be covered by
  an explicit test — this is a named edge case in the PRD (§26), not an
  incidental one.

## Queue and failure handling

- Two separate BullMQ queues: `media-analysis`, `media-encode` — encode
  concurrency is tuned independently of analysis (PRD §19).
- Before retrying a failed FFmpeg job, classify the failure: transient
  (OOM/signal-killed) → retry; permanent (invalid data/decode error) → fail
  immediately, no retry (PRD §19, §25). Never write a single generic retry
  path that treats both the same.
- Job timeout: 5 minutes video, 30 seconds images. On timeout, mark failed
  and notify — don't silently extend the timeout to let a stuck job "finish."
- On a Redis/queue restart mid-job, rely on BullMQ's stalled-job recovery
  and show the user "still processing" — never silently drop the job or
  silently mark it failed without recovery attempt (PRD §17, §25).

## Adaptive encode ladder

- Preset/pass selection (`-preset slow` + two-pass at low queue depth down
  to `-preset fast` + single-pass CRF-capped at high depth) is one
  documented ladder, stepping down together — don't let individual settings
  drift independently of queue depth (PRD §19).

## Friction log — mandatory pre-signoff walkthrough (Stripe practice)

Before any checkpoint in a build prompt may be marked done, the agent must:

1. **Walk the built flow as a first-time user would** — no debug tools, no
   pre-seeded data, no "I know what happens next" shortcuts. Use the actual
   UI, the actual API, the actual error responses.
2. **List every friction point found**, even small ones: a label that's
   ambiguous, a tap target that's too small, a state that doesn't explain
   itself, a transition that feels slow, a loading state that appears but
   never resolves to anything visible, an empty state that leaves the user
   unsure what to do next.
3. **Include this friction log in the final checkpoint report.** The report
   is not complete without it.

A checkpoint with zero friction points listed is more suspicious than one with
three real ones — it likely means the agent did not actually walk the flow.

**Blocking-friction rule:** Any friction point found that touches a rule in
`security.md`, `money-and-billing.md`, or `uploads-and-storage.md` must be
treated as a blocking bug, not a polish note. For example:
- A loading state that reveals a raw presigned URL in the address bar or
  response body (touches `security.md`).
- An upload failure that leaves a partial file visible to the next user
  attempt (touches `uploads-and-storage.md`).
- A quota-exhausted state that shows a non-functional upgrade button with no
  billing integration wired (touches `money-and-billing.md`).

In each case, cite the specific rule file and the rule number or heading it
touches. The checkpoint cannot be marked done until the blocking friction is
resolved or explicitly flagged to a human with a documented decision to defer.

## Definition of done (pipeline-level)

- [ ] Size and quality retry paths remain distinct code paths.
- [ ] Combined retries never exceed 2 for a single job.
- [ ] No hardcoded WhatsApp constant introduced anywhere in `/lib` or `/workers`.
- [ ] No upscale-past-source-resolution path introduced.
- [ ] Status-split boundary (89/90/91s) has an explicit test if splitting logic changed.
- [ ] Failure classification (transient vs. permanent) is respected in any new retry code.
