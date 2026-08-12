import * as Sentry from '@sentry/node';
import { Worker } from 'bullmq';
import { join } from 'node:path';
import { mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { prisma } from '../lib/prisma.ts';
import { redisConnection, mediaEncodeQueue } from '../lib/queue.ts';
import { probe } from '../lib/pipeline.ts';
import { downloadFromR2 } from '../server/services/storage.ts';
import { sniffFileType } from '../lib/sniff-file-type.ts';

import { cleanupStaleTempFiles } from '../lib/sre-cleanup.ts';
import { isPermanentFailure } from '../lib/error-classification.ts';

// Ensure local temp folder exists
const TEMP_DIR = join(process.cwd(), 'temp');
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}
cleanupStaleTempFiles(TEMP_DIR);

export const analysisWorker = new Worker(
  'media-analysis',
  async (bullJob) => {
    const { jobId } = bullJob.data as { jobId: string };

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { sourceFile: true },
    });

    if (!job || !job.sourceFile) {
      throw new Error(`Job ${jobId} or source file not found`);
    }

    // Update status to ANALYZING
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'ANALYZING' },
    });

    const localInputPath = join(TEMP_DIR, `source_${job.sourceFile.id}_${job.sourceFile.storageKey.split('/').pop()}`);

    try {
      // 1. Download file from R2 uploads bucket
      await downloadFromR2(job.sourceFile.storageKey, localInputPath);

      // 2. Perform magic-byte sniffing (authoritative server-side check)
      const detectedKind = sniffFileType(localInputPath);
      if (detectedKind === 'INVALID' || detectedKind !== job.mediaKind) {
        throw new Error(`Magic-byte validation failed: detected ${detectedKind}, expected ${job.mediaKind}`);
      }

      // 3. Run ffprobe
      const analysis = await probe(localInputPath);

      // 4. Update source file record
      await prisma.mediaFile.update({
        where: { id: job.sourceFile.id },
        data: {
          width: analysis.width,
          height: analysis.height,
          durationSec: analysis.durationSec,
        },
      });

      // 5. Update job to ENCODING and push to encode queue
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'ENCODING' },
      });

      await mediaEncodeQueue.add(jobId, { jobId });
    } catch (error: any) {
      console.error(`[Analysis Worker] Error processing job ${jobId}:`, error);
      Sentry.captureException(error);

      // Set source file retention to 1 hour grace period on failure
      if (job.sourceFile) {
        await prisma.mediaFile.update({
          where: { id: job.sourceFile.id },
          data: { expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
        }).catch(() => {});
      }

      // Set job status to FAILED
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Media analysis failed.',
        },
      });

      // Permanent failure classification: invalid headers, format, or decode errors
      const isPermanent = isPermanentFailure(error.message);

      if (isPermanent) {
        return { success: false, error: error.message }; // Complete cleanly without BullMQ retries
      }

      throw error; // Let BullMQ handle retry if transient (R2 connection, Postgres down)
    } finally {
      // Clean up temp file
      if (existsSync(localInputPath)) {
        try {
          unlinkSync(localInputPath);
        } catch (e) {
          console.error(`Failed to delete temp file ${localInputPath}`, e);
        }
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 4, // Tuned for lightweight probe concurrency
  }
);

console.log('👷 Analysis Worker started.');
