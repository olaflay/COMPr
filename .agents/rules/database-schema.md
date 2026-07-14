---
trigger: always_on
---

Prisma is the only ORM (AGENTS.md Q2) and `prisma/schema.prisma` is the only
schema surface. This file governs how the schema and migrations may change.

## Deletion — single writer, no exceptions

- `MediaFile.deletedAt` is written by exactly one code path: the cleanup cron
  job (`workers/cleanup-cron.ts`), atomically with the R2 object delete
  (PRD §20, §22, FR-10). No route, no worker, no manual script writes this
  field. If a task seems to need a second writer, stop and flag it — do not add one.
- R2's own lifecycle rule is a backup safety net only. It must never be
  treated or documented as the primary deletion mechanism.

## Privacy fields

- `Job.fingerprintHash` and `Job.ipHash` (and `UsageRecord`'s equivalents)
  store salted, one-way hashes only. Never add a raw IP or raw fingerprint
  column "for debugging" — that defeats the privacy design in PRD §23/§27.
- No field on any model may store uploaded file *content* or a content
  fingerprint beyond what's needed for job processing (PRD §24).

## Phase boundaries in the schema

- `User`, `LedgerEntry`, `Payment` exist in the schema for forward
  compatibility (PRD §21) but are Phase 2. No code path may read or write
  these models until Phase 2 is explicitly started — their presence in
  `schema.prisma` is not authorization to wire them up.
- `PlatformLimit` is the only legitimate home for WhatsApp constants
  (duration/resolution/size ceilings). Never duplicate these values as a
  hardcoded default elsewhere "just in case the table is empty."

## Migrations

- Schema changes go through `prisma migrate dev` locally, committed as a
  migration file — never a hand-edited SQL file dropped into `/migrations`.
- A migration that touches `Job`, `MediaFile`, `UsageRecord`, or any
  Phase-2-money model must be called out explicitly in the task summary,
  including whether it's additive (safe) or could cause data loss on deploy.
- Never run a destructive migration (drop column/table) against a schema
  holding user data without explicit human confirmation in the same task.

## Indexes and constraints

- `Job` keeps its `[fingerprintHash, createdAt]` and `[status]` indexes;
  `MediaFile` keeps `[expiresAt]`; `UsageRecord` keeps the
  `[fingerprintHash, date]` unique constraint that enforces one quota row
  per fingerprint per day. Don't remove an index to "simplify" a query —
  these back real query patterns (usage checks, cleanup sweeps).
- `Payment.reference` (Flutterwave `tx_ref`) stays `@unique` — it's the
  idempotency key for webhook processing, not a display field.

## Definition of done (schema-level)

- [ ] No new writer of `MediaFile.deletedAt` was introduced.
- [ ] No raw IP or raw fingerprint field was added.
- [ ] Phase 2 models remain unwired unless Phase 2 was explicitly requested.
- [ ] Migration generated via `prisma migrate dev`, not hand-written SQL.
- [ ] Any destructive migration was flagged and confirmed, not silently applied.
