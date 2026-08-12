/**
 * Batch job intake — SCAFFOLD ONLY.
 *
 * Structural placeholder for multi-file "compress several videos/photos in
 * one request" support. Deliberately not wired to the queue, worker, or
 * quota system — createBatchJobForFingerprint always throws
 * BatchNotImplementedError. This exists so the API/type shape is settled
 * ahead of time; implementing it for real means at minimum:
 *   - a Batch (or parent Job) table in prisma/schema.prisma + a migration
 *   - fanning file uploads/ownership checks out across N fileKeys instead of 1
 *   - deciding how quota accounting counts a batch (N jobs vs. 1 job)
 *   - deciding worker concurrency/ordering across a batch's jobs
 *   - dashboard UI for multi-file selection and per-file progress
 * None of that is done here — see createJobForFingerprint in job-intake.ts
 * for the real, single-file intake path this would eventually parallel.
 */

import type { PresetValue, DestinationValue } from './intake-validation.ts';

export interface CreateBatchJobInput {
  fileKeys: string[];
  preset: PresetValue;
  targetSizeMB?: number;
  prioritizeDetail?: boolean;
  destination?: DestinationValue;
  fingerprint: string;
  ip: string;
}

export interface BatchJobIntakeResult {
  batchId: string;
  jobIds: string[];
  status: 'queued';
}

export class BatchNotImplementedError extends Error {
  readonly code = 'BATCH_NOT_IMPLEMENTED';
  readonly statusCode = 501;

  constructor(message = 'Batch processing is not implemented yet.') {
    super(message);
    this.name = 'BatchNotImplementedError';
  }
}

/**
 * Intended eventual behavior: validate every fileKey the same way
 * createJobForFingerprint validates one, create N Job rows under a shared
 * batchId, and enqueue them together. For now this is a stub so callers
 * (the route, future UI) have a real function signature to build against.
 */
export async function createBatchJobForFingerprint(
  _input: CreateBatchJobInput,
): Promise<BatchJobIntakeResult> {
  throw new BatchNotImplementedError();
}
