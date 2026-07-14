---
trigger: always_on
---



Governs PostHog event instrumentation and the privacy boundary around it.
Complements `security.md` (transport/identity hashing) and
`uploads-and-storage.md` (file handling) — this file is specifically about
what goes into an analytics event payload.

## Canonical event list only

- Only the events named in PRD §28 are fired:
  `upload_started`, `upload_completed`, `upload_failed`,
  `onboarding_answered`, `onboarding_skipped`,
  `smart_default_preset_shown`, `smart_default_preset_overridden`,
  `job_submitted`, `job_stage_changed`, `job_completed`, `job_failed`,
  `download_clicked`, `before_after_comparison_viewed`,
  `post_send_feedback_submitted`, `quota_exhausted_shown`,
  `upgrade_clicked`, `checkout_started`, `checkout_completed`,
  `pwa_installed`.
- Adding a new event name requires it to be added to this list first — an
  agent doesn't invent a new tracked event mid-task without flagging it.

## What a payload may never contain

- No file content, thumbnail, or derived image/frame data in any event
  property (PRD §24, §28). Analytics events capture behavioral/technical
  metadata only.
- No raw IP address and no raw device fingerprint in any event payload —
  only the same salted hash used elsewhere, if identity linkage is needed
  at all (PRD §23, §27; AGENTS.md #13).
- No Flutterwave card data, `tx_ref` payload contents beyond the reference
  string itself, or other payment payload detail beyond what §28's
  `checkout_started`/`checkout_completed` events name.

## Property shape

- Properties match what PRD §28 specifies per event — e.g.
  `job_completed` carries `sizeBefore`, `sizeAfter`, `durationMs`,
  `ssimScore`; `job_failed` carries `errorCode` and
  `classification: transient/permanent`. Don't silently add extra
  properties "while I'm in here."

## Sentry vs. PostHog boundary

- Sentry gets error/job metadata for debugging, never file content
  (PRD §25). PostHog gets product-analytics events per the list above.
  Don't send analytics-shaped data to Sentry or error-shaped data (stack
  traces, internal error detail) to PostHog.

## Definition of done (analytics-level)

- [ ] Every new event fired matches a name in the PRD §28 canonical list.
- [ ] No file content, thumbnail, raw IP, or raw fingerprint in any payload.
- [ ] Event properties match the PRD-specified shape for that event.
- [ ] No payment payload detail beyond `checkout_started`/`checkout_completed`'s scope.
