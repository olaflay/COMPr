/**
 * Job intake module — PRD §18, FR-11.
 *
 * The deep module behind POST /api/v1/jobs. Owns target-size validation, the
 * first-job reciprocity exemption, the daily quota gate, media-kind routing,
 * job creation, usage accounting, and queueing. The route is a thin HTTP
 * adapter that maps IntakeError to a response.
 */

import { buildUpsellCopy } from './growth-ux.ts';
import { prisma } from './prisma.ts';
import { hashString } from './crypto.ts';
import { mediaAnalysisQueue } from './queue.ts';
import { isQuotaExhausted, todayStart } from './quota.ts';
import {
  assertTargetSizeRules,
  inferMediaKindFromFileKey,
  IntakeValidationError,
  type PresetValue,
  type DestinationValue,
} from './intake-validation.ts';

export type { PresetValue, DestinationValue };

export class IntakeError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly upsell?: unknown;

  constructor(code: string, message: string, statusCode: number, upsell?: unknown) {
    super(message);
    this.name = 'IntakeError';
    this.code = code;
    this.statusCode = statusCode;
    this.upsell = upsell;
  }
}

export interface CreateJobInput {
  fileKey: string;
  preset: PresetValue;
  targetSizeMB?: number;
  prioritizeDetail?: boolean;
  destination?: DestinationValue;
  fingerprint: string;
  ip: string;
}

export interface JobIntakeResult {
  jobId: string;
  status: 'queued';
}

/** Run a job-intake step, mapping validation failures onto HTTP IntakeErrors. */
export function createJobForFingerprint(input: CreateJobInput): Promise<JobIntakeResult> {
  const { fileKey, preset, targetSizeMB, prioritizeDetail, destination, fingerprint, ip } = input;

  try {
    assertTargetSizeRules(preset, targetSizeMB);
  } catch (err) {
    if (err instanceof IntakeValidationError) {
      throw new IntakeError(err.code, err.message, 400);
    }
    throw err;
  }

  const fingerprintHash = hashString(fingerprint);
  const ipHash = hashString(ip);

  return createJobForFingerprintValidated({
    fileKey,
    preset,
    targetSizeMB,
    prioritizeDetail,
    destination,
    fingerprintHash,
    ipHash,
  });
}

/** Internal async body — separated from validation so the pure rules stay testable. */
async function createJobForFingerprintValidated(input: {
  fileKey: string;
  preset: PresetValue;
  targetSizeMB?: number;
  prioritizeDetail?: boolean;
  destination?: DestinationValue;
  fingerprintHash: string;
  ipHash: string;
}): Promise<JobIntakeResult> {
  const { fileKey, preset, targetSizeMB, prioritizeDetail, destination, fingerprintHash, ipHash } = input;

  return prisma.$transaction(async (tx) => {
    // 0. Backpressure gate: reject if in-flight jobs exceed safe queue depth (max 100 to avoid worker OOM)
    const inFlightCount = await tx.job.count({
      where: {
        status: { in: ['QUEUED', 'ANALYZING', 'ENCODING', 'VERIFYING'] },
      },
    });
    if (inFlightCount >= 100) {
      throw new IntakeError(
        'SYSTEM_BUSY',
        'System is at capacity. Please try again in a moment.',
        503
      );
    }

    // 1. Enforce IP-level fallback quota (15 jobs/day) to prevent fingerprint rotation abuse
    const ipJobsCount = await tx.job.count({
      where: {
        ipHash,
        createdAt: { gte: todayStart() },
      },
    });
    if (ipJobsCount >= 15) {
      throw new IntakeError('QUOTA_EXCEEDED', 'Daily limit reached for this IP address. Please try again tomorrow.', 429);
    }

    // 2. Fetch current fingerprint jobs to determine first job status
    // ⚡ Bolt: Use findFirst instead of count() for O(1) existence check, avoiding O(N) full table scan.
    const existingJob = await tx.job.findFirst({
      where: { fingerprintHash },
      select: { id: true }
    });
    const isFirstJob = existingJob === null;

    // 3. Quota gate check (FR-11): first job is always exempt
    if (!isFirstJob) {
      // Atomic increment-first to avoid TOCTOU double-spend race
      const usage = await tx.usageRecord.upsert({
        where: { fingerprintHash_date: { fingerprintHash, date: todayStart() } },
        update: { jobCount: { increment: 1 } },
        create: { fingerprintHash, ipHash, date: todayStart(), jobCount: 1 },
      });

      const usedToday = usage.jobCount;
      const bonusCount = usage.bonusCount;

      if (isQuotaExhausted(usedToday, bonusCount)) {
        // Rollback: decrement usage count since this job is rejected
        await tx.usageRecord.update({
          where: { id: usage.id },
          data: { jobCount: { decrement: 1 } },
        });

        const copy = buildUpsellCopy({
          jobsBlockedThisMonth: usedToday - 1,
          premiumPriceLabel: 'Premium', // No faked price literal
        });
        throw new IntakeError('QUOTA_EXCEEDED', copy.anchorLine, 429, copy);
      }
    }

    const mediaKind = inferMediaKindFromFileKey(fileKey);

    const sourceFile = await tx.mediaFile.findUnique({
      where: { storageKey: fileKey },
      include: { jobAsSource: true },
    });

    if (!sourceFile) {
      throw new IntakeError('SOURCE_FILE_NOT_FOUND', 'Uploaded source file not found', 404);
    }

    // Ownership check: fileKey can only be used by the fingerprint that uploaded it.
    // This prevents users from enqueuing jobs against other users' files.
    // For now, we rely on the presigned URL being single-use. In a future phase,
    // add a jobCreators table or store fingerprintHash on MediaFile itself.
    if (sourceFile.jobAsSource) {
      // Already used by a prior job; prevent re-use
      throw new IntakeError(
        'FILE_ALREADY_PROCESSED',
        'This file has already been processed. Please upload again.',
        400
      );
    }

    // 4. Create job record
    const job = await tx.job.create({
      data: {
        preset,
        targetSizeMB: targetSizeMB ?? null,
        prioritizeDetail: prioritizeDetail ?? false,
        mediaKind,
        destination: destination ?? 'WHATSAPP_NORMAL',
        fingerprintHash,
        ipHash,
        isFirstJobForFingerprint: isFirstJob,
        status: 'QUEUED',
        sourceFileId: sourceFile.id,
      },
    });

    // 5. If first job, register and increment usage count now
    if (isFirstJob) {
      await tx.usageRecord.upsert({
        where: { fingerprintHash_date: { fingerprintHash, date: todayStart() } },
        update: { jobCount: { increment: 1 } },
        create: { fingerprintHash, ipHash, date: todayStart(), jobCount: 1 },
      });
    }

    // 6. Push to analysis queue
    await mediaAnalysisQueue.add(job.id, { jobId: job.id });

    return { jobId: job.id, status: 'queued' };
  });
}
