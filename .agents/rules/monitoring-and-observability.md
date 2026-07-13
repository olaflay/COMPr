---
trigger: always_on
---

# Monitoring & Observability — COMPr

## 1. Tooling (Locked)

- **Sentry:** Used exclusively for error tracking and performance monitoring (both client and server).
- **PostHog:** Used exclusively for product analytics (user actions, funnels, feature usage).
- **NEVER** add a third analytics or error-tracking vendor (e.g., Datadog, Mixpanel, LogRocket) without explicit instruction.

## 2. Mandatory PostHog Events (PRD §28)

The following events MUST be captured, where applicable, to measure success metrics:

- `upload_started`, `upload_completed`, `upload_failed`
- `onboarding_answered`, `onboarding_skipped`
- `smart_default_preset_shown`, `smart_default_preset_overridden`
- `job_submitted`, `job_stage_changed`, `job_completed`, `job_failed`
- `download_clicked`, `before_after_comparison_viewed`
- `post_send_feedback_submitted` (props: thumbsUp/thumbsDown)
- `quota_exhausted_shown`, `upgrade_clicked`, `checkout_started`, `checkout_completed`
- `pwa_installed`

## 3. Privacy & Data Contract

- **NEVER** send file content, file names, raw IPs, or user-generated media to PostHog or Sentry.
- Analytics events may contain behavioral metadata (file size, duration, preset selected, stage duration, SSIM score) but **never** the media bytes themselves.

## 4. Error Severity & Alerting

- **Critical Errors** (Payment webhook failures, DB connection loss, R2 access failures) MUST be reported to Sentry with `level: "fatal"`.
- **Job Failures** (Transient or Permanent) MUST be reported to Sentry with job context (`jobId`, `preset`, `attempts`, `errorCode`) but no file content.
- Ensure error handling distinguishes **Transient** (retry) vs. **Permanent** (fail immediately) failures per PRD §19.

## 5. Performance Monitoring

- Use Sentry Performance to track p95 job completion times.
- The target p95 queue wait time (queued ➔ analyzing) must be < 30 seconds under normal load. Alert if this degrades.
