import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { storageClient } from '../server/services/storage.ts';

interface EndpointShape {
  protocol?: string;
  hostname?: string;
  path?: string;
  url?: URL | string;
}

async function resolvedEndpoint(): Promise<string> {
  const ep = storageClient.config.endpoint as unknown;
  const resolved = (typeof ep === 'function' ? await (ep as () => Promise<unknown>)() : ep) as EndpointShape;
  if (resolved?.hostname) {
    const p = resolved.protocol || 'https:';
    return `${p}//${resolved.hostname}${resolved.path || ''}`;
  }
  const u = resolved?.url as URL | string | undefined;
  return String(u || resolved);
}

async function resolvedCredentials(): Promise<{ accessKeyId?: string; secretAccessKey?: string }> {
  const creds = storageClient.config.credentials as unknown;
  if (typeof creds === 'function') {
    return ((await (creds as () => Promise<unknown>)()) || {}) as {
      accessKeyId?: string;
      secretAccessKey?: string;
    };
  }
  return (creds || {}) as { accessKeyId?: string; secretAccessKey?: string };
}

describe('Tigris object-storage config', () => {
  it('uses virtual-hosted-style addressing (forcePathStyle false) required by Tigris', () => {
    // Tigris docs: AWS SDK must be used with s3ForcePathStyle: false.
    assert.equal(storageClient.config.forcePathStyle, false);
  });

  it('targets the canonical Tigris endpoint and region auto by default', async () => {
    const endpoint = await resolvedEndpoint();
    assert.match(endpoint, /t3\.storage\.dev|fly\.storage\.tigris\.dev/);
    const region = storageClient.config.region as unknown;
    const resolvedRegion =
      typeof region === 'function' ? await (region as () => Promise<string>)() : region;
    assert.equal(resolvedRegion, 'auto');
  });

  it('never embeds a real secret; uses the dummy fallback only when TIGRIS_* is unset', async () => {
    const creds = await resolvedCredentials();
    assert.equal(typeof creds.accessKeyId, 'string');
    assert.equal(
      creds.accessKeyId === 'dummy',
      !process.env.TIGRIS_ACCESS_KEY_ID,
      'accessKeyId should be the env value or the dummy fallback'
    );
  });
});
