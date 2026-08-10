# AGENTS.md: COMPr Build Rules

## Question 1: What Is This Project?

COMPr is a mobile-first Progressive Web App that optimizes photos and videos before a user sends them on WhatsApp — automatically choosing resolution, bitrate, codec, and container so the file survives WhatsApp's own re-compression with as little visible quality loss as possible. It never bypasses, disables, or claims to bypass WhatsApp's compression.

**Users:** online sellers, small business owners, digital marketers, content creators, and everyday WhatsApp users. Primary launch market has variable, often constrained mobile connectivity.

**Version being built:** The adaptive engine milestone — Phase 1 MVP plus the previously-Phase-2 adaptive encoding engine (scene analysis, policy-selected encoding profiles, AV1 + VMAF quality gating) now shipped as the current milestone. The remaining Phase 2 (accounts/auth, real payments) and Phase 3 features are still out of scope until told otherwise — see Question 3.

**Source of truth:** `COMPr-PRD-v1.md` (Version 1.0). If this file and the PRD ever conflict on _what_ to build, the PRD wins. If they conflict on _how_ to build it, this file wins. This file does not restate the PRD's features — it constrains how the agent behaves while building them. When a rule below cites a PRD section or FR number, that number is the authority for the underlying requirement.

---

## Question 2: What Is Locked

These choices are already made. Do not change, swap, "improve," or replace any of them without an explicit instruction from a human. This includes not substituting a "simpler" or "more popular" alternative on your own judgment.

### Stack

- Frontend: Next.js + React + TypeScript, styled with Tailwind CSS configured to reference Material 3 (M3) CSS custom properties (`styles/m3-tokens.css`), built as a PWA. Tailwind is the utility framework; M3 tokens are the single source of truth for all visual values (colors, typography, shape, elevation, motion).
- Language default: Nigerian Pidgin (`lang="pcm"`). All user-facing UI copy ships in Pidgin by default. The HTML `lang` attribute is `pcm` so any browser can auto-translate to English or any other language. Do NOT hardcode `lang="en"` - the default is always Pidgin.
- Backend API: Node.js + Fastify.
- Media processing: FFmpeg / ffprobe, invoked only via an argument array (`execFile`), never via a shell string.
- Queue: BullMQ on Redis, with AOF persistence and a managed/backed-up Redis instance. Never run Redis with ephemeral/default persistence config.
- Database: PostgreSQL via Prisma ORM. Do not introduce a second ORM or raw-SQL layer alongside Prisma.
- Object storage: Cloudflare R2, accessed only via presigned URLs. The API server must never proxy raw file bytes.
- Hosting: Vercel for the frontend/API; Railway or Render for the worker pool. Worker region must be chosen for latency to the launch market, not defaulted to US/EU.
- Monitoring: Sentry for errors, PostHog for product analytics. Do not add a third analytics or error-tracking vendor.
- Analytics: PostHog is wired into the frontend via `app/providers.tsx`. Track all key user events. The `trackEvent` function is exported from `app/providers.tsx` and must be called at each touchpoint. Canonical event names (PRD §28):
  - **MVP (Phase 1):** `upload_started`, `upload_completed`, `upload_failed`, `onboarding_answered`, `onboarding_skipped`, `smart_default_preset_shown`, `smart_default_preset_overridden`, `job_submitted`, `job_stage_changed`, `job_completed`, `job_failed`, `download_clicked`, `share_to_whatsapp_clicked`, `before_after_comparison_viewed`, `post_send_feedback_submitted`, `quota_exhausted_shown`, `upgrade_clicked`, `checkout_started`, `checkout_completed`, `pwa_installed`
  - **Additional implemented events:** `file_selected`, `job_created`, `quota_exceeded`, `upsell_shown`, `upsell_cta_clicked`, `upsell_dismissed`, `onboarding_step_completed`, `feedback_given`, `share_bonus_clicked`, `history_redownload`, `history_entry_removed`, `history_cleared`
  - When building new features, always use the PRD §28 event names as the primary source. Add new events only when the PRD list does not cover the interaction.
- **Payment provider: Flutterwave.** This supersedes any other payment provider referenced in prior drafts of the PRD (including Stripe or Paystack). All checkout, subscription, and billing-webhook code must integrate against Flutterwave's API only.

### Media pipeline choices

- Video codecs: AV1 (`libsvtav1`) is the primary codec on the document/preview path; H.264 (`libx264`) remains the fallback for the standard WhatsApp chat path and the legacy `runPipeline`. Both output MP4 with AAC audio. H.265 is explicitly rejected. Do not remove AV1 support or expand to other codecs without explicit instruction.
- Quality metric: VMAF is the primary gate, scored against the bundled model on a middle 5-second segment (`lib/vmaf.ts`, `VMAF_FLOOR` 80). A score below the floor triggers a single re-encode at CRF reduced by 3. SSIM remains the secondary metric. Do not change the floor or the segment-based sampling without explicit instruction.
- Encoding profiles: The policy engine (`lib/policy-engine.ts`) selects a profile from `config/encoding-profiles.json` by job destination + scene-analysis scores. There are 9 profiles across 3 families (`whatsapp_normal_*`, `whatsapp_hd_*` H.264, `av1_document_*` AV1), each with face / text / balanced variants. Profile selection and CRF modifiers are locked; add a profile only by editing the JSON config, never by hardcoding in pipeline code.
- Scene analysis: `workers/analysis-worker.ts` runs an OpenCV scene analyzer (face/text/brightness/contrast at a 1 fps sample) and magic-byte validation before encoding. Scene scores feed profile selection only — they do not drive status-splitting cuts.
- WhatsApp platform constants (duration/resolution/size ceilings) live only in the `PlatformLimit` config table (`config/platform-limits.json` in dev, DB-backed in prod). Never hardcode a WhatsApp duration, resolution, or size value anywhere else in the codebase.
- Status splitting uses fixed-interval cuts in MVP. Scene-aware/smart cuts are Phase 2 — do not build them now even if it looks trivial to add.

---

## Question 3: What Must Never Happen

Breaking any rule in this section means the task has failed, even if the code compiles, the feature demos correctly, and tests pass. These are not style preferences.

### Claims and framing

- **1.** Never generate or ship copy claiming COMPr "bypasses," "removes," "disables," or "defeats" WhatsApp's compression, in any UI string, marketing page, error message, or comment intended for user-facing text. (PRD §1, §6, §36)
- **2.** Never refer to the processing pipeline as "AI" in code names, UI copy, API responses, or docs. It is deterministic rule-based logic - name it "automated." (PRD §6, §13, §36)
- **3.** Never fabricate scarcity, urgency, counters, or statistics in upsell/behavioral UX copy. Loss-aversion and contrast-effect messaging must always be built from real, specific data (actual jobs blocked, actual price) - never invented numbers. (PRD §30, §38)
- **4.** All user-facing UI copy must be written in Nigerian Pidgin English. The `lang="pcm"` attribute handles browser auto-translation. Do NOT write copy in English and rely on translation - write it natively in Pidgin. SEO meta descriptions may remain in standard English for search engine crawlers.

### Access, money, and quota

- **5.** Never require login, account creation, or email capture to use core functionality in this phase. MVP is login-free. (PRD §6, §33)
- **6.** Never let a "custom" target size be requested or accepted outside the 1-16MB range. Reject anything else at the API layer. (PRD FR-2)
- **7.** Never accept `targetSizeMB` on a request unless `preset === "custom"`. Reject with a 400 for `status`/`chat` presets that include it. (PRD §18)
- **8.** Never let a premium plan be truly unbounded. Premium must be capped at a configured high daily limit, even though it is marketed as effectively unlimited. (PRD FR-11, §27)
- **9.** Never skip the first-job reciprocity exemption. The first job for any new fingerprint must always run to completion and show the full before/after comparison, regardless of quota state. (PRD FR-11, §36)
- **10.** Never process a Flutterwave payment or webhook without verifying the webhook signature. Never store raw card data - Flutterwave's hosted checkout/tokenization only.

### Privacy and data

- **11.** Never retain an uploaded source file past job completion (or timeout + 1hr grace) or an output file past 24 hours. (PRD §22)
- **12.** Never let more than one code path write `MediaFile.deletedAt`. The cleanup cron job is the sole writer; any R2 lifecycle rule is backup only. (PRD §20, §22)
- **13.** Never use uploaded file content for anything other than producing the requested job's output. Never use it for training, analytics payloads, or share it with a third party. (PRD §24)
- **14.** Never store a raw IP address. Store only a salted, one-way hash of fingerprint and IP. (PRD §23, §27)
- **15.** Never trust a client-supplied MIME type or file extension for validation. Always verify real file type via magic-byte sniffing server-side. (PRD §23)
- **16.** Never let uploaded EXIF/GPS metadata pass through to an output image unstripped (orientation tag is the only exception). (PRD §15, §24)

### Media correctness

- **17.** Never upscale a video or image beyond its source resolution, regardless of the preset's resolution cap. (PRD §16)
- **18.** Never re-encode at the same bitrate on a quality-triggered retry: a quality failure must drop one resolution tier instead. A size failure must adjust bitrate instead. These are two distinct paths; never conflate them. (PRD FR-7)
- **19.** Never exceed 2 total retries across both retry paths combined for a single job. (PRD FR-7)
- **20.** Never shell-interpolate a filename, path, or any user-derived string into an FFmpeg or ffprobe command. Always pass arguments as an array. (PRD §23)

### Discoverability

- **21.** Never let a `/jobs/*` page be indexable. It must always carry `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`, and must be disallowed in `robots.txt`. (PRD §22, §37)

---

## Question 4: How Is The Work Arranged

```text
/app                        # Next.js App Router — pages, layouts, sitemap.ts
  /(marketing)               # /, /about, /pricing, /how-it-works — SSR/SSG only
    page.tsx                 #   homepage (SSR)
    about/page.tsx           #   about page
    pricing/page.tsx         #   pricing page
    how-it-works/page.tsx    #   how it works page
    marketing-client.tsx     #   shared marketing client component
  /dashboard                 # main dashboard — upload, quota, active job
    dashboard-client.tsx     #   upload flow, toast, upsell modal, share
  /jobs/[id]                 # job status/result page — noindex, client-rendered OK
  /onboarding                # preference onboarding — 4 steps, skip anytime
    onboarding-client.tsx    #   step flow, progress bar, accessibility
  error.tsx                  # root error boundary
  not-found.tsx              # 404 page
  loading.tsx                # skeleton loading state (route transitions)
  globals.css                # skip-to-content, prefers-reduced-motion, skeleton shimmer
  layout.tsx                 # root layout, structured data, lang="pcm", hreflang
  providers.tsx              # PostHog analytics provider, trackEvent(), identifyUser()
  sitemap.ts                 # dynamic sitemap

/components                 # React UI primitives — reusable, stateless where possible
  ui/
    Toast.tsx               #   accessible toast notification
    Skeleton.tsx            #   shimmer loading placeholder
    EmptyState.tsx           #   empty state with illustration
  BeforeAfterSlider.tsx     #   frame comparison slider with image load states
  WhatsAppStatusPreview.tsx #   phone-frame mockup for WhatsApp Status trim preview
  ProcessingHistory.tsx     #   localStorage-based recent jobs with re-download

/lib                         # Framework-agnostic core logic — pure functions,
                             #   unit-testable without a server or DB running.
  bitrate.ts                 #   Section 14 bitrate math
  resolution.ts              #   resolution ladder, retry tier logic
  pipeline.ts                #   legacy ffprobe/ffmpeg orchestration + SSIM gate
  probe.ts                   #   ffprobe source probing (streams, duration, orientation)
  encode.ts                  #   FFmpeg encode command builder + EncodeParams
  ssim.ts                    #   SSIM verification against the source (secondary metric)
  vmaf.ts                    #   VMAF scoring (primary gate, VMAF_FLOOR 80) + re-encode trigger
  analysis.ts                #   scene-analysis orchestration (calls opencv_analyze.py)
  opencv_analyze.py          #   OpenCV scene analyzer — face/text/brightness/contrast at 1fps
  policy-engine.ts           #   selects encoding profile from config/encoding-profiles.json
  smart-defaults.ts          #   preset suggestion heuristic
  progress-stages.ts         #   goal-gradient progress display mapping
  growth-ux.ts               #   reciprocity, onboarding, upsell copy builders
  whatsapp-share.ts          #   WhatsApp share URL builder with deep link support (FR-15)
  size-predictor.ts          #   client-side output size + quality estimation
  job-history.ts             #   localStorage-based recent jobs with TTL
  seo.ts                     #   metadata + structured data builders
  file-validation.ts         #   client-side pre-upload validation
  sniff-file-type.ts         #   server-side magic-byte sniffing
  crypto.ts                  #   fingerprint hashing utilities
  prisma.ts                  #   Prisma client singleton
  queue.ts                   #   BullMQ queue connection

/config                      # Non-secret, environment-agnostic config
  platform-limits.json         #   WhatsApp constants — dev/local mirror of
                                #   the PlatformLimit DB table
  encoding-profiles.json       #   adaptive engine encoding profiles (9 profiles, 3 families)

/models                      # Binary/model assets loaded at runtime
  vmaf_v0.6.1.json           #   VMAF quality model consumed by lib/vmaf.ts

/scripts                     # Repo-scoped dev/test helper scripts
  test-whatsapp.ts           #   end-to-end WhatsApp path smoke test
  test-downloads-compat.ts   #   download-compat smoke test
  test-tecno-compat.ts       #   Tecno device compatibility smoke test

/server                      # Fastify API app — thin HTTP layer only.
  index.ts                   #   Fastify server bootstrap
  routes/
    uploads.ts               #   presigned upload URLs, file intake
    jobs.ts                  #   job creation, status, results
    usage.ts                 #   daily quota checks
    onboarding.ts            #   preference save
    billing.ts               #   Flutterwave checkout, webhooks
  plugins/
    rate-limit.ts            #   auth-free rate limiting
  services/
    storage.ts               #   R2 presigned URL generation

/workers                     # BullMQ worker processes — no HTTP surface.
  encode-worker.ts           #   video/image encode pipeline
  analysis-worker.ts         #   ffprobe analysis, SSIM scoring
  cleanup-cron.ts            #   sole writer of MediaFile.deletedAt
  run-all.ts                 #   worker process entrypoint

/prisma
  schema.prisma
  /migrations

/public
  robots.txt
  llms.txt
  compr-logo.svg
  favicon.ico
  favicon.svg

/styles
  m3-tokens.css              #   M3 color, type, shape, elevation, spacing, motion tokens

/tests                       # Mirrors /lib and /server structure 1:1.
                             #   Every file in /lib gets a corresponding test file.
  bitrate.test.ts
  growth-ux.test.ts
  pipeline.test.ts
  rate-limit.test.ts
  seo.test.ts

docs/                        # Project documentation — PRD, agent rules, design practices
  AGENTS.md                  #   build rules for AI agents
  CHANGELOG.md               #   design system compaction and token migration history
  COMPr-PRD-v1.md            #   product requirements document
  COMPr-styling.css          #   legacy styling reference
  DESIGN_SYSTEM_PRACTICES.md #   M3 token discipline, typography, dark mode

.agents/                     # Agent configuration — rules and skills
  rules/                     #   behavioral constraints (copy, security, billing, etc.)
  skills/                    #   domain-specific workflows (upload, billing, UI, etc.)

nginx/                       # Nginx proxy configuration
  nginx.conf                 #   highly optimized Nginx config (gzip, caching, proxy upstreams)

next.config.ts               # Security headers, CSP
package.json
tailwind.config.ts           # Tailwind config mapped to M3 tokens
eslint.config.mjs            # ESLint config
postcss.config.mjs           # PostCSS config
tsconfig.json                # TypeScript config
docker-compose.yml           # Local dev/prod services (Postgres, Redis, Web, API Server, Nginx)
Dockerfile.worker            # Worker image with Node.js 22, FFmpeg, OpenCV, VMAF
Dockerfile.web               # Frontend Next.js image
Dockerfile.api               # Backend Fastify API image
.nvmrc                       # Node.js LTS version
```

Rules for this layout:

- Business logic (`/lib`) must never import from `/server` or `/workers`. Dependency direction is one-way: `server` and `workers` import from `lib`, never the reverse.
- HTTP concerns (request parsing, response shaping, status codes) stay in `/server/routes`. Route handlers must not contain FFmpeg calls, bitrate math, or Prisma queries inline — they call into `/lib` and Prisma client only.
- A worker file must never accept or parse raw HTTP requests. If a worker needs to react to something, it does so via the queue, not a new endpoint.
- Anything that touches an FFmpeg process, a filesystem path, or a child process lives in `/lib/pipeline.ts` or its worker caller — never inline in a route handler or a React component.

---

## Question 5: How Should The Code Look

- **TypeScript everywhere** (frontend, `/lib`, `/server`, `/workers`). No implicit `any`. No `@ts-ignore` without a one-line comment explaining why.
- **Node.js LTS** only — check `.nvmrc`/`engines` before adding any dependency that requires a newer runtime.
- Functions in `/lib` are small, pure, and named for what they compute (`calculateBitrate`, `dropOneResolutionTier`), not generic (`process`, `handle`, `doStuff`).
- No file in `/lib` exceeds roughly 200 lines. If it's growing past that, split it — don't let a "pipeline god file" happen.
- Every exported function in `/lib` has a corresponding unit test. A PR that adds logic without a test is incomplete, not "good enough for now."
- Comments explain **why**, not what — especially for any constant tied to a PRD assumption (mux overhead margin, SSIM floor, retry counts). Reference the PRD section number in the comment.
- Formatting and linting via Prettier + ESLint, run in CI. Do not hand-format around the linter.
- No magic numbers for anything WhatsApp-related — pull from `config/platform-limits.json` / `PlatformLimit`, never inline a `90` or `720` in pipeline code.
- Environment secrets (Flutterwave keys, R2 credentials, DB URL) are read from `process.env` only, validated at boot (fail fast if missing), never hardcoded, never logged.

---

## Question 6: What Counts As Done

Before reporting a task complete, the agent must produce a checklist covering:

- [ ] The specific PRD requirement(s)/FR number(s) this task implements are listed and each is satisfied.
- [ ] The code builds with zero errors and zero TypeScript errors (`tsc --noEmit` passes).
- [ ] Lint passes with zero errors.
- [ ] Every new function in `/lib` has a passing unit test; the full test suite passes.
- [ ] No rule from Question 3 was violated — the agent explicitly re-checks this list, not just "it seemed fine."
- [ ] No out-of-scope feature was introduced — the adaptive engine milestone (AV1/VMAF/scene analysis/profiles/destination/share bonus) is in scope; anything beyond it (accounts/auth, real payments, status splitting) is cross-checked against PRD §34's phase boundaries.
- [ ] No hardcoded WhatsApp constant, no raw IP storage, no shell-interpolated FFmpeg command, no second payment provider.
- [ ] Any new environment variable or dependency is called out explicitly, not silently added.
- [ ] If the task touched money/payment code, Flutterwave webhook signature verification is present and tested.

---

## Craft Bar — Execution Quality Rules (beyond "does it work")

Before any checkpoint in a build prompt may be reported done, the agent must
also satisfy the three rules below. These codify named, sourced practices —
they are not vague "make it feel premium" language.

### 1. Opinionated Over Configurable — Zero Optional Toggles (Linear Method)

Linear's published Method holds that "constraints produce better products than
configurability." Every place the PRD already specifies a smart default —
FR-2's preset suggestion, FR-13's onboarding preference questions — must ship
with zero optional configuration beyond what the PRD explicitly lists for it.

If an agent is tempted to add a settings toggle "for flexibility" (e.g. a
"turn off smart defaults" checkbox, an "always show this" onboarding override,
a configurable preset list), that is a rule violation, not a nice-to-have.
Cite AGENTS.md #3 (no fabricated features, no "just in case" code) as the
reason to refuse yourself.

### 2. Speed Is a Feature — Perceived-Response Targets (Linear Method)

Linear holds that every interaction should feel instant. This rule ties that
principle to concrete, testable numbers:

- Any user interaction that does not require a network round trip (tap on a
  preset chip, tap to skip an onboarding step, tap to open a file picker)
  must respond within **100ms** perceived latency — the threshold below which
  a UI change feels instantaneous (Miller 1968 / Nielsen 1993).
- Any interaction that does require a network round trip (submitting a job,
  loading usage data) must show an optimistic UI update within **300ms**, with
  a loading state if the real response takes longer.

These numbers are initial targets, to be tuned from real RUM data in Phase 2,
using the same "initial value, tune from real data" framing already used for
unvalidated constants elsewhere in the PRD (see §27's job-count values). They
are codified as new NFR bullet points in PRD §10 (Checkpoint 4 of the
raise-the-bar prompt) so they are testable, not aspirational.

### 3. Friction Logs — Walk the Flow Before Signing Off (Stripe Practice)

Stripe's published practice for shipping quality: before shipping, use the
product yourself as a first-time user would, and write down every point of
friction. This rule makes that practice mandatory:

Before any checkpoint in a build prompt is marked done, the agent must:

1. Walk the built flow as a first-time user would: no debug tools, no
   pre-seeded data, no "I know what happens next" shortcuts.
2. List every friction point found, even small ones: a label that's ambiguous,
   a tap target that's too small, a state that doesn't explain itself, a
   transition that feels slow.
3. Include this friction log in the final checkpoint report.

A checkpoint with zero friction points listed is more suspicious than one with
three real ones — it likely means the agent did not actually walk the flow.
Any friction point that touches a rule in `security.md`, `money-and-billing.md`,
or `uploads-and-storage.md` must be treated as a blocking bug, not a polish
note (codified in `workflow-pipeline.md`, Checkpoint 3 of the raise-the-bar
prompt).

---

## Question 7: What Does The Agent Do When Unsure

- The agent never invents a feature, a business rule, or a scope extension that isn't in the PRD or explicitly requested. If a task seems to imply something the PRD doesn't cover, stop and ask — do not guess and build it anyway.
- The agent never reaches into Phase 2 or Phase 3 to "future-proof" Phase 1 code. Build exactly what the current milestone requires, nothing ahead of it.
- The agent never papers over an unclear requirement with a quick, undocumented workaround. If the correct behavior is genuinely ambiguous, the agent picks the narrowest, most reversible interpretation, implements only that, and flags the ambiguity explicitly in its summary rather than silently deciding and moving on.
- When unsure between two valid technical approaches, the agent prefers the one that matches the Locked Choices in Question 2 and the existing folder layout in Question 4 over one that would introduce a new pattern, library, or architecture.
- The agent never writes speculative "just in case" code, unused abstractions, or extra configurability nobody asked for. If the honest answer is "I don't know what's wanted here," the agent stops and asks rather than producing spaghetti to cover every possible interpretation at once.
