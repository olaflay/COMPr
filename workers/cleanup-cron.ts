import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma.ts';
import { r2Client } from '../server/services/storage.ts';

const OUTPUTS_BUCKET = process.env.R2_OUTPUTS_BUCKET || 'compr-outputs';
const UPLOADS_BUCKET = process.env.R2_UPLOADS_BUCKET || 'compr-uploads';

/**
 * Sweep expired MediaFiles:
 * 1. Delete matching object from Cloudflare R2 bucket.
 * 2. Set deletedAt = new Date() in the Postgres DB.
 * Written exclusively by this worker path (no duplicate deletion paths).
 */
export async function cleanupExpiredFiles(): Promise<void> {
  const now = new Date();

  // Query files that have expired and are not yet marked deleted
  const expiredFiles = await prisma.mediaFile.findMany({
    where: {
      expiresAt: { lt: now },
      deletedAt: null,
    },
  });

  console.log(`[Cleanup Cron] Found ${expiredFiles.length} expired files to clean up.`);

  for (const file of expiredFiles) {
    try {
      const bucket = file.role === 'source' || file.storageKey.startsWith('uploads/')
        ? UPLOADS_BUCKET
        : OUTPUTS_BUCKET;

      console.log(`[Cleanup Cron] Deleting R2 object key: ${file.storageKey} from bucket: ${bucket}`);

      // Delete from Cloudflare R2
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: file.storageKey,
      });
      await r2Client.send(command);

      // Write deletedAt in Postgres database
      await prisma.mediaFile.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      });

      console.log(`[Cleanup Cron] Successfully cleaned up file ID: ${file.id}`);
    } catch (error) {
      console.error(`[Cleanup Cron] Failed to clean up file ID: ${file.id}:`, error);
      // Don't stop the loop if one file fails
    }
  }
}

// Set up periodic sweep
if (process.env.RUN_CLEANUP_LOOP === 'true') {
  setInterval(async () => {
    try {
      await cleanupExpiredFiles();
    } catch (e) {
      console.error('[Cleanup Cron] Error in periodic cleanup sweep', e);
    }
  }, 60 * 1000); // Check every minute
}
