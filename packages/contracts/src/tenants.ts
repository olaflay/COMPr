import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens.',
  }),
  monthlyQuotaMinutes: z.number().int().positive().optional().default(1000),
  maxConcurrentJobs: z.number().int().positive().optional().default(2),
});

export type CreateTenantRequest = z.infer<typeof createTenantSchema>;

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;

export const createDestinationSchema = z.object({
  protocol: z.enum(['s3', 'r2']),
  bucketName: z.string().min(1).max(255),
  endpoint: z.string().url().nullable().optional(),
  region: z.string().optional().default('auto'),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
});

export type CreateDestinationRequest = z.infer<typeof createDestinationSchema>;

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).optional().default(['job.completed', 'job.failed']),
});

export type CreateWebhookRequest = z.infer<typeof createWebhookSchema>;

export const tenantUsageRecordSchema = z.object({
  billingMonth: z.string(),
  minutesEncoded: z.number(),
  bytesIn: z.number(),
  bytesOut: z.number(),
  jobCount: z.number(),
});

export type TenantUsageRecord = z.infer<typeof tenantUsageRecordSchema>;

export const tenantUsageResponseSchema = z.object({
  tenantId: z.string(),
  usage: z.array(tenantUsageRecordSchema),
});

export type TenantUsageResponse = z.infer<typeof tenantUsageResponseSchema>;
