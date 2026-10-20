import * as Sentry from '@sentry/node';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../../../lib/prisma.ts';
import { storageClient } from '../../../lib/storage.ts';

const OUTPUTS_BUCKET = process.env.TIGRIS_OUTPUTS_BUCKET || process.env.VECTEUS_OUTPUTS_BUCKET || 'vecteus-outputs';
const UPLOADS_BUCKET = process.env.TIGRIS_UPLOADS_BUCKET || process.env.VECTEUS_UPLOADS_BUCKET || 'vecteus-uploads';

/**
 * Sweep expired MediaFiles:
 * 1. Delete matching object from the object-storage bucket.
 * 2. Set deletedAt = new Date() in the Postgres DB.
 * Written exclusively by this worker path (no duplicate deletion paths).
 */
export async function cleanupExpiredFiles(): Promise<void> {
  const now = new Date();

  // Query files that have expired and are not yet marked deleted in bounded batches
  const expiredFiles = await prisma.mediaFile.findMany({
    where: {
      expiresAt: { lt: now },
      deletedAt: null,
    },
    take: 100,
  });

  console.log(`[Cleanup Cron] Found ${expiredFiles.length} expired files to clean up.`);

  for (const file of expiredFiles) {
    try {
      const bucket = file.role === 'source' || file.storageKey.startsWith('uploads/')
        ? UPLOADS_BUCKET
        : OUTPUTS_BUCKET;

      console.log(`[Cleanup Cron] Deleting object key: ${file.storageKey} from bucket: ${bucket}`);

      // Delete from object storage
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: file.storageKey,
      });
      await storageClient.send(command);

      // Write deletedAt in Postgres database
      await prisma.mediaFile.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      });

      console.log(`[Cleanup Cron] Successfully cleaned up file ID: ${file.id}`);
    } catch (error) {
      console.error(`[Cleanup Cron] Failed to clean up file ID: ${file.id}:`, error);
      Sentry.captureException(error);
      // Don't stop the loop if one file fails
    }
  }
}

// Set up periodic sweep
let cleanupLoop: ReturnType<typeof setInterval> | null = null;
if (process.env.RUN_CLEANUP_LOOP === 'true') {
  cleanupLoop = setInterval(async () => {
    try {
      await cleanupExpiredFiles();
    } catch (e) {
      console.error('[Cleanup Cron] Error in periodic cleanup sweep', e);
      Sentry.captureException(e);
    }
  }, 60 * 1000); // Check every minute
}

/** Stop the sweep during graceful shutdown so the loop is not left behind. */
export function stopCleanupLoop(): void {
  if (cleanupLoop) {
    clearInterval(cleanupLoop);
    cleanupLoop = null;
  }
}
