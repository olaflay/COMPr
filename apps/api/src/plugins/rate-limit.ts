import type { FastifyInstance } from 'fastify';
import { redisConnection } from '../../../../lib/queue.ts';
import { hashString } from '../../../../lib/crypto.ts';

// Per-IP request budgets per 60s window, keyed by route class.
// Write paths are resource-expensive (create MediaFile rows, presign) so they
// get a strict 20/min cap (PRD §23 / security.md). Read paths are cheap to
// serve but must be capped too, or /usage + /jobs/:jobId can be scraped /
// enumerated. The read cap is looser so legitimate dashboard polling is never
// throttled under normal use (D-6).
const WRITE_LIMIT = 20;
const READ_LIMIT = 100;
const WINDOW_SECONDS = 60;

// Fixed-window rate limit via Redis INCR + EXPIRE. Uses caller-supplied redis
// connection so tests can mock `incr`/`expire` without a live Redis.
async function applyFixedWindowLimit(
  key: string,
  limit: number,
  request: { log: { error: (err: unknown, msg: string) => void } },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } }
): Promise<boolean> {
  try {
    const count = await redisConnection.incr(key);
    if (count === 1) {
      await redisConnection.expire(key, WINDOW_SECONDS);
    }
    if (count > limit) {
      reply.code(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again in a minute.',
        },
      });
      return false;
    }
  } catch (error) {
    request.log.error(error, 'Rate limit check encountered Redis error');
  }
  return true;
}

/**
 * Fastify plugin enforcing rate limits on resource-creation (write) and
 * enumeration-prone (read) endpoints to protect against concurrency abuse,
 * resource exhaustion, and scraping (PRD §23, security.md, D-6).
 */
export default async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const path = (request as any).routerPath || request.url.split('?')[0];
    const ip = request.ip;
    // Salted IP hash to protect user privacy (complying with security.md and PRD §23, §27)
    const ipHash = hashString(ip);

    // Write paths: strict budget.
    if (
      request.method === 'POST' &&
      (path === '/api/v1/jobs' ||
       path === '/api/v1/uploads/presign' ||
       path === '/api/v1/uploads/multipart/start' ||
       path === '/api/v1/uploads/multipart/presign-part' ||
       path === '/api/v1/uploads/multipart/complete')
    ) {
      const ok = await applyFixedWindowLimit(
        `rl:${ipHash}:${path}`,
        WRITE_LIMIT,
        request,
        reply
      );
      if (!ok) return reply;
      return;
    }

    // Read paths: looser budget to stop scraping/enumeration (D-6).
    if (
      request.method === 'GET' &&
      (path === '/api/v1/usage' ||
       (path !== undefined && path.startsWith('/api/v1/jobs/')))
    ) {
      const routeKey = path.startsWith('/api/v1/jobs/') ? '/api/v1/jobs/:jobId' : path;
      const ok = await applyFixedWindowLimit(
        `rl:${ipHash}:${routeKey}`,
        READ_LIMIT,
        request,
        reply
      );
      if (!ok) return reply;
      return;
    }
  });
}
(rateLimitPlugin as any)[Symbol.for('skip-override')] = true;


