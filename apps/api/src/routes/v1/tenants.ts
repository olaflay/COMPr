import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '../../../lib/prisma.ts';
import { hashApiKey } from '../../plugins/api-auth.ts';
import { validateWebhookUrl } from '../../../lib/ssrf.ts';

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens.',
  }),
  monthlyQuotaMinutes: z.number().int().positive().optional().default(1000),
  maxConcurrentJobs: z.number().int().positive().optional().default(2),
});

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

const createDestinationSchema = z.object({
  protocol: z.enum(['s3', 'r2']),
  bucketName: z.string().min(1).max(255),
  endpoint: z.string().url().nullable().optional(),
  region: z.string().optional().default('auto'),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
});

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).optional().default(['job.completed', 'job.failed']),
});

const tenantRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST /v1/tenants: Create Tenant
  app.post('/v1/tenants', {
    schema: {
      body: createTenantSchema,
    },
  }, async (request, reply) => {
    const { name, slug, monthlyQuotaMinutes, maxConcurrentJobs } = request.body;

    const existing = await prisma.tenant.findUnique({
      where: { slug },
    });
    if (existing) {
      return reply.code(409).send({
        error: {
          code: 'TENANT_SLUG_EXISTS',
          message: `Tenant slug ${slug} is already taken.`,
        },
      } as any);
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        monthlyQuotaMinutes,
        maxConcurrentJobs,
      },
    });

    return reply.code(201).send(tenant);
  });

  // POST /v1/tenants/:id/keys: Generate API Key
  app.post('/v1/tenants/:id/keys', {
    schema: {
      params: z.object({ id: z.string() }),
      body: createKeySchema,
    },
  }, async (request, reply) => {
    const { id: tenantId } = request.params;
    const { name } = request.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return reply.code(404).send({
        error: {
          code: 'TENANT_NOT_FOUND',
          message: `Tenant ${tenantId} not found.`,
        },
      } as any);
    }

    const randomSecret = randomBytes(24).toString('hex');
    const rawApiKey = `vct_live_${randomSecret}`;
    const keyPrefix = rawApiKey.slice(0, 16);
    const keyHash = hashApiKey(rawApiKey);

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        tenantId,
        name,
        keyHash,
        keyPrefix,
      },
    });

    return reply.code(201).send({
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      keyPrefix: apiKeyRecord.keyPrefix,
      apiKey: rawApiKey, // Displayed once upon issuance
      createdAt: apiKeyRecord.createdAt.toISOString(),
    });
  });

  // POST /v1/tenants/:id/destinations: Register Storage Destination
  app.post('/v1/tenants/:id/destinations', {
    schema: {
      params: z.object({ id: z.string() }),
      body: createDestinationSchema,
    },
  }, async (request, reply) => {
    const { id: tenantId } = request.params;
    const dest = request.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return reply.code(404).send({
        error: {
          code: 'TENANT_NOT_FOUND',
          message: `Tenant ${tenantId} not found.`,
        },
      } as any);
    }

    const created = await prisma.storageDestination.create({
      data: {
        tenantId,
        protocol: dest.protocol,
        bucketName: dest.bucketName,
        endpoint: dest.endpoint || null,
        region: dest.region,
        accessKeyId: dest.accessKeyId,
        secretAccessKey: dest.secretAccessKey,
        isDefault: dest.isDefault,
      },
    });

    return reply.code(201).send({
      id: created.id,
      protocol: created.protocol,
      bucketName: created.bucketName,
      region: created.region,
      isDefault: created.isDefault,
      createdAt: created.createdAt.toISOString(),
    });
  });

  // POST /v1/tenants/:id/webhooks: Register Webhook Endpoint
  app.post('/v1/tenants/:id/webhooks', {
    schema: {
      params: z.object({ id: z.string() }),
      body: createWebhookSchema,
    },
  }, async (request, reply) => {
    const { id: tenantId } = request.params;
    const { url, events } = request.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return reply.code(404).send({
        error: {
          code: 'TENANT_NOT_FOUND',
          message: `Tenant ${tenantId} not found.`,
        },
      } as any);
    }

    const ssrfCheck = await validateWebhookUrl(url);
    if (!ssrfCheck.valid) {
      return reply.code(400).send({
        error: {
          code: 'SSRF_BLOCKED',
          message: `Webhook destination rejected by SSRF security check: ${ssrfCheck.reason}`,
        },
      } as any);
    }

    const signingSecret = `whsec_${randomBytes(24).toString('hex')}`;
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url,
        events,
        signingSecret,
      },
    });

    return reply.code(201).send({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      signingSecret: webhook.signingSecret,
      createdAt: webhook.createdAt.toISOString(),
    });
  });

  // GET /v1/tenants/:id/usage: Get Tenant Monthly Usage
  app.get('/v1/tenants/:id/usage', {
    schema: {
      params: z.object({ id: z.string() }),
    },
  }, async (request, reply) => {
    const { id: tenantId } = request.params;

    const usageRecords = await prisma.tenantUsage.findMany({
      where: { tenantId },
      orderBy: { billingMonth: 'desc' },
    });

    return reply.code(200).send({
      tenantId,
      usage: usageRecords.map((r) => ({
        billingMonth: r.billingMonth,
        minutesEncoded: r.minutesEncoded,
        bytesIn: Number(r.bytesIn),
        bytesOut: Number(r.bytesOut),
        jobCount: r.jobCount,
      })),
    });
  });
};

export default tenantRoutes;
