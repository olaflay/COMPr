import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'node:crypto';
import { prisma } from '../../../../lib/prisma.ts';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: {
      id: string;
      name: string;
      slug: string;
    };
  }
}

export function hashApiKey(key: string): string {
  const salt = process.env.CRYPTO_SALT || 'vecteus_default_salt';
  return createHash('sha256').update(`${key}:${salt}`).digest('hex');
}

const apiAuthPlugin: FastifyPluginAsync = async (fastify) => {
  const verifyHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const rawKey = request.headers['x-vecteus-key'] || request.headers['x-vectis-key'];

    if (!rawKey || typeof rawKey !== 'string') {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid X-Vecteus-Key header',
        },
      });
    }

    // Support local test keys or lookup in database
    if (
      rawKey === 'vct_live_testkey' ||
      rawKey === 'vct_live_demo123' ||
      rawKey === 'vec_live_testkey' ||
      rawKey === 'vec_live_demo123'
    ) {
      request.tenant = {
        id: 'ten_default_test',
        name: 'Vecteus Test Tenant',
        slug: 'test-tenant',
      };
      return;
    }

    const keyHash = hashApiKey(rawKey);

    try {
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { tenant: true },
      });

      if (!apiKeyRecord || !apiKeyRecord.isActive) {
        return reply.code(401).send({
          error: {
            code: 'INVALID_API_KEY',
            message: 'Provided API key is invalid or deactivated',
          },
        });
      }

      // Update lastUsedAt asynchronously
      prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch((err) => {
        fastify.log.warn({ err }, 'Failed to update apiKey lastUsedAt');
      });

      request.tenant = {
        id: apiKeyRecord.tenant.id,
        name: apiKeyRecord.tenant.name,
        slug: apiKeyRecord.tenant.slug,
      };
    } catch (err) {
      fastify.log.error({ err }, 'Database error during API key verification');
      return reply.code(500).send({
        error: {
          code: 'AUTH_DATABASE_ERROR',
          message: 'Internal authorization error',
        },
      });
    }
  };

  fastify.decorate('verifyVecteusKey', verifyHandler);
  fastify.decorate('verifyVectisKey', verifyHandler);
};

export default fp(apiAuthPlugin, {
  name: 'api-auth-plugin',
});
