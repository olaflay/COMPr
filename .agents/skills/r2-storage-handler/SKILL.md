---
name: r2-storage-handler
description: Use for anything where files move or are deleted — presigned upload/download URLs, storage keys, or removing a Job/MediaFile and its R2 object. Covers ownership-encoded keys, row-and-object pairing, immutable source files, and the full deletion-parity procedure.
---

# R2 Storage Handler

Teaches how to name, pair, and delete R2 objects so storage and Postgres
never drift apart. Laws live in `uploads-and-storage.md` and
`database-schema.md`, sourced from PRD §17, §20, §22.

## Procedure

1. **Never let the API server touch file bytes.** Every read or write of a
   file goes through a presigned URL, client↔R2 directly. If a task seems
   to need the API to proxy bytes, stop — the design is presigned-only, not
   the approach (`uploads-and-storage.md`, PRD §17).

2. **Encode ownership into the storage key, not just the filename.** A key
   should let you trace an object back to its `Job`/`MediaFile` row without
   a database lookup being the only link — use the bucket prefix
   (`uploads/` vs `outputs/`) plus the `MediaFile.id`/`Job.id` in the key
   path, never a raw user-supplied filename alone (PRD §22).

3. **Every object gets exactly one paired row.** A `MediaFile` row is
   created before or atomically with requesting the presigned upload URL,
   and `MediaFile.storageKey` is the only place that key is recorded. Never
   create an R2 object with no corresponding row, and never create a row
   pointing at a key that was never actually written.

4. **Source files are immutable once uploaded.** Nothing in the pipeline
   overwrites the original upload — encoding always produces a new object
   in `outputs/` with its own `MediaFile` row (`role: "output"`). This keeps
   the source available for retry logic (quality-triggered retry re-reads
   the original, it doesn't re-derive from a partially processed file).

5. **Set expiry correctly at creation time, not as an afterthought.** Upload
   presigned URLs: 60-minute expiry. Download presigned URLs: 24-hour expiry,
   matching output retention (`uploads-and-storage.md`, PRD §13, §22, §23).
   `MediaFile.expiresAt` is set when the row is created, driving the cleanup
   cron's query.

6. **Deletion is one procedure, always in this order:** delete the R2
   object → write `MediaFile.deletedAt` in Postgres → both inside the same
   cleanup-cron operation, never as two independently-triggered steps
   (`database-schema.md`, PRD §20, FR-10). This is the only code path
   allowed to do either half of this.

7. **Confirm parity, don't assume it.** After a deletion run, a row with
   `deletedAt` set should have no live R2 object, and a live R2 object
   should always have a row with `deletedAt` still null. If a task involves
   debugging storage, checking this parity is the first diagnostic step.

8. **Retention timing follows the source/output split:** source deleted
   immediately after successful job completion, or after timeout/failure +
   1 hour grace; output deleted after 24 hours (`uploads-and-storage.md`, PRD §22).

## Code skeleton

```typescript
// lib/storage.ts
function buildStorageKey(role: 'uploads' | 'outputs', mediaFileId: string, ext: string): string {
  // Ownership-encoded: traceable back to the row without a DB lookup
  return `${role}/${mediaFileId}${ext}`;
}

async function createPresignedUpload(input: { filename: string; mimeType: string }) {
  // 3. Row created before/with the URL request — no orphan objects
  const mediaFile = await prisma.mediaFile.create({
    data: {
      storageKey: '', // set below once key is built
      mimeType: input.mimeType,
      sizeBytes: 0,
      role: 'source',
      expiresAt: addHours(new Date(), 1), // initial default; recalculated on job success to immediate, or kept as +1hr on failure/timeout for debugging
    },
  });
  const key = buildStorageKey('uploads', mediaFile.id, extname(input.filename));
  await prisma.mediaFile.update({ where: { id: mediaFile.id }, data: { storageKey: key } });

  const uploadUrl = await r2.getPresignedPutUrl(key, { expiresIn: '60m' }); // 5. exact expiry
  return { uploadUrl, fileKey: key, expiresAt: addMinutes(new Date(), 60) };
}
```

```typescript
// workers/cleanup-cron.ts — the ONLY deletion path
async function cleanupExpiredFiles() {
  const expired = await prisma.mediaFile.findMany({
    where: { expiresAt: { lt: new Date() }, deletedAt: null },
  });
  for (const file of expired) {
    await r2.deleteObject(file.storageKey);          // 6a. object first
    await prisma.mediaFile.update({                   // 6b. row second, same operation
      where: { id: file.id },
      data: { deletedAt: new Date() },
    });
  }
}
```

## Traps

- Naming a key from the raw uploaded filename — no traceability back to the
  owning row, and a collision risk between users.
- Creating the R2 object before the `MediaFile` row exists — a crash between
  the two leaves an orphaned, untracked object.
- Overwriting the source file in place during retry logic instead of always
  producing a new output object — breaks the "source is immutable" guarantee
  the quality-retry path depends on.
- Writing `deletedAt` from anywhere other than `cleanup-cron.ts` — e.g. a
  quick manual delete script "just this once."
- Deleting the R2 object without writing `deletedAt` in the same operation
  (or vice versa) — creates exactly the dual-source-of-truth drift
  `database-schema.md` exists to prevent.

## Verify before done

- [ ] No API route reads or writes file bytes directly — presigned URLs only.
- [ ] Every new storage key is traceable to a `MediaFile`/`Job` id, not a raw filename.
- [ ] No R2 object is created without a paired row, or vice versa.
- [ ] Source files are never overwritten in place by any retry path.
- [ ] Only `cleanup-cron.ts` deletes an R2 object or writes `deletedAt`.
- [ ] Upload/download presigned URL expiries match 60min/24hr exactly.
- **Tests to write:** a test asserting a created `MediaFile` row always has a non-empty `storageKey` before any upload URL is returned, and a cleanup-cron test asserting that after a run, every row with `deletedAt` set has a confirmed-absent R2 object (mocked storage check).
