import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import Redis from 'ioredis';

// Disable network connectivity for Redis and BullMQ
Redis.prototype.connect = () => Promise.resolve();
Redis.prototype.disconnect = () => {};
Redis.prototype.quit = () => Promise.resolve("OK");
const originalOn = Redis.prototype.on;
Redis.prototype.on = function(this: any, event: string, listener: any) {
  if (event === 'error') return this;
  return originalOn.call(this, event, listener);
};

let queueModule: any;
let rateLimitPlugin: any;
let hashString: any;

describe('rate-limit plugin', () => {
  let app: any;
  const mockStore = new Map<string, number>();

  before(async () => {
    // Dynamic import to ensure monkey-patched constructors are utilized
    queueModule = await import('../lib/queue.ts');
    rateLimitPlugin = (await import('../server/plugins/rate-limit.ts')).default;
    hashString = (await import('../lib/crypto.ts')).hashString;

    // Intercept redis functions to ensure unit tests run in isolation without requiring live Redis
    queueModule.redisConnection.incr = (async (key: string) => {
      const current = mockStore.get(key) || 0;
      const next = current + 1;
      mockStore.set(key, next);
      return next;
    }) as any;

    queueModule.redisConnection.expire = (async () => 1) as any;
    queueModule.redisConnection.del = (async (...keys: string[]) => {
      for (const k of keys) mockStore.delete(k);
      return keys.length;
    }) as any;

    app = Fastify({
      trustProxy: true,
    });
    
    await app.register(rateLimitPlugin);

    app.post('/api/v1/jobs', async () => {
      return { success: true };
    });

    app.post('/api/v1/uploads/presign', async () => {
      return { success: true };
    });

    app.get('/api/v1/usage', async () => {
      return { success: true };
    });

    await app.ready();
  });

  after(async () => {
    await app.close();
    try {
      await queueModule.mediaAnalysisQueue.close();
    } catch {}
    try {
      await queueModule.mediaEncodeQueue.close();
    } catch {}
    try {
      queueModule.redisConnection.disconnect();
    } catch (e) {
      // ignore connection close errors
    }
  });

  it('allows normal requests under 20 requests per minute', async () => {
    const ipHash = hashString('127.0.0.1');
    const path = '/api/v1/jobs';
    mockStore.delete(`rl:${ipHash}:${path}`);

    const response = await app.inject({
      method: 'POST',
      url: path,
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { success: true });
    mockStore.delete(`rl:${ipHash}:${path}`);
  });

  it('does not rate limit non-targeted endpoints (e.g. GET /api/v1/usage)', async () => {
    const ipHash = hashString('127.0.0.1');
    const path = '/api/v1/usage';
    mockStore.delete(`rl:${ipHash}:${path}`);

    for (let i = 0; i < 25; i++) {
      const response = await app.inject({
        method: 'GET',
        url: path,
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });
      assert.equal(response.statusCode, 200);
    }
  });

  it('blocks requests once they exceed 20 per minute on rate-limited endpoints', async () => {
    const ipHash = hashString('127.0.0.2');
    const path = '/api/v1/uploads/presign';
    mockStore.delete(`rl:${ipHash}:${path}`);

    for (let i = 0; i < 20; i++) {
      const response = await app.inject({
        method: 'POST',
        url: path,
        headers: { 'x-forwarded-for': '127.0.0.2' },
      });
      assert.equal(response.statusCode, 200);
    }

    const blockedResponse = await app.inject({
      method: 'POST',
      url: path,
      headers: { 'x-forwarded-for': '127.0.0.2' },
    });

    assert.equal(blockedResponse.statusCode, 429);
    const body = JSON.parse(blockedResponse.body);
    assert.equal(body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(body.error.message.includes('Rate limit exceeded'));

    mockStore.delete(`rl:${ipHash}:${path}`);
  });
});

