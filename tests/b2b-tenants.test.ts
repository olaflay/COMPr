import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { validatorCompiler, serializerCompiler } from '@fastify/type-provider-zod';
import tenantRoutes from '../apps/api/src/routes/v1/tenants.ts';
import { prisma } from '../lib/prisma.ts';

describe('Vecteus Enterprise Tenant Management API', () => {
  let origFindUnique: any;
  let origCreate: any;

  before(() => {
    origFindUnique = prisma.tenant.findUnique;
    origCreate = prisma.tenant.create;

    (prisma.tenant as any).findUnique = async ({ where }: any) => {
      if (where?.slug === 'existing-corp') {
        return { id: 'ten_existing_123', name: 'Existing Corp', slug: 'existing-corp' };
      }
      return null;
    };

    (prisma.tenant as any).create = async ({ data }: any) => {
      return { id: 'ten_new_123', ...data, createdAt: new Date(), updatedAt: new Date() };
    };
  });

  after(() => {
    prisma.tenant.findUnique = origFindUnique;
    prisma.tenant.create = origCreate;
  });

  const buildApp = () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.register(tenantRoutes);
    return app;
  };

  it('rejects tenant creation with invalid or uppercase slug', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/tenants',
      payload: {
        name: 'Invalid Corp',
        slug: 'INVALID_SLUG!',
      },
    });

    assert.equal(res.statusCode, 400);
  });

  it('rejects tenant creation with duplicate slug', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/tenants',
      payload: {
        name: 'Existing Corp',
        slug: 'existing-corp',
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.payload);
    assert.equal(body.error?.code, 'TENANT_SLUG_EXISTS');
  });

  it('creates tenant with valid lowercase slug', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/tenants',
      payload: {
        name: 'Acme Media Inc',
        slug: 'acme-media',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.slug, 'acme-media');
  });

  it('returns 404 when issuing API key for non-existent tenant', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/tenants/ten_nonexistent_999/keys',
      payload: {
        name: 'Production Key',
      },
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.error?.code, 'TENANT_NOT_FOUND');
  });

  it('returns 404 when registering storage destination for non-existent tenant', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/tenants/ten_nonexistent_999/destinations',
      payload: {
        protocol: 's3',
        bucketName: 'customer-videos',
        accessKeyId: 'AKIA_KEY',
        secretAccessKey: 'SECRET_KEY',
      },
    });

    assert.equal(res.statusCode, 404);
  });

  it('returns 404 when registering webhook endpoint for non-existent tenant', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/tenants/ten_nonexistent_999/webhooks',
      payload: {
        url: 'https://customer.api/webhooks',
        events: ['job.completed'],
      },
    });

    assert.equal(res.statusCode, 404);
  });
});
