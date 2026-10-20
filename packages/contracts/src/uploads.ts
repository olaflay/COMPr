import { z } from 'zod';
import { ALLOWED_MIME_TYPES } from './ingest.js';

export const startUploadBodySchema = z.object({
  filename: z.string(),
  mimeType: z.string().refine(
    (v) => (ALLOWED_MIME_TYPES as readonly string[]).includes(v),
    { message: 'Unsupported file type.' }
  ),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024, {
    message: 'File size exceeds maximum allowed (50MB).',
  }),
});

export type StartUploadBody = z.infer<typeof startUploadBodySchema>;

export const presignPartBodySchema = z.object({
  fileKey: z.string(),
  uploadId: z.string(),
  partNumber: z.number().int().positive(),
});

export type PresignPartBody = z.infer<typeof presignPartBodySchema>;

export const multipartPartSchema = z.object({
  ETag: z.string(),
  PartNumber: z.number().int().positive(),
});

export type MultipartPart = z.infer<typeof multipartPartSchema>;

export const completeMultipartBodySchema = z.object({
  fileKey: z.string(),
  uploadId: z.string(),
  parts: z.array(multipartPartSchema),
});

export type CompleteMultipartBody = z.infer<typeof completeMultipartBodySchema>;

export const presignPartsBodySchema = z.object({
  fileKey: z.string(),
  uploadId: z.string(),
  partNumbers: z.array(z.number().int().positive()),
});

export type PresignPartsBody = z.infer<typeof presignPartsBodySchema>;
