---
trigger: always_on
---

# .agents/rules/uploads-and-storage.md — NoBlur

Governs bytes in transit and bytes at rest — R2 buckets, presigned URLs,
upload behavior, retention. (File-*type validation* rules live in security.md;
the *database record* for a file lives in database-schema.md.)

## Buckets and access

- Separate buckets/prefixes for `uploads/` (source) and `outputs/`
  (processed) so retention rules can differ (PRD §22).
- All access is via presigned URL, both directions. The API server never
  proxies raw file bytes under any circumstance — if a feature seems to
  require it, the approach is wrong, not the rule.
- No CDN caching of user content beyond the active download window — this
  would extend retention beyond the stated policy even if the DB record says
  "deleted" (PRD §22).

## Upload behavior

- Upload is resumable/chunked (tus protocol or multipart with resume
  support) — this is a **Phase 1 requirement**, not best-effort, because the
  primary launch market has variable 3G/4G connectivity (PRD §10). Don't
  ship a naive single-shot upload and call resumability "Phase 2."
- Max upload size: 50MB free tier, 500MB premium (PRD §10). Enforced
  client-side (fast fail) and server-side (authoritative).
- Upload presigned URL expiry: 60 minutes, chosen specifically to
  accommodate slow-network users (PRD §13, §23) — don't shorten this for
  "cleanliness."

## Retention

- Source files: deleted immediately after successful job completion, or
  after job timeout/failure + 1 hour grace period for debugging (PRD §22).
- Output files: retained 24 hours, then deleted.
- Deletion happens through exactly one path — the cleanup cron job — per
  `database-schema.md`. This file governs the storage-side half of that
  same rule: the R2 object delete and the Postgres `deletedAt` write happen
  in the same operation, not two separately-triggered steps.

## Content handling

- EXIF/GPS metadata is stripped from output images by default (-map_metadata -1); FFmpeg auto-rotation ensures visual orientation is preserved (PRD §15, §24, AGENTS.md #15).
- Uploaded content is used only to produce the requested job's output —
  never for training, analytics payloads, or shared with any third party
  (PRD §24, AGENTS.md #12).

## Definition of done (storage-level)

- [ ] No code path has the API server reading/writing file bytes directly.
- [ ] Upload path supports resume, not just single-shot PUT.
- [ ] Retention windows match PRD §22 exactly (1hr grace / 24hr output).
- [ ] EXIF/GPS stripped from any new image output path (orientation excepted).
