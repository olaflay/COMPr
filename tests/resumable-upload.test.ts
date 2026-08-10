import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  validatorCompiler,
  serializerCompiler,
} from '@fastify/type-provider-zod';
import { r2Client } from '../server/services/storage.ts';
import uploadsRoutes from '../server/routes/uploads.ts';
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

    // Mock the S3 SDK r2Client.send call to avoid real network requests
    sendMock = mock.method(r2Client, 'send', async (command: any) => {
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

  it('initiates multipart upload, registers in DB, and returns uploadId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/multipart/start',
      payload: {
        filename: 'video_slow_network.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 52428800 // 50MB
      }
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.uploadId, 'test-upload-id-123');
    assert.ok(body.fileKey.startsWith('uploads/'));

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
});
