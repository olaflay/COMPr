import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Redis from 'ioredis';

// Disable network connectivity for Redis so importing queue modules
// never opens a real connection during unit test execution.
Redis.prototype.connect = () => Promise.resolve();
Redis.prototype.disconnect = () => {};
Redis.prototype.quit = () => Promise.resolve('OK');
const originalOn = Redis.prototype.on;
Redis.prototype.on = function (this: any, event: string, listener: any) {
  if (event === 'error') return this;
  return originalOn.call(this, event, listener);
};

import Fastify from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { validatorCompiler, serializerCompiler } from '@fastify/type-provider-zod';
import { prisma } from '../lib/prisma.ts';
import * as queueModule from '../lib/queue.ts';
import ingestRoutes from '../apps/api/src/routes/v1/ingest.ts';
import { signWebhookPayload } from '../lib/crypto.ts';

describe('Vecteus B2B Ingestion API & Webhook Suite', () => {
  let app: any;
  let origMediaFileCreate: any;
  let origJobCreate: any;
  let origJobFindUnique: any;
  let origQueueAdd: any;

  before(async () => {
    origMediaFileCreate = prisma.mediaFile.create;
    origJobCreate = prisma.job.create;
    origJobFindUnique = prisma.job.findUnique;
    origQueueAdd = queueModule.mediaAnalysisQueue.add;

    (prisma.mediaFile as any).create = async (args: any) => ({
      id: 'mock-file-123',
      storageKey: args.data.storageKey,
      mimeType: args.data.mimeType,
      sizeBytes: args.data.sizeBytes,
      role: 'source',
      expiresAt: args.data.expiresAt,
    });

    (prisma.job as any).create = async (args: any) => ({
      id: 'vec_job_mock_123',
      status: args.data.status,
      preset: args.data.preset,
      mediaKind: args.data.mediaKind,
      targetVmaf: args.data.targetVmaf,
      maxBitrateKbps: args.data.maxBitrateKbps,
      segmentDurationSec: args.data.segmentDurationSec,
    });

    (prisma.job as any).findUnique = async (args: any) => ({
      id: args.where.id,
      status: 'COMPLETED',
      vmafScore: 93.8,
      sourceFile: { sizeBytes: 25000000 },
      outputs: [{ sizeBytes: 8500000 }],
      completedAt: new Date(),
    });

    queueModule.mediaAnalysisQueue.add = (async () => ({ id: 'mock-job-id' })) as any;

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.register(ingestRoutes);
    await app.ready();
  });

  after(() => {
    prisma.mediaFile.create = origMediaFileCreate;
    prisma.job.create = origJobCreate;
    prisma.job.findUnique = origJobFindUnique;
    queueModule.mediaAnalysisQueue.add = origQueueAdd;
  });

  it('rejects presign request when X-Vectis-Key is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ingest/presign',
      payload: {
        filename: 'test.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 10485760,
      },
    });

    assert.strictEqual(res.statusCode, 401);
    const body = res.json();
    assert.strictEqual(body.error?.code, 'UNAUTHORIZED');
  });

  it('rejects presign request for unsupported MIME type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ingest/presign',
      headers: {
        'x-vectis-key': 'vec_live_demo123',
      },
      payload: {
        filename: 'malicious.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 10485760,
      },
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('generates a valid presigned upload URL and jobId with X-Vecteus-Key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ingest/presign',
      headers: {
        'x-vecteus-key': 'vct_live_demo123',
      },
      payload: {
        filename: 'customer-video.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 25000000,
        targetVmaf: 94.0,
        maxBitrateKbps: 3500,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.jobId, 'vec_job_mock_123');
    assert.ok(body.uploadUrl);
    assert.ok(body.storageKey.startsWith('staging/vec_'));
    assert.ok(body.expiresAt);
  });

  it('signals upload complete via POST /v1/ingest/complete', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ingest/complete',
      headers: {
        'x-vectis-key': 'vec_live_demo123',
      },
      payload: {
        jobId: 'vec_job_mock_123',
      },
    });

    assert.strictEqual(res.statusCode, 202);
    const body = res.json();
    assert.strictEqual(body.jobId, 'vec_job_mock_123');
    assert.strictEqual(body.status, 'QUEUED');
  });

  it('fetches job metrics via GET /v1/jobs/:jobId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/jobs/vec_job_mock_123',
      headers: {
        'x-vectis-key': 'vec_live_demo123',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.jobId, 'vec_job_mock_123');
    assert.strictEqual(body.status, 'COMPLETED');
    assert.strictEqual(body.vmafScore, 93.8);
    assert.strictEqual(body.savingsPercent, 66.0); // 1 - 8.5/25 = 0.66
  });

  it('cryptographically signs webhook payload using HMAC-SHA256', async () => {
    const secret = 'whsec_test_secret_99482';
    const payload = JSON.stringify({
      event: 'job.completed',
      jobId: 'vec_job_test_123',
      vmaf: 94.5,
    });

    const sig = signWebhookPayload(payload, secret);
    assert.ok(sig);
    assert.strictEqual(typeof sig, 'string');
    assert.strictEqual(sig.length, 64); // 256 bits = 64 hex characters
  });
});
