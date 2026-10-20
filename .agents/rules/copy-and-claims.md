---
trigger: always_on
---

Governs all text and copy across the Vecteus platform: API descriptions, error envelopes, documentation, and webhook payloads.

## No Em Dashes in Copy or Headings

- No em dashes or double hyphens representing em dashes are allowed in user-facing copy, metadata, headings, documentation, code comments, or error messages. Use colons (:), pipes (|), or simple hyphens (-) instead.

## Accurate Infrastructure Claims

- Never market the engine as an "AI video tool." The compression pipeline is deterministic mathematics: perceptual VMAF optimization, SVT-AV1 rate control, and closed-loop validation. Use "automated" or "perceptual" instead.
- Real metrics only: Never invent fake percentage savings or benchmarks. Savings numbers quoted to tenants (65% to 80%) must be backed by empirical test assets.

## Plain-Language Error Envelopes

- Error responses return `{ error: { code, message } }`.
- Error codes must use standard uppercase snake_case (`INVALID_API_KEY`, `FILE_CORRUPTED`, `VMAF_THRESHOLD_UNMET`).
- Avoid internal jargon or stack traces leaking to clients.

## Definition of Done (Copy Level)

- [ ] Zero em dashes and zero double hyphens across the entire diff.
- [ ] No "AI" labeling applied to deterministic media algorithms.
- [ ] Error messages conform to standard machine-readable codes.
