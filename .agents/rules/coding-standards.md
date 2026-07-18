---
trigger: always_on
---

Source of truth for *what* to build: `COMPr-PRD-v1.md`. Source of truth for
locked stack/architecture: `AGENTS.md`. This file governs code shape and
quality only — it does not restate rules already in AGENTS.md Q5, it adds to them.

## Language & typing

- TypeScript everywhere (frontend, `/lib`, `/server`, `/workers`). No implicit `any`.
- `@ts-ignore` requires a one-line comment explaining why — an unexplained
  suppression is treated as a bug, not a shortcut.
- `tsc --noEmit` must pass with zero errors before a task is reported done.

## Function and file shape

- `/lib` functions are small, pure, and named for what they compute
  (`calculateBitrate`, `dropOneResolutionTier`) — never generic (`process`,
  `handle`, `doStuff`).
- No file in `/lib` exceeds ~200 lines. Split before it becomes a "pipeline god file."
- Every exported `/lib` function has a corresponding unit test in `/tests`,
  mirroring the `/lib` structure 1:1. Logic without a test is incomplete work,
  not "good enough for now."

## Error handling

- All API errors return the standard envelope: `{ error: { code, message } }`
  (PRD §18). No route invents its own error shape.
- Error `code` values are stable, documented strings (e.g. `INVALID_PRESET`,
  `QUOTA_EXCEEDED`) — never a raw exception message leaked to the client.
- User-facing error copy is plain-language (PRD §25 table). Internal error
  detail (stack traces, file paths, DB errors) never reaches the client —
  log it to Sentry, return the generic mapped message instead.
- FFmpeg/ffprobe failures are classified before retry logic runs: transient
  (OOM/signal-killed) vs. permanent (invalid data/decode error) — per PRD §19.
  Never write a retry path that treats all failures the same way.

## Comments

- Comments explain *why*, not *what* — especially for constants tied to a PRD
  assumption (mux overhead margin, SSIM floor, retry counts, tolerance
  percentages). Reference the PRD section number.
- No magic numbers for anything WhatsApp-related. Pull from
  `config/platform-limits.json` / `PlatformLimit` — never inline a `90` or `720`.

## Environment & secrets

- Secrets (Flutterwave keys, R2 credentials, DB URL) are read from
  `process.env` only, validated at boot (fail fast if missing), never
  hardcoded, never logged, never committed.
- Any new environment variable is called out explicitly in the task summary,
  not silently added.

## Linting & formatting

- Prettier + ESLint run in CI. Do not hand-format around the linter, and do
  not disable a lint rule to make a diff pass without flagging it.

## Detail Discipline — Visual and Interaction Craft

All three rules below are derived from the same principle (Linear/Stripe/Vercel
pattern of monochrome-plus-one-accent, generous whitespace, sharp typography)
and map directly to the existing M3 token system — they do not introduce a new
palette or spacing scale.

### 1. One saturated color per screen

The existing M3 token set (PRD §12) uses the WhatsApp accent (`#25D366` /
`#075E54`) as the primary and primary-container colors. No screen may introduce
a second saturated color (a second accent, a bright red call-to-action, a
distinct brand teal) without a stated PRD reason for that specific element.
Error colors (`--md-sys-color-error`) are exempt — they are functional, not
accent.

If an agent uses a second saturated color for visual variety rather than for a
PRD-stated function, treat that as a rule violation, not a style choice — it
defeats the deliberate monochrome-plus-one-accent discipline that makes the
WhatsApp accent meaningful.

### 2. Spacing from the token scale only

All margins, paddings, and gaps must use the design-system skill's spacing
scale (derived from the M3 token system). If a gap "looks a little tight,"
the fix is to go up one token step (e.g. from `p-3` to `p-4` in Tailwind,
which maps to the M3 spacing scale) — never a one-off pixel value or a
Tailwind arbitrary value like `p-[13px]`.

This applies to every layout, every component, every screen — there is no
"quick spacing tweak" exception.

### 3. Empty states, error states, and loading states get the same craft bar

Every empty state, error state, and loading state must be built with the same
care as the primary happy-path screen. The PRD already requires these states
to exist (FR-8 goal-gradient progress for loading states, §25's error-handling
table for error states, §11 step 12's upsell screen for quota-exhausted
states). This rule adds that they must also meet the same visual and
interaction craft bar — not a bare text string, not a default browser error
page, not a spinner slapped onto a blank background.

The single most common gap between an average product and a well-crafted one
is neglected non-happy-path screens. This rule exists to prevent that gap
before it ships.

## Definition of done (code-level)

- [ ] `tsc --noEmit` passes, zero TS errors.
- [ ] Lint passes, zero errors.
- [ ] Every new `/lib` function has a passing unit test.
- [ ] No magic WhatsApp constants introduced.
- [ ] No secret hardcoded or logged.
- [ ] Error responses conform to the standard envelope.
