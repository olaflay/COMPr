import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  validatorCompiler,
  serializerCompiler,
} from '@fastify/type-provider-zod';
import { storageClient } from '../lib/storage.ts';
import uploadsRoutes from '../apps/api/src/routes/uploads.ts';
import { prisma } from '../lib/prisma.ts';

describe('resumable-upload flow routes', () => {
  let app: any;
  let sendMock: any;
  let origCreate: any;
  let origUpdate: any;
  let origFindUnique: any;
  let origDelete: any;

  before(async () => {
    // Intercept database calls to run in isolation without live Postgres
    origCreate = prisma.mediaFile.create;
    origUpdate = prisma.mediaFile.update;
    origFindUnique = prisma.mediaFile.findUnique;
    origDelete = prisma.mediaFile.delete;

    const mockDb = new Map<string, any>();

    prisma.mediaFile.create = (async (args: any) => {
      const id = 'mock-mediafile-id-123';
      const record = {
        id,
        storageKey: args.data.storageKey,
        mimeType: args.data.mimeType,
        sizeBytes: args.data.sizeBytes,
        role: args.data.role,
        expiresAt: args.data.expiresAt,
      };
      mockDb.set(id, record);
      return record;
    }) as any;

    prisma.mediaFile.update = (async (args: any) => {
      const id = args.where.id;
      const record = mockDb.get(id);
      if (record) {
        Object.assign(record, args.data);
      }
      return record;
    }) as any;

    prisma.mediaFile.findUnique = (async (args: any) => {
      const storageKey = args.where.storageKey;
      for (const record of mockDb.values()) {
        if (record.storageKey === storageKey) return record;
      }
      return null;
    }) as any;

    prisma.mediaFile.delete = (async (args: any) => {
      const id = args.where.id;
      mockDb.delete(id);
      return { id };
    }) as any;

    prisma.mediaFile.findMany = (async () => Array.from(mockDb.values())) as any;

    // Mock the S3 SDK storageClient.send call to avoid real network requests
    sendMock = mock.method(storageClient, 'send', async (command: any) => {
      const name = command.constructor.name;
      if (name === 'CreateMultipartUploadCommand') {
        return { UploadId: 'test-upload-id-123' };
      }
      if (name === 'CompleteMultipartUploadCommand') {
        return {};
      }
      return {};
    });

    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(uploadsRoutes);
    await app.ready();
  });

  after(async () => {
    await app.close();
    sendMock.mock.restore();

    // Restore database functions
    prisma.mediaFile.create = origCreate;
    prisma.mediaFile.update = origUpdate;
    prisma.mediaFile.findUnique = origFindUnique;
    prisma.mediaFile.delete = origDelete;
  });

  it('initiates multipart upload, registers in DB, and returns uploadId and pre-signed parts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/multipart/start',
      payload: {
        filename: 'video_slow_network.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 52428800 // 50MB (10 parts)
      }
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.uploadId, 'test-upload-id-123');
    assert.ok(body.fileKey.startsWith('uploads/'));
    assert.ok(Array.isArray(body.parts));
    assert.equal(body.parts.length, 10);
    assert.equal(body.parts[0].partNumber, 1);
    assert.ok(body.parts[0].uploadPartUrl);

    // Check DB record
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { storageKey: body.fileKey }
    });
    assert.ok(mediaFile);
    assert.equal(mediaFile.mimeType, 'video/mp4');
    assert.equal(mediaFile.sizeBytes, 52428800);
    assert.equal(mediaFile.role, 'source');

    // Clean up DB
    await prisma.mediaFile.delete({ where: { id: mediaFile.id } });
  });

  it('generates a presigned part upload URL with partNumber and uploadId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/multipart/presign-part',
      payload: {
        fileKey: 'uploads/dummy-file.mp4',
        uploadId: 'test-upload-id-123',
        partNumber: 3
      }
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.uploadPartUrl);
    assert.ok(body.uploadPartUrl.includes('partNumber=3'));
    assert.ok(body.uploadPartUrl.includes('uploadId=test-upload-id-123'));
  });

  it('generates multiple presigned part URLs via presign-parts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/multipart/presign-parts',
      payload: {
        fileKey: 'uploads/dummy-file.mp4',
        uploadId: 'test-upload-id-123',
        partNumbers: [2, 5, 8]
      }
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(Array.isArray(body.parts));
    assert.equal(body.parts.length, 3);
    assert.equal(body.parts[0].partNumber, 2);
    assert.equal(body.parts[1].partNumber, 5);
    assert.equal(body.parts[2].partNumber, 8);
    assert.ok(body.parts[0].uploadPartUrl.includes('partNumber=2'));
  });

  it('completes multipart upload and returns success', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/multipart/complete',
      payload: {
        fileKey: 'uploads/dummy-file.mp4',
        uploadId: 'test-upload-id-123',
        parts: [
          { ETag: 'etag1', PartNumber: 1 },
          { ETag: 'etag2', PartNumber: 2 }
        ]
      }
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.deepEqual(body, { success: true });
  });

  it('rejects an unsupported MIME type before creating any DB row (D-3 whitelist)', async () => {
    const before = await prisma.mediaFile.findMany();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/multipart/start',
      payload: {
        filename: 'malware.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024
      }
    });

    assert.equal(response.statusCode, 400);
    const after = await prisma.mediaFile.findMany();
    assert.equal(after.length, before.length, 'no MediaFile row should be created for a rejected type');
  });

  it('accepts a 3gpp/octet-stream source that the client allowlist permits', async () => {
    // lib/file-validation.ts allows video/3gpp; the server whitelist must
    // stay in sync so a client-validated file is never rejected server-side.
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/multipart/start',
      payload: {
        filename: 'clip.3gp',
        mimeType: 'video/3gpp',
        sizeBytes: 1024
      }
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.uploadId);
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { storageKey: body.fileKey }
    });
    assert.ok(mediaFile);
    assert.equal(mediaFile.mimeType, 'video/3gpp');
    await prisma.mediaFile.delete({ where: { id: mediaFile.id } });
  });
});
