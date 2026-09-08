# NoBlur — Product Gaps & Micro-Spec (Resolved Record)

**Document Version:** 2.0 (compacted from v1.0)  
**Date:** 2026-09-05  
**Status:** ALL TASKS RESOLVED — this is the audit trail of the v1.0 gap analysis and its implementation. The v1.0 detail (gap descriptions, root-cause analysis, worked code snippets) was deliberately compacted away once every item shipped and verified.

---

## 1. Resolution Summary

Every gap in v1.0 was implemented across the dashboard client, comparison slider, status preview, install prompt, marketing client, telemetry wiring, Toast component, and install-prompt helper. All verification gates pass (Section 4).

| # | Task | Priority | Resolution (shipped) | Files |
|---|---|---|---|---|
| — | BUG-1 | P0 | `BeforeAfterSlider` now renders `<video>` elements for video outputs, seeks both to `0.5s`, stays paused/muted (`playsInline`, `preload="auto"`); `isVideo` passed from dashboard; `onViewed` fires once via IntersectionObserver → `before_after_comparison_viewed`. | `components/BeforeAfterSlider.tsx`, `app/dashboard/dashboard-client.tsx` |
| — | BUG-2 | P0 | Hardcoded `STATUS_MAX_DURATION_SEC = 30` removed; preview reads `platformLimits.STATUS.maxDurationSec` (90) from `config/platform-limits.json` (imported with `type: 'json'`). | `components/WhatsAppStatusPreview.tsx` |
| — | TEL-1 | P0 | All client events renamed to PRD §28 canonical names; see Section 2. | `app/dashboard/dashboard-client.tsx`, `components/BeforeAfterSlider.tsx` |
| — | UX-1 | P1 | `ingestFile()` probes dimensions/duration/audio and calls `suggestPreset()`; preset auto-set + "Auto-selected for your media" badge; `smart_default_preset_shown` on auto-select, `smart_default_preset_overridden` on manual override. | `app/dashboard/dashboard-client.tsx` |
| — | UX-2 | P1 | "Cancel and optimize another file" button under the progress bar; per-run `AbortController` (`jobFlowAbortRef`) aborts upload/polling; silent `resetToUpload()` (no error toast) on AbortError. | `app/dashboard/dashboard-client.tsx` |
| — | MED-1 | P1 | "Quality Mode" STANDARD/HD segmented toggle maps to `destination: WHATSAPP_NORMAL | WHATSAPP_HD` in job payload. | `app/dashboard/dashboard-client.tsx` |
| — | SPLIT-1 | P1 | Per-segment "Send Part N" (with `output_index`) + per-part download links; "Download all N parts (.zip)" built client-side with `jszip ^3.10.1` (0 byte API proxying). | `app/dashboard/dashboard-client.tsx`, `package.json` |
| — | ONB-1 | P2 | Non-blocking 2-question card inline in the upload card on first visit (`!localStorage['noblur_onboarding_done']`); 1-tap skip (`onboarding_skipped`); submits `POST /api/v1/onboarding` with `{ fingerprint, primary_use, priority }`, fires `onboarding_answered`. | `app/dashboard/dashboard-client.tsx` |
| — | NET-1 | P2 | `navigator.onLine` listeners + floating "Connection paused. Waiting for network to reconnect..." pill during active processing; polling skips fetch while offline and resumes automatically. | `app/dashboard/dashboard-client.tsx` |
| — | PWA-1 | P2 | `isIOSDevice(userAgent, standalone)` helper (tested); iOS bottom-sheet Share → "Add to Home Screen" walkthrough in install modal (never relies on `beforeinstallprompt` on iOS); `pwa_installed` wired via `onInstalled`. | `components/InstallPromptModal.tsx`, `lib/install-prompt.ts`, `app/providers.tsx` |
| Gap 7 | DELAYED-FEEDBACK | P1 | Immediate widget emits `post_send_feedback_submitted` `{ thumbsUp }`; "Send to WhatsApp" also stores `noblur_pending_feedback_job`; a 15-min–24h delayed toast asks "Did your media look sharp on WhatsApp?" with Yes/No (Toast extended with a second action). | `app/dashboard/dashboard-client.tsx`, `components/ui/Toast.tsx` |
| Gap 8 | P1 | Active preset chip uses `bg-secondary-container text-on-secondary-container`, `min-h-[44px]` touch target; primary "Optimize" stays the only saturated CTA. | `app/dashboard/dashboard-client.tsx` |
| Gap 11 | P2 | Audio indicator badge in the file-details chip: `Audio: AAC Stereo 96kbps` (audio detected) vs `Muted / Video-only (100% data budget for visual sharpness)` (silent). | `app/dashboard/dashboard-client.tsx` |
| Gap 9 | P2 | Marketing hero CTA preserves mode: `/dashboard?preset=STATUS|CHAT` from the Status/Chat/Product radio (dashboard already honors `?preset=`). | `app/(marketing)/marketing-client.tsx` |

---

## 2. Canonical Telemetry Alignment (TEL-1)

| PRD §28 Event | Status |
|---|---|
| `file_selected`, `upload_started` | ✓ (existing) |
| `smart_default_preset_shown` / `smart_default_preset_overridden` | ✓ added (file intake + override) |
| `job_submitted` | ✓ (was `job_created` — renamed; both dispatch paths incl. `prioritize_detail`) |
| `job_stage_changed` | ✓ added (fires on stage transitions during polling) |
| `job_completed` | ✓ fires only on `DONE` (sizeBefore/sizeAfter/vmafScore/resolution_dropped/destination) |
| `job_failed` | ✓ (was mis-emitted as `job_completed`; now `{ errorCode, classification, stage }`) |
| `before_after_comparison_viewed` | ✓ added (slider viewport trigger) |
| `post_send_feedback_submitted` | ✓ (was `feedback_given`; now `{ thumbsUp, job_id }`, incl. delayed prompt) |
| `share_to_whatsapp_clicked`, `download_clicked` | ✓ (extended with `output_index`, `kind: 'zip_all'`) |
| `pwa_installed` | ✓ wired (install modal `onInstalled`) |
| `onboarding_answered`, `onboarding_skipped` | ✓ (dashboard card) |

---

## 3. Notable Implementation Decisions

- Zip is generated fully client-side with `jszip` (lazy `import('jszip')`), honoring "the API server never proxies file bytes". New dependency: `jszip ^3.10.1`.
- Cancel (`UX-2`) aborts the active multipart upload via an `AbortController` per run; `AbortError` (DOMException `name === 'AbortError'`) is swallowed and the screen resets silently — no misleading failure toast.
- Polling interval (3s) is never torn down on network drop; only the fetch is skipped while offline, so reconnection resumes in-place.
- `JobState` client type gained optional `vmafScore` (server already returns it).
- iOS detection is a pure, unit-tested function `isIOSDevice(ua, standalone)`; `navigator.standalone` truthy ⇒ already installed ⇒ no prompt.
- Delayed feedback uses localStorage `noblur_pending_feedback_job` with a 15 min floor and 24 h cap; answer removes the key.

## 4. Verification Gates (all passed)

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` | 0 errors (2 pre-existing config-file warnings only) |
| Tests | `npm test` | 144/144 pass (incl. new `isIOSDevice` suite) |

No rule from AGENTS.md Question 3 was violated: no claim that NoBlur bypasses WhatsApp compression, no fabricated stats in copy, no hardcoded WhatsApp constants (only `platform-limits.json`), no account/login added, no second payment provider, no EM-dash characters in new UI copy, no out-of-scope Phase 2 features introduced.

## 5. Friction Log (post-implementation walkthrough)

- Onboarding card renders below the size-prediction block inside the upload card — visible but never blocking the dropzone above it. Confirmed skip = instant (no network).
- Delayed-feedback toast auto-dismisses after 15s; Yes/No buttons are full-height tap targets (44px+ via component padding).
- iOS walkthrough sheet and standard install sheet both reachable via the focus trap; `role="dialog"`, `aria-modal`, Escape, reduced-motion respected.
- Offline pill appears only while a job is active + offline; it is a self-centered pill inside the progress card, so it cannot be mistaken for a modal.
- Per-segment share buttons show `output_index` in telemetry; zip button disabled-free path, `noblur_status_parts.zip` naming.