
# skills/r2-storage-handler.md

```yaml
---
name: R2 Storage Handler
description: |
  Trigger on anything where files move or die: uploads, signed URLs, storage 
  keys, or deleting a book or account. Teaches ownership-encoded keys, 
  row-and-object pairing, immutable originals, and the full deletion parity 
  procedure.
---

This skill defines the procedures for generating presigned URLs, handling 
direct‑to‑R2 uploads, and ensuring deletion parity between storage and the 
database. Its laws live in `uploads-and-storage.md` and `security.md`.

## Procedure

1. **Generate an ownership‑encoded storage key.**
   The key must be structured as: `uploads/{fingerprintHash}/{uuid}.{ext}`. 
   This ensures that objects are scoped to the user/fingerprint. 
   (uploads-and-storage.md §3)

2. **Generate a presigned upload URL.**
   Use the AWS S3 SDK (compatible with R2) to create a `putObject` presigned 
   URL with a 60‑minute expiry. (uploads-and-storage.md §2)

3. **Return the URL and key to the client.**
   The client uploads directly to R2. The API never proxies the bytes.

4. **On job completion, mark source for deletion.**
   The cleanup cron is the sole writer of `deletedAt`. The job completion 
   handler only sets `MediaFile.expiresAt` to `NOW() + 1 hour` for sources 
   and `NOW() + 24 hours` for outputs. (uploads-and-storage.md §3)

5. **Run the cleanup cron.**
   The cron fetches all `MediaFile` records where `expiresAt < NOW()` and 
   `deletedAt IS NULL`. For each:
   - Delete the R2 object using `s3.deleteObject`.
   - Update `deletedAt = NOW()` in the database.
   - If the R2 deletion fails, do NOT update `deletedAt`; retry later.

6. **Handle full deletion parity.**
   When a job or account is purged, ensure that every associated `MediaFile` 
   follows the same procedure: source and output objects are both deleted, 
   and both `deletedAt` timestamps are set.

## Code Skeleton (key patterns)

```typescript
// server/services/storage.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT });

export async function generateUploadUrl(key: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_UPLOAD_BUCKET,
    Key: key,
    Expires: 3600, // 60 minutes
  });
  return await getSignedUrl(r2, command, { expiresIn: 3600 });
}

// Cleanup cron function.
export async function cleanupExpiredFiles() {
  const expired = await prisma.mediaFile.findMany({
    where: { expiresAt: { lt: new Date() }, deletedAt: null }
  });

  for (const file of expired) {
    try {
      await r2.send(new DeleteObjectCommand({
        Bucket: file.role === 'source' ? process.env.R2_UPLOAD_BUCKET : process.env.R2_OUTPUT_BUCKET,
        Key: file.storageKey,
      }));
      await prisma.mediaFile.update({
        where: { id: file.id },
        data: { deletedAt: new Date() }
      });
    } catch (err) {
      // Log error and retry on next cron run.
    }
  }
}
