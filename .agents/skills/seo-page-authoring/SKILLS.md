---
name: seo-page-authoring
description: Use for anything on a marketing/indexable page or the sitemap/robots layer — new pages under app/(marketing), metadata, structured data, sitemap.ts, robots.txt, or llms.txt. Triggers on "SEO," "marketing page," "sitemap," "structured data," "indexable," "meta tags."
---

# SEO Page Authoring

Teaches the ordered checklist for building or updating an indexable page so
it's actually crawlable and correctly excludes non-indexable job pages.
Laws live in `copy-and-claims.md` and PRD §10, §37.

## Procedure

1. **Confirm the page belongs under `app/(marketing)`, server-rendered or
   statically generated.** Marketing pages (`/`, `/about`, `/pricing`,
   `/how-it-works`) must be crawlable without JavaScript execution — client-only rendering here fails the requirement (PRD §10, §37).

2. **Build metadata through the shared builder, not ad hoc tags.** Use
   `lib/seo.ts` for title, description, canonical URL, Open Graph, and
   Twitter Card tags — a page-specific one-off metadata block drifts from
   the shared pattern (PRD §37).

3. **Add structured data once, in the root layout, not per-page.**
   Organization and SoftwareApplication JSON-LD renders once and describes
   COMPr's actual free/paid model — check `copy-and-claims.md` before
   writing any pricing/capability claim into structured data, since it must
   never overstate PRD §27's real business model.

4. **Register the page in `app/sitemap.ts` only if it's a static,
   indexable route.** Job pages (`/jobs/:id`) are explicitly excluded — the
   sitemap covers only static routes (PRD §37).

5. **Confirm `robots.txt` still disallows `/jobs/*` and `/api/*`.** If this
   task adds a new dynamic, user-specific route, check whether it needs the
   same exclusion pattern rather than assuming only `/jobs/*` matters.

6. **Confirm job/transient pages carry the header pair as defense in
   depth,** beyond robots.txt: `X-Robots-Tag: noindex, nofollow` and
   `Cache-Control: no-store`, set in `next.config.ts` (PRD §22, §37).

7. **If `llms.txt` is affected, keep its COMPr description accurate** —
   it must state plainly that COMPr does not bypass WhatsApp compression
   (`copy-and-claims.md`, PRD §37).

8. **Validate before calling it done.** Load the page with GA4 enabled and
   confirm no CSP violations in the console (PRD §37); run the Rich Results
   Test against any new/changed structured data.

## Code skeleton

```typescript
// lib/seo.ts — shared metadata builder, used by every marketing page
export function buildPageMetadata(page: 'home' | 'about' | 'pricing' | 'how-it-works'): Metadata {
  const config = PAGE_SEO_CONFIG[page];
  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: config.canonicalUrl },
    openGraph: { title: config.title, description: config.description, images: [config.ogImage] },
    twitter: { card: 'summary_large_image', title: config.title },
  };
}
```

```typescript
// app/sitemap.ts — static routes only, job pages excluded
export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_MARKETING_ROUTES.map((route) => ({
    url: `https://compr.app${route}`,
    lastModified: new Date(),
  })); // /jobs/:id never appears here
}
```

```text
# public/robots.txt
User-agent: *
Allow: /
Disallow: /jobs/*
Disallow: /api/*
```

```typescript
// next.config.ts — defense in depth for job pages
async headers() {
  return [{
    source: '/jobs/:path*',
    headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Cache-Control', value: 'no-store' },
    ],
  }];
}
```

## Traps

- Building a marketing page as a client-only component — passes visually
  but fails the "crawlable without JS" requirement.
- Writing a one-off `<title>`/meta block instead of going through
  `lib/seo.ts` — drifts from the shared pattern page by page.
- Adding a new dynamic user-specific route without extending the
  `robots.txt` disallow pattern or the noindex header rule to cover it.
- Letting structured data state a pricing/capability claim that outruns
  the actual business model in PRD §27.
- Registering `/jobs/:id` (or any transient route) in `sitemap.ts` by
  mistake because it "seemed like content."

## Verify before done

- [ ] New/changed marketing page is server-rendered or statically generated.
- [ ] Metadata goes through `lib/seo.ts`, not a page-specific one-off block.
- [ ] Structured data claims match PRD §27's actual business model exactly.
- [ ] Sitemap contains only static, indexable routes — no job/transient pages.
- [ ] `robots.txt` and the noindex/no-store headers cover any new transient route type.
- [ ] Rich Results Test passes for any changed structured data.
- **Tests to write:** a test asserting `/jobs/:id` never appears in `sitemap.ts` output, and a header-assertion test confirming `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` are present on any `/jobs/*` response.
