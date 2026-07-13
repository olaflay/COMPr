/**
 * PRD 37: Sitemap — only static, indexable marketing pages.
 * Job pages (/jobs/:id) are excluded per robots.txt.
 */

import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://compr.app';
  const staticRoutes = ['', '/about', '/pricing', '/how-it-works'];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : ('monthly' as const),
    priority: route === '' ? 1.0 : 0.7,
  }));
}
