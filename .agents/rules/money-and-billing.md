---
trigger: glob
---

# Money, Billing & Quota — COMPr

## 1. Payment Provider

- **Flutterwave is the sole payment provider.** Any code referencing Stripe, Paystack, or other providers is rejected. (This overrides prior PRD assumptions).

## 2. Webhook Security

- **NEVER process a Flutterwave webhook without verifying its signature.**
- Verify the `x-verif-hash` header (or equivalent signature mechanism) against your secret key to confirm authenticity.
- Reject unsigned or invalid webhooks immediately with a `401 Unauthorized`.

## 3. Quota & Reciprocity (FR-11, §27)

- **The first job for any new fingerprint MUST always run to completion and show the full before/after comparison.**
- The code MUST check `isFirstJobExemptFromQuota()` **BEFORE** checking the daily `jobsUsedToday >= FREE_DAILY_LIMIT`.
- If the check is reversed (quota first, reciprocity second), the task has failed.

## 4. Target Size Validation (FR-2)

- **`targetSizeMB` is ONLY valid when `preset === "CUSTOM"`.**
- If `preset` is `STATUS` or `CHAT` and `targetSizeMB` is provided, the API MUST reject the request with a `400` error.
- Custom target size MUST be bounded between **1MB and 16MB**. Reject anything outside this range.

## 5. Premium Tier (Non-Unbounded)

- Premium plans must be capped at a configured high daily limit (initial: 100 jobs/day).
- **Never market or implement "truly unbounded"** at the code level. Enforce the numeric cap to prevent cost explosions.

## 6. Data for Upsell Copy (FR-12)

- Upsell copy for loss-aversion (`buildUpsellCopy`) MUST be built from real, specific data (actual jobs blocked today, actual price).
- **Never fabricate scarcity, urgency, or invented statistics.**
