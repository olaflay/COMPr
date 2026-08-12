import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { extname } from 'node:path';
import { prisma } from '../../lib/prisma.ts';
import { getPresignedUploadUrl, startMultipartUpload, getPresignedPartUploadUrl, completeMultipartUpload } from '../services/storage.ts';

const startUploadBodySchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024, {
    message: 'Maximum file size is 50MB.',
  }),
});

const presignPartBodySchema = z.object({
  fileKey: z.string(),
  uploadId: z.string(),
  partNumber: z.number().int().positive(),
});

const completeMultipartBodySchema = z.object({
  fileKey: z.string(),
  uploadId: z.string(),
  parts: z.array(z.object({
    ETag: z.string(),
    PartNumber: z.number().int().positive(),
  })),
});

const uploadsRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST /api/v1/uploads/presign
  app.post('/api/v1/uploads/presign', {
    schema: {
      body: startUploadBodySchema,
    },
  }, async (request, reply) => {
    const { filename, mimeType, sizeBytes } = request.body;

    // Calculate expiry (60 minutes from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Create the media file record in DB first (role: source)
    const mediaFile = await prisma.mediaFile.create({
      data: {
        storageKey: '', // populated below once ID is generated
        mimeType,
        sizeBytes,
        role: 'source',
        expiresAt,
      },
    });

    const ext = extname(filename);
    const key = `uploads/${mediaFile.id}${ext}`;

    // Update with generated key
    await prisma.mediaFile.update({
      where: { id: mediaFile.id },
      data: { storageKey: key },
    });

    // Generate presigned PUT URL
    const uploadUrl = await getPresignedUploadUrl(key);

    return reply.send({
      uploadUrl,
      fileKey: key,
      expiresAt: expiresAt.toISOString(),
    });
  });

  // POST /api/v1/uploads/multipart/start
  app.post('/api/v1/uploads/multipart/start', {
    schema: {
      body: startUploadBodySchema,
    },
  }, async (request, reply) => {
    const { filename, mimeType, sizeBytes } = request.body;

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes expiry

    // Create the media file record in DB first (role: source)
    const mediaFile = await prisma.mediaFile.create({
      data: {
        storageKey: '',
        mimeType,
        sizeBytes,
        role: 'source',
        expiresAt,
      },
    });

    const ext = extname(filename);
    const key = `uploads/${mediaFile.id}${ext}`;

    // Update with generated key
    await prisma.mediaFile.update({
      where: { id: mediaFile.id },
      data: { storageKey: key },
    });

    try {
      const uploadId = await startMultipartUpload(key, mimeType);
      return reply.send({
        uploadId,
        fileKey: key,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err: any) {
      await prisma.mediaFile.delete({ where: { id: mediaFile.id } }).catch(() => {});
      throw err;
    }
  });

  // POST /api/v1/uploads/multipart/presign-part
  app.post('/api/v1/uploads/multipart/presign-part', {
    schema: {
      body: presignPartBodySchema,
    },
  }, async (request, reply) => {
    const { fileKey, uploadId, partNumber } = request.body;

    const uploadPartUrl = await getPresignedPartUploadUrl(fileKey, uploadId, partNumber);
    return reply.send({ uploadPartUrl });
  });

  // POST /api/v1/uploads/multipart/complete
  app.post('/api/v1/uploads/multipart/complete', {
    schema: {
      body: completeMultipartBodySchema,
    },
  }, async (request, reply) => {
    const { fileKey, uploadId, parts } = request.body;

    await completeMultipartUpload(fileKey, uploadId, parts);
    return reply.send({ success: true });
  });
};

export default uploadsRoutes;
