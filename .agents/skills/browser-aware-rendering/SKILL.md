---
name: browser-aware-rendering
description: Use for any frontend work affecting page load, layout, or motion — new pages, hero/LCP images, CSS, script loading, animations, or loading states. Triggers on "performance," "Lighthouse," "layout shift," "LCP," "hydration," "slow page," "PWA audit," or any new marketing/screen component under app/(marketing) or /components.
---

# Browser-Aware Rendering

Teaches how to build a page or component so the browser's rendering
pipeline works with the design instead of against it — first-screen cost,
LCP priority, non-blocking scripts, stable layout, compositor-friendly
motion. This is what makes PRD §10's requirement real: the frontend must be
usable and performant on mid-range Android over 3G/4G, and the PWA must
pass a Lighthouse installability/performance audit. `ui-component-builder`
teaches design-token discipline; this skill teaches rendering-pipeline
discipline for the same components.

## Procedure

1. **Identify the LCP candidate before writing any markup.** Every page has
   one — hero image, product image, headline block. Decide it explicitly;
   don't let five competing visual elements fight for it. This matters most
   on `app/(marketing)` pages, which PRD §10/§37 requires to be crawlable
   and fast without JS execution.

2. **Make the LCP element a first-class asset.** Explicit `width`/`height`
   or aspect-ratio, responsive `srcset` so mobile doesn't fetch desktop
   media, `fetchpriority="high"` on that one asset only, no lazy-loading on
   it, and a `<link rel="preload">` if the asset is known ahead of render.

3. **Check every script's loading strategy before adding it.** DOM-dependent
   but non-critical → `defer`. Independent third-party (Sentry, PostHog,
   GA4) → `async`. Modern module code → `type="module"`. Nothing analytics-
   or widget-related sits in the blocking `<head>` path
   (`security.md`'s CSP-scoped third parties still apply here — a script
   being async doesn't exempt it from the CSP allowlist).

4. **Treat CSS as load-bearing, not decorative.** Critical CSS available
   early (head or inlined), no page-specific CSS explosion — use the M3
   design-system primitives from `ui-component-builder` instead of one-off
   styles. Design every component state explicitly: empty, loading,
   long-text, error, hover/focus, responsive — an undesigned state is what
   causes layout shift later.

5. **Choose animation properties before choosing animation.** Default to
   `transform`/`opacity`. Treat `width`, `height`, `top`, `left`, `margin`,
   `padding`, `box-shadow`, `filter` as a signal to reconsider, since these
   force layout/paint work the compositor can't handle alone. This applies
   directly to the goal-gradient progress bar (FR-8) and any transition on
   the before/after comparison slider — both are core-flow UI PRD §10
   requires to stay smooth on mid-range Android.

6. **Reserve space for anything that loads late.** Media boxes, embed
   slots, toolbar/nav heights, loading skeletons that match final content
   dimensions — a loading state that's a small spinner replaced by a large
   content block is a CLS failure, not just a visual one.

7. **Check hydration dependency before shipping a component.** Server-render
   the meaningful structure, let CSS do initial layout, use JS to enhance —
   never ship a component that renders empty until client JS runs. This is
   non-negotiable for `app/(marketing)` (PRD §10, §37's crawlability
   requirement) and strongly preferred everywhere else for the 3G/4G target market.

8. **Use `will-change` only on a specific, currently-active element** (a
   drawer opening, a modal entering) — never as a blanket rule on a
   component class.

9. **Prefetch only predictable next steps**, e.g. upload screen →
   processing screen. Don't prefetch speculatively across the whole app —
   it costs bandwidth the target user (variable 3G/4G, PRD §7) can't spare.

10. **Run the checklist below before calling any page/component done**, and
    for marketing pages specifically, confirm the Lighthouse PWA audit
    still passes (PRD §10, §35 Milestone 10).

## Code skeleton

```html
<!-- LCP element: explicit dimensions, responsive set, eager + high priority -->
<link
  rel="preload" as="image"
  href="/images/hero.avif"
  imagesrcset="/images/hero-800.avif 800w, /images/hero-1400.avif 1400w"
  imagesizes="100vw"
>
<img
  src="/images/hero.avif"
  srcset="/images/hero-800.avif 800w, /images/hero-1400.avif 1400w"
  sizes="100vw" width="1400" height="900"
  fetchpriority="high"
  alt="NoBlur before/after comparison"
>

<!-- Non-critical scripts off the blocking path -->
<script src="/app.js" defer></script>
<script type="module" src="/main.js"></script>
```

```css
/* Compositor-friendly: progress bar / drawer transitions */
.progress-fill {
  transform: scaleX(var(--progress));
  transition: transform 180ms ease;
}
.drawer[data-state="opening"] { will-change: transform; } /* active element only */

/* Avoid: forces layout recalculation on every frame */
.progress-fill-bad { width: var(--progress); transition: width 180ms ease; }
```

```tsx
// Loading skeleton matches final layout — no CLS on job-status transitions
function JobStatusSkeleton() {
  return (
    <div className="h-[64px] rounded-m3-lg"> {/* same height as loaded ProgressIndicator */}
      <SkeletonPulse />
    </div>
  );
}
```

## Traps

- Letting the before/after comparison slider or upload progress bar animate
  `width`/`left` instead of `transform` — causes visible jank on the
  mid-range Android devices PRD §7 names as the primary hardware target.
- Shipping a marketing page (`app/(marketing)`) as a client-rendered shell
  that's blank until JS runs — directly fails PRD §10/§37's crawlability requirement.
- Adding a third-party script (chat widget, extra analytics) to the head
  without `defer`/`async` — and without checking it against the CSP
  allowlist in `security.md`.
- A loading skeleton that's visually smaller than the loaded content it
  precedes — causes the exact CLS jump this guide exists to prevent.
- Lazy-loading the primary hero/LCP image "for consistency" with other
  images on the page — the LCP candidate should always load eager and high-priority.
- Applying `will-change` broadly to a component class instead of only the
  currently-animating instance — increases memory without benefit.

## Verify before done

- [ ] The page/component has one identified LCP candidate with explicit
      dimensions and, if it's the true LCP element, `fetchpriority="high"` and no lazy-load.
- [ ] All non-critical and third-party scripts are `defer`/`async`, and any
      new third-party origin is in the CSP allowlist (`security.md`).
- [ ] Animations use `transform`/`opacity`; any layout-affecting property
      change was deliberate, not incidental.
- [ ] Loading states match the dimensions of their final loaded state.
- [ ] Marketing pages still render meaningful content without JS execution.
- [ ] Lighthouse PWA/performance audit still passes after the change (PRD §10, Milestone 10).
- **Tests to write:** a visual regression or Lighthouse CI check on any
  touched `app/(marketing)` page confirming CLS stays near zero, and a
  manual/automated check that the page's core content is present in the
  server-rendered HTML response (no client-only shell) before hydration.
