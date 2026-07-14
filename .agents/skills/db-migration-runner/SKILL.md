---
name: db-migration-runner
description: Use for any change to schema.prisma, any task mentioning "migration," "schema," a new field, a new model, or "a new thing to store." Covers Prisma migrations, the kobo money pattern in LedgerEntry/Payment, and the MediaFile deletion cascade.
---

# DB Migration Runner

Teaches the safe sequence for changing `schema.prisma` without breaking the
locked schema, the money-ledger pattern, or the single-writer deletion rule.
Laws live in `.agents/rules/database-schema.md`. This skill teaches the
procedure, not the laws.

## Procedure

1. **Read the current schema before touching it.** Open `prisma/schema.prisma`
   in full. Confirm which model you're changing and whether it's Phase 1
   (`Job`, `MediaFile`, `UsageRecord`, `PlatformLimit`, `OnboardingPreference`)
   or Phase 2 (`User`, `LedgerEntry`, `Payment`). Phase 2 models stay unwired
   unless the current task explicitly opens Phase 2 (`database-schema.md`).

2. **Check for the two protected patterns before editing.**
   - `MediaFile.deletedAt` — only `workers/cleanup-cron.ts` may write it,
     paired atomically with the R2 object delete (PRD §20, FR-10).
   - Any `Int` money field (`LedgerEntry.amount`, `LedgerEntry.oldBalance`,
     `LedgerEntry.newBalance`, `Payment.amount`) — these are **kobo**, not
     naira, and are never floats (PRD §21). If your change touches money,
     confirm the unit stays kobo and stays `Int`.
   If your change would add a second writer to `deletedAt`, or convert a
   money field to a float, stop — do not proceed, flag it instead.

3. **Write the schema change.** Add/edit the model or field directly in
   `schema.prisma`. Keep existing indexes and `@unique` constraints unless
   the task is specifically about changing them (`database-schema.md` lists
   which ones back real query patterns — don't drop one to "simplify").

4. **Generate the migration, don't hand-write SQL.**

```bash
   npx prisma migrate dev --name <short_description>
```

   Never create or edit a file under `prisma/migrations/` by hand.

1. **Classify the migration before reporting it done.**
   - Additive (new column/table, nullable or with a default) → safe.
   - Destructive (drop column/table, non-null without default on existing
     rows) → stop, flag it explicitly, and get human confirmation before
     applying to any environment with real data.

2. **If the change touches `LedgerEntry` or `Payment`,** verify the ledger
   pairing is intact: every balance mutation this schema change enables must
   have a corresponding `LedgerEntry` row with `oldBalance`/`newBalance` set
   — never a bare `User.balance` update path with no ledger row
   (`money-and-billing.md`).

3. **If the change touches `MediaFile` or the deletion path,** verify the
   cascade: deleting a `Job` should not orphan a `MediaFile` row without
   `deletedAt` eventually being set by the cron job, and should not leave an
   R2 object with no corresponding Postgres row (`uploads-and-storage.md`'s
   row-and-object pairing).

4. **Run `prisma generate`** so the Prisma Client types match the new schema
   before writing any code against it.

## Code skeleton

```prisma
// Adding a field — additive, safe
model Job {
  // ...existing fields...
  newField String? // nullable = safe migration, no backfill needed
}
```

```prisma
// Money field — always kobo, always Int, always ledger-paired
model LedgerEntry {
  id         String   @id @default(cuid())
  userId     String
  amount     Int      // kobo, positive = credit, negative = debit
  oldBalance Int
  newBalance Int
  type       String   // "CREDIT" | "DEBIT"
  reference  String?  // Flutterwave tx_ref — idempotency
  createdAt  DateTime @default(now())
}
```

```bash
# The only correct migration command
npx prisma migrate dev --name add_job_retry_count
npx prisma generate
```

## Traps

- Hand-editing a file in `prisma/migrations/` instead of generating it —
  drifts from what `migrate dev` would have produced and breaks `migrate deploy`.
- Adding a debug column that stores raw IP "just to check something" —
  breaks the hashed-only privacy design even temporarily.
- Storing a money amount as `Float` or in naira — breaks the kobo/Int
  pattern used everywhere else and causes rounding bugs in the ledger.
- Wiring a Phase 2 model (`User`, `LedgerEntry`, `Payment`) into live code
  because "the schema is already there" — the schema being present is not
  authorization to use it.
- Adding a second code path that writes `MediaFile.deletedAt` for
  convenience (e.g. a manual admin delete) — breaks the single-writer rule.

## Verify before done

- [ ] Migration was generated via `prisma migrate dev`, not hand-written.
- [ ] No new writer of `MediaFile.deletedAt` was introduced.
- [ ] Any money field added/changed is `Int`, kobo-denominated, ledger-paired.
- [ ] Phase 2 models remain unwired unless this task explicitly opened Phase 2.
- [ ] Destructive changes were flagged and confirmed, not silently applied.
- [ ] `prisma generate` was run and the app still type-checks (`tsc --noEmit`).
- **Tests to write:** a Prisma-level test (or seed script) confirming any new
  `@unique`/index constraint actually rejects a duplicate as expected; for
  ledger changes, a test asserting `newBalance - oldBalance === amount`.
