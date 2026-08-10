import type { FastifyInstance } from 'fastify';
import { redisConnection } from '../../lib/queue.ts';
import { hashString } from '../../lib/crypto.ts';

/**
 * Fastify plugin enforcing rate limits on resource-creation endpoints
 * to protect the application from concurrency abuse and resource exhaustion.
 * Enforces a strict limit of 20 requests/minute/IP per PRD §23 and security.md rules.
 */
export default async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const path = (request as any).routerPath || request.url.split('?')[0];
    
    // Apply rate limit specifically to POST /jobs, POST /uploads/presign, and multipart uploads
    if (
      (path === '/api/v1/jobs' ||
       path === '/api/v1/uploads/presign' ||
       path === '/api/v1/uploads/multipart/start' ||
       path === '/api/v1/uploads/multipart/presign-part' ||
       path === '/api/v1/uploads/multipart/complete') &&
      request.method === 'POST'
    ) {
      const ip = request.ip;
      // Salted IP hash to protect user privacy (complying with security.md and PRD §23, §27)
      const ipHash = hashString(ip);
      const key = `rl:${ipHash}:${path}`;

      try {
        const count = await redisConnection.incr(key);
        if (count === 1) {
          // Expiry set to 60 seconds to define a 1-minute rolling/fixed window
          await redisConnection.expire(key, 60);
        }

        if (count > 20) {
          return reply.code(429).send({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded. Please try again in a minute.',
            },
          });
        }
      } catch (error) {
        // Log errors to Fastify logs (which standard error handler or Sentry handles)
        request.log.error(error, 'Rate limit check encountered Redis error');
      }
    }
  });
}
(rateLimitPlugin as any)[Symbol.for('skip-override')] = true;


