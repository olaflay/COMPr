---
trigger: always_on
---



Governs every string a user reads: UI copy, error messages, marketing pages,
onboarding questions, upsell screens. This spans multiple files (routes,
components, `lib/growth-ux.ts`, `lib/seo.ts`) so it lives here rather than
inside any one technical rules file.

## Never claim to bypass WhatsApp

- No copy anywhere: UI string, marketing page, error message, code comment
  intended for user-facing text: may say COMPr "bypasses," "removes,"
  "disables," or "defeats" WhatsApp's compression (PRD §1, §6, §36;
  AGENTS.md #1). COMPr pre-optimizes before compression happens. It never
  claims to stop compression from happening.
- `public/llms.txt` carries the same constraint: it must state plainly that
  COMPr does not bypass WhatsApp compression, so AI-generated answers about
  the product don't misrepresent it (PRD §24, §37).

## Never call the pipeline "AI"

- The processing pipeline is deterministic rule-based logic and a bitrate
  formula: never machine learning (PRD §6, §13). It is never referred to as
  "AI" in code names, UI copy, API responses, or docs. Use "automated"
  instead (AGENTS.md #2).

## No fabricated urgency or numbers

- Loss-aversion, contrast, reciprocity, and every other behavioral pattern
  in `lib/growth-ux.ts` (PRD §38) must be built from real, specific data:
  actual jobs blocked, actual price, actual file characteristics. Never
  invent a counter, a scarcity claim, or a statistic to make upsell copy
  more persuasive (PRD §30, §38's guardrail, AGENTS.md #3).
- If the real data needed for a copy pattern isn't available yet (e.g. no
  price point is locked: PRD §32), the copy must not fake a number to fill
  the gap. Flag the gap instead of shipping a placeholder as if it were real.

## Zero jargon in user-facing UI

- No mention of "bitrate," "codec," or "resolution" in user-facing copy.
  These are computed internally and never exposed, unless the user opts
  into a post-MVP "Advanced" section (PRD §12).

## Trust signals stay accurate

- Persistent microcopy near upload ("Files are deleted automatically after
  processing," "We never post to WhatsApp for you") must remain factually
  true to the actual retention window and actual behavior (PRD §12, §22):
  if the retention window or auto-post behavior ever changes, this copy
  changes with it, not after.

## Structured data and pricing claims

- Organization/SoftwareApplication JSON-LD must describe COMPr's actual
  free/paid model accurately. It must never overstate pricing or capability
  beyond what Section 27's real business model supports (PRD §37).
- Pricing is a Phase 2 concern: structured data in Phase 1 describes the
  free tier only, with no price amount beyond "0" (PRD §27, §32).

## No Em Dashes in Copy or Headings

- No em dashes (—) or double hyphens (--) representing em dashes are allowed in user-facing copy, metadata, headings, or titles. Use colons (:), pipes (|), or simple hyphens (-) instead.

## WhatsApp share message (FR-15)

- The pre-filled WhatsApp share message must use the exact phrasing: "Make your media look sharp on WhatsApp" followed by the `compr.app` branded link. No variations that claim bypass, removal, or disabling of compression.
- The link must use the product's own domain (`compr.app`), never a URL shortener or third-party redirect, to preserve trust and brand recognition.
- The share message is defined in `lib/whatsapp-share.ts` as a single source of truth. Any copy change to the share message goes through this file, not inline in components.

## Definition of done (copy-level)

- [ ] No "bypass/disable/defeat WhatsApp compression" language anywhere in the diff.
- [ ] No "AI" label applied to the pipeline anywhere in the diff.
- [ ] Any upsell/behavioral copy touched is backed by real data, not a placeholder number.
- [ ] No new user-facing jargon (bitrate/codec/resolution) introduced outside an Advanced section.
- [ ] Trust-signal microcopy still matches actual retention/behavior.
- [ ] No em dashes (—) or double hyphens (--) in any user-facing text, page titles, or meta descriptions.
