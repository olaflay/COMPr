/**
 * Tests for the idempotent retry behavior in lib/job-intake.ts.
 *
 * A source file is single-use. When a job already exists for it:
 *   - the SAME fingerprint retrying (lost first response) must get the
 *     existing job back WITHOUT burning a daily-quota slot or double-enqueueing;
 *   - a DIFFERENT fingerprint must be rejected with 403 FORBIDDEN.
 *
 * Run against a mocked prisma.$transaction and a neutered Redis/BullMQ client
 * so the pure intake rules stay isolated from Postgres/Redis.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Redis from 'ioredis';

// Disable network connectivity for Redis and BullMQ so importing lib/queue.ts
// (and the Queue it constructs) never opens a real connection that would hang
// the test process when no Redis is reachable.
Redis.prototype.connect = () => Promise.resolve();
Redis.prototype.disconnect = () => {};
Redis.prototype.quit = () => Promise.resolve('OK');
const originalOn = Redis.prototype.on;
Redis.prototype.on = function (this: any, event: string, listener: any) {
  if (event === 'error') return this;
  return originalOn.call(this, event, listener);
};

const FP = 'fingerprint-owner';
const FP_OTHER = 'fingerprint-intruder';
const FILE_KEY = 'uploads/abc123.mp4';
const EXISTING_JOB_ID = 'job-already-created';

describe('createJobForFingerprint (idempotent intake)', () => {
  let prisma: any;
  let queueModule: any;
  let createJobForFingerprint: any;
  let IntakeError: any;
  let hashString: any;
  let origTransaction: any;
  let origAdd: any;
  let enqueueCalls: string[];
  // which fingerprint owns the prior job (varies per test)
  let priorOwner: string;
  let freshFile: boolean;

  function makeQueueableTx() {
    return {
      job: {
        count: async ({ where }: any) => (where?.fingerprintHash ? 1 : 0),
        create: async () => ({ id: 'job-new' }),
      },
      mediaFile: {
        findUnique: async () => ({
          id: 'media-1',
          storageKey: FILE_KEY,
          jobAsSource: freshFile
            ? null
            : { id: EXISTING_JOB_ID, fingerprintHash: hashString(priorOwner) },
        }),
      },
      usageRecord: {
        upsert: async ({ update }: any) => ({
          id: 'usage-1',
          jobCount: update?.jobCount?.increment ?? 1,
          bonusCount: 0,
        }),
        update: async () => ({}),
      },
    };
  }

  before(async () => {
    const crypto = await import('../lib/crypto.ts');
    hashString = crypto.hashString;

    prisma = await import('../lib/prisma.ts');
    queueModule = await import('../lib/queue.ts');
    const intake = await import('../lib/job-intake.ts');
    createJobForFingerprint = intake.createJobForFingerprint;
    IntakeError = intake.IntakeError;

    origTransaction = prisma.prisma.$transaction;
    origAdd = queueModule.mediaAnalysisQueue.add;

    prisma.prisma.$transaction = (async (fn: any) => fn(makeQueueableTx())) as any;

    enqueueCalls = [];
    queueModule.mediaAnalysisQueue.add = (async (name: string) => {
      enqueueCalls.push(name);
      return { id: 'job-' + name };
    }) as any;
  });

  after(async () => {
    prisma.prisma.$transaction = origTransaction;
    queueModule.mediaAnalysisQueue.add = origAdd;
    try {
      await queueModule.mediaAnalysisQueue.close();
    } catch {}
    try {
      await queueModule.mediaEncodeQueue.close();
    } catch {}
    try {
      queueModule.redisConnection.disconnect();
    } catch {}
  });

  beforeEach(() => {
    priorOwner = FP;
    freshFile = false;
    enqueueCalls.length = 0;
  });

  it('returns the existing job on a same-owner retry, without re-enqueueing', async () => {
    priorOwner = FP;

    const result = await createJobForFingerprint({
      fileKey: FILE_KEY,
      preset: 'STATUS',
      targetSizeMB: undefined,
      fingerprint: FP,
      ip: '1.2.3.4',
    });

    assert.equal(result.jobId, EXISTING_JOB_ID);
    assert.equal(result.status, 'queued');
    // Short-circuit must not push to the queue for an already-processed file
    assert.equal(enqueueCalls.length, 0);
  });

  it("rejects a different fingerprint probing a processed file with 403 FORBIDDEN", async () => {
    priorOwner = FP; // the prior job belongs to FP, not FP_OTHER

    await assert.rejects(
      () =>
        createJobForFingerprint({
          fileKey: FILE_KEY,
          preset: 'STATUS',
          targetSizeMB: undefined,
          fingerprint: FP_OTHER,
          ip: '1.2.3.4',
        }),
      (err: any) => {
        assert.ok(err instanceof IntakeError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      },
    );
    assert.equal(enqueueCalls.length, 0);
  });

  it('creates a new job and enqueues it for a fresh (unprocessed) file', async () => {
    freshFile = true;

    const result = await createJobForFingerprint({
      fileKey: FILE_KEY,
      preset: 'STATUS',
      targetSizeMB: undefined,
      fingerprint: FP,
      ip: '1.2.3.4',
    });

    assert.equal(result.jobId, 'job-new');
    assert.equal(result.status, 'queued');
    assert.deepEqual(enqueueCalls, ['job-new']);
  });
});