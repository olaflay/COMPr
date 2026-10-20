import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppShareUrl,
  buildWhatsAppStatusShareUrl,
} from '../lib/whatsapp-share.ts';

describe('lib/whatsapp-share.ts - WhatsApp Share URL Builders', () => {
  it('builds a general share URL with default fallback', () => {
    const url = buildWhatsAppShareUrl();
    assert.ok(url.includes('https://wa.me/?text='));
    assert.ok(url.includes('Make%20your%20media%20look%20sharp%20on%20WhatsApp'));
  });

  it('builds a share URL incorporating the download path', () => {
    const url = buildWhatsAppShareUrl('/api/v1/jobs/123/download/out_1');
    assert.ok(url.includes('https://wa.me/?text='));
    assert.ok(url.includes('download%2Fout_1') || url.includes('/download/out_1') || url.includes('jobs'));
  });

  it('builds a status share URL with Vecteus branding', () => {
    const url = buildWhatsAppStatusShareUrl('/api/v1/jobs/456/download/out_2');
    assert.ok(url.includes('https://wa.me/?text='));
    assert.ok(url.includes('Vecteus'));
  });
});
