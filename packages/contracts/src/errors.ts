import { z } from 'zod';

export const standardErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'NOT_FOUND',
  'INVALID_REQUEST',
  'INVALID_API_KEY',
  'SSRF_BLOCKED',
  'TENANT_NOT_FOUND',
  'TENANT_SLUG_EXISTS',
  'QUOTA_EXCEEDED',
  'UNSUPPORTED_MEDIA_TYPE',
  'RATE_LIMITED',
  'FILE_CORRUPTED',
  'VMAF_THRESHOLD_UNMET',
  'INTERNAL_ERROR',
]);

export type StandardErrorCode = z.infer<typeof standardErrorCodeSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export function createErrorEnvelope(code: string, message: string): ErrorEnvelope {
  return {
    error: {
      code,
      message,
    },
  };
}
