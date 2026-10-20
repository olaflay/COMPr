import { z } from 'zod';

export const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
  'video/x-msvideo',
  'application/octet-stream',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

export const presignRequestSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().refine(
    (v) => (ALLOWED_MIME_TYPES as readonly string[]).includes(v),
    { message: 'Unsupported media MIME type.' }
  ),
  sizeBytes: z.number().int().positive().max(500 * 1024 * 1024, {
    message: 'Maximum file size is 500MB.',
  }),
  targetVmaf: z.number().min(70).max(100).optional().default(92.0),
  maxBitrateKbps: z.number().int().positive().optional(),
  segmentDurationSec: z.number().int().positive().nullable().optional(),
  storageDestinationId: z.string().optional(),
});

export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const presignResponseSchema = z.object({
  jobId: z.string(),
  uploadUrl: z.string(),
  storageKey: z.string(),
  expiresAt: z.string(),
});

export type PresignResponse = z.infer<typeof presignResponseSchema>;

export const completeIngestRequestSchema = z.object({
  jobId: z.string().min(1),
});

export type CompleteIngestRequest = z.infer<typeof completeIngestRequestSchema>;

export const completeIngestResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  queuePosition: z.number(),
});

export type CompleteIngestResponse = z.infer<typeof completeIngestResponseSchema>;
