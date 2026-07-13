# skills/db-migration-runner.md

```yaml
---
name: Database Migration Runner
description: |
  Trigger on any change to schema.prisma, or any task mentioning migration, 
  schema, or a new thing to store. Teaches the safe migration sequence that 
  protects the locked schema, the kobo money pattern, and the deletion cascade.
---

This skill teaches the ordered steps for applying Prisma schema changes safely 
in production, ensuring the `deletedAt` sole-writer rule and the unique usage 
constraints are never violated. Its laws live in `database-schema.md` and 
`AGENTS.md`.

## Procedure

1. **Validate the change against locked rules.** 
   Before writing the migration, confirm the change does not introduce a second 
   ORM or raw SQL layer. (database-schema.md §1)

2. **Review the `deletedAt` constraint.**
   If the migration touches `MediaFile.deletedAt`, ensure the new code never 
   writes to this column except inside the cleanup cron worker. 
   (database-schema.md §3, AGENTS.md Rule 11)

3. **Review the unique constraint on `UsageRecord`.**
   Ensure `@@unique([fingerprintHash, date])` remains intact. Removing this 
   breaks quota enforcement and the freemium revenue model. 
   (database-schema.md §2, PRD §21)

4. **Generate the migration file.**
   Run `npx prisma migrate dev --name <descriptive-name>`. 
   Never hand-edit the generated SQL. (database-schema.md §4)

5. **Apply to staging and test the rollback.**
   Run `npx prisma migrate deploy` on staging. Verify the migration applies 
   cleanly and that no data constraints are violated (e.g., duplicate 
   `fingerprintHash + date` rows).

6. **Apply to production with a backup.**
   Before `prisma migrate deploy` on production, confirm a recent DB backup 
   exists. Apply the migration during low traffic.

7. **Update the Prisma client and rebuild.**
   Run `npx prisma generate` and rebuild the Next.js/API applications.

## Code Skeleton (key patterns)

```typescript
// migrations/20260713000000_add_new_field/migration.sql
-- Always use `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` for new non-null columns
-- to avoid locking the table for too long.
ALTER TABLE "Job" ADD COLUMN "newField" TEXT DEFAULT 'default_value';
