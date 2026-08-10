import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMetadata, organizationSchema, softwareApplicationSchema } from '../lib/seo.ts';

describe('seo.ts structured data and metadata', () => {
  it('generates the default metadata accurately', () => {
    const meta = buildMetadata();
    assert.equal(meta.title, 'COMPr | WhatsApp-ready photos and videos');
    assert.ok(meta.description.includes('optimize'));
    assert.equal(meta.alternates.canonical, 'https://compr.app');
    assert.ok(meta.icons);
    assert.equal(meta.icons.icon, '/favicon.svg');
    assert.equal(meta.icons.shortcut, '/favicon.ico');
    assert.equal(meta.icons.apple, '/favicon.svg');
  });

  it('customizes the page title in metadata', () => {
    const meta = buildMetadata({ title: 'About Us', path: '/about' });
    assert.equal(meta.title, 'About Us | COMPr');
    assert.equal(meta.alternates.canonical, 'https://compr.app/about');
  });

  it('returns valid JSON-LD schemas', () => {
    const org = organizationSchema();
    assert.equal(org['@type'], 'Organization');
    assert.equal(org.name, 'COMPr');

    const app = softwareApplicationSchema();
    assert.equal(app['@type'], 'SoftwareApplication');
    assert.equal(app.name, 'COMPr');
    assert.equal((app.offers as any).price, '0');
  });
});
