---
trigger: always_on
---

# Database Schema — COMPr

## 1. ORM Policy

- **Prisma is the single source of truth** for database interactions.
- **NEVER** introduce a second ORM, raw SQL strings (except for Prisma `$queryRaw` if absolutely required for performance, but this requires justification), or direct `pg` clients alongside Prisma.
- All schema changes must be applied via `prisma migrate dev --name <name>` and tested via `prisma migrate deploy` in production.

## 2. Core Data Models (MVP)

Refer to PRD §21 for the full schema. Critical constraints:

- **`Job`**:
  - `status` enum: `QUEUED`, `ANALYZING`, `ENCODING`, `VERIFYING`, `DONE`, `FAILED`.
  - `preset` enum: `STATUS`, `CHAT`, `CUSTOM`.
  - `targetSizeMB` is `null` unless `preset = CUSTOM`.
  - Indexes required: `@@index([fingerprintHash, createdAt])`, `@@index([status])`.
- **`UsageRecord`**:
  - **Unique Constraint:** `@@unique([fingerprintHash, date])`. Breaking this allows duplicate counting and quota bypass.
- **`MediaFile`**:
  - `deletedAt` is nullable.
  - `role` is `"source"` or `"output"`.

## 3. The Golden Rule of Deletion (FR-10, PRD §20)

- **The cleanup cron job is the SOLE writer of `MediaFile.deletedAt`.**
- No API route, worker (except the cleanup worker), or manual migration script is ever permitted to write to the `deletedAt` column.
- When the cleanup cron runs, it must atomically:
  1. Delete the physical R2 object.
  2. Update `deletedAt` to `NOW()` in Postgres.
- R2's native lifecycle rule is explicitly a **backup safety net**, not the primary deletion path.

## 4. Migrations

- Never hand-edit a migration file.
- Schema changes must be backward-compatible where possible (add columns with defaults, avoid destructive renames in a single step).
- Always test migrations in a staging environment before production.
