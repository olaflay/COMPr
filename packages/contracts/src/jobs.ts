import { z } from 'zod';

export const jobStatusSchema = z.enum([
  'QUEUED',
  'ANALYZING',
  'ENCODING',
  'VERIFYING',
  'COMPLETED',
  'DONE',
  'FAILED',
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobTelemetrySchema = z.object({
  jobId: z.string(),
  status: z.string(),
  sourceSizeBytes: z.number().nullable().optional(),
  outputSizeBytes: z.number().nullable().optional(),
  savingsPercent: z.number().nullable().optional(),
  vmafScore: z.number().nullable().optional(),
  ssimScore: z.number().nullable().optional(),
  durationSec: z.number().nullable().optional(),
  outputUrl: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
});

export type JobTelemetry = z.infer<typeof jobTelemetrySchema>;

export const PRESET_VALUES = ['STATUS', 'CHAT', 'CUSTOM'] as const;
export const DESTINATION_VALUES = ['DOWNLOAD', 'WHATSAPP'] as const;

export const createJobBodySchema = z.object({
  fileKey: z.string(),
  preset: z.enum(PRESET_VALUES),
  targetSizeMB: z.number().min(1).max(16).optional(),
  prioritizeDetail: z.boolean().optional(),
  destination: z.enum(DESTINATION_VALUES).optional(),
  fingerprint: z.string(),
});

export type CreateJobBody = z.infer<typeof createJobBodySchema>;

export const createBatchJobBodySchema = z.object({
  fileKeys: z.array(z.string()).min(2).max(10),
  preset: z.enum(PRESET_VALUES),
  targetSizeMB: z.number().min(1).max(16).optional(),
  prioritizeDetail: z.boolean().optional(),
  destination: z.enum(DESTINATION_VALUES).optional(),
  fingerprint: z.string(),
});

export type CreateBatchJobBody = z.infer<typeof createBatchJobBodySchema>;
