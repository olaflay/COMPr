import { Worker } from 'bullmq';
import { join, extname } from 'node:path';
import { mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { prisma } from '../lib/prisma.ts';
import { redisConnection, mediaEncodeQueue } from '../lib/queue.ts';
import { runPipeline, runAdaptivePipeline, processImage, fileSizeMB } from '../lib/pipeline.ts';
import { splitVideo } from '../lib/split.ts';
import { cpus } from 'node:os';
import { downloadFromR2, uploadToR2 } from '../server/services/storage.ts';
import platformLimits from '../config/platform-limits.json' with { type: 'json' };

import { cleanupStaleTempFiles } from '../lib/sre-cleanup.ts';
import { isPermanentFailure } from '../lib/error-classification.ts';

const TEMP_DIR = join(process.cwd(), 'temp');
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}
cleanupStaleTempFiles(TEMP_DIR);

export const encodeWorker = new Worker(
  'media-encode',
  async (bullJob) => {
    const { jobId } = bullJob.data as { jobId: string };

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { sourceFile: true },
    });

    if (!job || !job.sourceFile) {
      throw new Error(`Job ${jobId} or source file not found`);
    }

    // Update job to ENCODING
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'ENCODING' },
    });

    const localInputPath = join(TEMP_DIR, `encode_in_${job.sourceFile.id}_${job.sourceFile.storageKey.split('/').pop()}`);
    const localOutputDir = join(TEMP_DIR, `encode_out_${jobId}`);
    if (!existsSync(localOutputDir)) {
      mkdirSync(localOutputDir, { recursive: true });
    }

    try {
      // 1. Download source from R2 uploads bucket
      await downloadFromR2(job.sourceFile.storageKey, localInputPath);

      // Determine parameters based on preset config (never hardcoded, per AGENTS.md)
      const targetSizeMB =
        job.preset === 'CUSTOM'
          ? job.targetSizeMB || 16
          : platformLimits[job.preset].maxSizeMB;

      const presetMaxHeight =
        job.preset === 'CUSTOM'
          ? 720
          : platformLimits[job.preset].maxResolution.height;

      // Adaptive queue-aware encoding: default to fast/cheap, only upgrade when idle.
      // On free tiers, CPU is the scarcest resource—prioritize throughput over perfection.
      let cpuPreset: 'slow' | 'medium' | 'fast' = 'fast';
      let passCount: 1 | 2 = 1;

      try {
        const waitingCount = await mediaEncodeQueue.getWaitingCount();
        // If queue is nearly empty, spend CPU on quality
        if (waitingCount <= 1) {
          cpuPreset = 'slow';
          passCount = 2;
        } else if (waitingCount <= 3) {
          cpuPreset = 'medium';
          passCount = 2;
        }
        // else: stay fast/1-pass (default)
      } catch (err) {
        console.warn('[Encode Worker] Failed to check queue depth, using fast/1-pass:', err);
      }

      let finalLocalPath = '';

      let outputWidth: number | undefined;
      let outputHeight: number | undefined;

      const runVideoPipeline = async (inputPath: string, outputDir: string) => {
        let adaptiveResult;
        try {
          adaptiveResult = await runAdaptivePipeline({
            inputPath,
            outputDir,
            targetSizeMB,
            prioritizeDetail: job.prioritizeDetail,
            destination: job.destination,
          });
        } catch (adaptiveErr) {
          console.warn('[Encode Worker] Adaptive pipeline failed, falling back to H.264:', adaptiveErr);
          // Fallback: use legacy H.264 pipeline
          const legacyResult = await runPipeline({
            inputPath,
            outputDir,
            targetSizeMB,
            presetMaxHeight,
            prioritizeDetail: job.prioritizeDetail,
            cpuPreset,
            passCount,
          });
          adaptiveResult = {
            source: legacyResult.source,
            attempts: legacyResult.attempts.map((a) => ({
              attempt: a.attempt,
              profileName: 'h264_legacy',
              codec: 'libx264',
              resolution: a.resolution,
              crf: 0,
              actualSizeMB: a.actualSizeMB,
              targetSizeMB: a.targetSizeMB,
              sizeWithinTolerance: a.sizeWithinTolerance,
              vmaf: null,
              qualityOk: a.qualityOk,
              reason: `SSIM=${a.avgSSIM}`,
            })),
            finalOutputPath: legacyResult.finalOutputPath,
            plan: {
              profileName: 'h264_legacy',
              codec: 'libx264',
              crf: 0,
              speedPreset: cpuPreset,
              videoBitrateMax: null,
              audioCodec: 'aac',
              audioBitrate: 96,
              pixelFormat: 'yuv420p',
              extraFlags: [],
              reason: 'legacy fallback',
            },
          };
        }
        return adaptiveResult;
      };

      // Check if splitting is needed (FR-6: Status duration ceiling check)
      const duration = job.sourceFile.durationSec || 0;
      const isStatusVideo = job.mediaKind === 'VIDEO' && job.preset === 'STATUS';
      const statusCeiling = platformLimits.STATUS.maxDurationSec;

      const isSplitRequired = isStatusVideo && statusCeiling && duration > statusCeiling;

      const outputsToCreate: Array<{
        storageKey: string;
        sizeBytes: number;
        width?: number;
        height?: number;
        segmentIndex: number | null;
      }> = [];

      let firstPlan: any = null;
      let firstVmaf: number | null = null;

      if (job.mediaKind === 'VIDEO') {
        if (isSplitRequired) {
          // Split the video into segments
          const segments = await splitVideo(localInputPath, statusCeiling, localOutputDir);
          console.log(`[Encode Worker] Splitting Status video of ${duration}s into ${segments.length} segments.`);

          for (let idx = 0; idx < segments.length; idx++) {
            const segmentInput = segments[idx];
            const segmentOutputDir = join(localOutputDir, `part_${idx}`);
            mkdirSync(segmentOutputDir, { recursive: true });

            const result = await runVideoPipeline(segmentInput, segmentOutputDir);
            
            const finalAttempt = result.attempts[result.attempts.length - 1];
            let w: number | undefined;
            let h: number | undefined;
            if (finalAttempt && finalAttempt.resolution) {
              const [resW, resH] = finalAttempt.resolution.split('x').map(Number);
              w = resW;
              h = resH;
            }

            const sizeBytes = Math.round(fileSizeMB(result.finalOutputPath) * 1024 * 1024);
            const outputFilename = `output_${jobId}_part${idx}${extname(result.finalOutputPath)}`;
            const outputKey = `outputs/${outputFilename}`;

            // Upload the segment to R2
            await uploadToR2(outputKey, result.finalOutputPath);

            outputsToCreate.push({
              storageKey: outputKey,
              sizeBytes,
              width: w,
              height: h,
              segmentIndex: idx,
            });

            if (idx === 0) {
              firstPlan = result.plan;
              firstVmaf = finalAttempt?.vmaf?.avgVmaf ?? null;
            }
          }
        } else {
          // Run standard single-file video pipeline
          const result = await runVideoPipeline(localInputPath, localOutputDir);
          finalLocalPath = result.finalOutputPath;

          const finalAttempt = result.attempts[result.attempts.length - 1];
          if (finalAttempt && finalAttempt.resolution) {
            const [w, h] = finalAttempt.resolution.split('x').map(Number);
            outputWidth = w;
            outputHeight = h;
          }

          const sizeBytes = Math.round(fileSizeMB(finalLocalPath) * 1024 * 1024);
          const outputFilename = `output_${jobId}${extname(finalLocalPath)}`;
          const outputKey = `outputs/${outputFilename}`;

          await uploadToR2(outputKey, finalLocalPath);

          outputsToCreate.push({
            storageKey: outputKey,
            sizeBytes,
            width: outputWidth,
            height: outputHeight,
            segmentIndex: null,
          });

          firstPlan = result.plan;
          firstVmaf = finalAttempt?.vmaf?.avgVmaf ?? null;
        }

        // Store adaptive analysis metadata on the job
        if (firstPlan) {
          await prisma.job.update({
            where: { id: jobId },
            data: {
              analysisResult: JSON.stringify({
                profile: firstPlan.profileName,
                codec: firstPlan.codec,
                crf: firstPlan.crf,
                attempts: isSplitRequired ? undefined : undefined,
                reason: isSplitRequired ? 'Split status segments' : undefined,
              }),
              vmafScore: firstVmaf,
            },
          });
        }
      } else {
        // Run image pipeline via processImage (FR-15, PRD §15, §24)
        finalLocalPath = join(localOutputDir, `output_image.jpg`);
        const maxLongEdge = job.preset === 'STATUS' ? 1080 : 1600;

        const imgResult = await processImage({
          inputPath: localInputPath,
          outputPath: finalLocalPath,
          maxLongEdgePx: maxLongEdge,
        });

        outputWidth = imgResult.width;
        outputHeight = imgResult.height;

        const sizeBytes = Math.round(fileSizeMB(finalLocalPath) * 1024 * 1024);
        const outputFilename = `output_${jobId}${extname(finalLocalPath)}`;
        const outputKey = `outputs/${outputFilename}`;

        await uploadToR2(outputKey, finalLocalPath);

        outputsToCreate.push({
          storageKey: outputKey,
          sizeBytes,
          width: outputWidth,
          height: outputHeight,
          segmentIndex: null,
        });
      }

      // Update to VERIFYING (just for progress display consistency)
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'VERIFYING' },
      });

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour retention

      // Create output MediaFile records in DB
      for (const out of outputsToCreate) {
        await prisma.mediaFile.create({
          data: {
            storageKey: out.storageKey,
            mimeType: job.mediaKind === 'IMAGE' ? 'image/jpeg' : 'video/mp4',
            sizeBytes: out.sizeBytes,
            role: 'output',
            expiresAt,
            jobOutputId: jobId,
            width: out.width,
            height: out.height,
            segmentIndex: out.segmentIndex,
          },
        });
      }

      // 3. Mark job as DONE
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'DONE',
          completedAt: new Date(),
        },
      });

      // 4. Source file should be deleted immediately after job completion
      // per retention policy (PRD §22: deleted immediately after successful job).
      // We will set its expiresAt to past so the cleanup cron sweeps it immediately,
      // or delete it directly from the cron or scheduled sweep.
      await prisma.mediaFile.update({
        where: { id: job.sourceFile.id },
        data: { expiresAt: new Date(Date.now() - 1000) }, // past date
      });

    } catch (error: any) {
      console.error(`[Encode Worker] Error processing job ${jobId}:`, error);

      // Set source file retention to 1 hour grace period on failure
      if (job.sourceFile) {
        await prisma.mediaFile.update({
          where: { id: job.sourceFile.id },
          data: { expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
        }).catch(() => {});
      }

      try {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage: error.message || 'Media encoding failed.',
          },
        });
      } catch (dbErr) {
        console.error(`[Encode Worker] Failed to update job status to FAILED:`, dbErr);
      }

      const isPermanent = isPermanentFailure(error.message);
      if (isPermanent) {
        return { success: false, error: error.message }; // Fail immediately, no BullMQ retry
      }

      throw error;
    } finally {
      // Clean up temp files
      if (existsSync(localInputPath)) {
        try {
          unlinkSync(localInputPath);
        } catch (e) {}
      }
      // Recursive delete temp directory
      const { rmSync } = await import('node:fs');
      if (existsSync(localOutputDir)) {
        try {
          rmSync(localOutputDir, { recursive: true, force: true });
        } catch (e) {}
      }
    }
  },
  {
    connection: redisConnection,
    // Scale concurrency with available CPU to maximize throughput on free/cheap tiers.
    // Single-pass encodes are light; multiple concurrent jobs beat one heavy 2-pass encode.
    concurrency: Math.max(1, Math.floor((cpus().length || 1) / 2)),
    lockDuration: 60000,
  }
);

console.log('👷 Encode Worker started.');
