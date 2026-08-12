# NoBlur UI/UX Design System Practices

This document outlines the specific human-computer interaction (HCI), user psychology, and usability principles implemented in the NoBlur landing page and design tokens. These practices form the baseline for our design and layout decisions.

## I. Usability Laws

- **Jakob's Law**: The landing page follows standard, recognizable web layouts:
  - Header: Logo on the left, primary navigation centered, and CTA on the right.
  - Mobile: A familiar top-right hamburger icon that opens a clean drawer overlay.
  - Users do not have to learn a new interface structure to navigate NoBlur.
- **Hick's Law (Decision Time)**: We minimize cognitive choices to reduce user fatigue. The landing page has one dominant, high-contrast action ("Start Optimizing"). Other secondary navigation routes (Testimonials, Contact) are clearly secondary.
- **Fitts's Law (Target Size & Placement)**:
  - All interactive buttons on mobile (such as "Start Optimizing" and the drawer's "Get Started" buttons) expand to full width (`w-full`) to maximize target area and make them extremely easy to tap.
  - Close and hamburger buttons are built with generous touch targets (minimum `44x44px`) to prevent mis-clicks.
- **Aesthetic–Usability Effect**: A visually premium interface using Material Design 3 tokens, smooth transitions, WhatsApp-family brand colors, and clean typography builds immediate credibility and perceived reliability.

## II. Gestalt Psychology

- **Proximity (Visual Grouping)**:
  - The hero heading and the description explanation are grouped inside a tighter flex container (`gap-m3-medium` / 1rem) so they are perceived as a single informational block.
  - A larger spacing gap (`gap-m3-x-large` / 2rem) separates this group from the primary Call to Action (CTA) block, signaling that the CTA is a separate next step.
- **Figure–Ground**: The mobile navigation drawer uses a clean, fullscreen overlay (`fixed inset-0 z-50`) to separate navigation choices (figure) from the underlying landing page (ground), reducing visual noise.

## III. Cognitive Psychology

- **Cognitive Load Reduction**:
  - **Copy length constraint**: The landing page description is kept under 2 punchy sentences (138 characters), ensuring it can be read in under 3 seconds.
  - **Zero jargon rule**: Technical details (like bitrate, resolution, container profiles, and codecs) are entirely hidden. We speak in plain language ("Send sharp photos and videos without the blur").
- **Honesty & Trust Anchoring**: Near the main action, we state clearly: *"We never bypass or disable WhatsApp's compression; we simply make your media ready for it."* Transparent constraints build long-term user trust.
- **Progressive Disclosure**: Detailed items (Testimonials, Contact form) are isolated into separate tabbed sub-views to keep the main view clean and focused.

## IV. Don Norman's Design Principles

- **Affordances & Signifiers**: Interactive elements use clear visual signifiers:
  - Buttons use high-contrast primary colors with elevations (`shadow-m3-1`).
  - Navigation links use hover highlights and cursor-pointer indications.
- **Tactile Feedback**: Nav links and CTAs translate slightly on hover (`hover:-translate-y-[1px]`) and scale down on press (`active:scale-[0.97]`), giving direct physical feedback to user touch/click events. Duration uses M3 motion tokens (`duration-m3-short-2`).

## V. Layout & Typography Systems

- **Modular Spacing**: Spacing is configured strictly using M3 spacing tokens mapped to CSS variables (e.g. `m3-medium` / `--md-sys-spacing-medium: 1rem` / 16px). All spacing in components uses `p-m3-*`, `gap-m3-*`, `m-m3-*` classes, never raw `p-4`, `gap-6`, etc.
- **Responsive Fluid Typography**: The hero heading size scales smoothly across devices using a CSS `clamp(2rem, 1.5rem + 2.5vw, 2.8125rem)` formula rather than static breakpoints.
- **Dynamic Letter-Spacing**: The letter-spacing dynamically widens on smaller mobile screens using `clamp(-0.8px, calc(0.4px - 0.1vw), 0px)` to maintain readability when text is shrunk, preventing it from feeling squeezed.
- **Rem Units**: All sizes, line heights, and spacings are configured in `rem` units, allowing native browser text scaling and zoom behaviors to function correctly for accessibility.
- **Three-Tier Responsive Type Scale**: All 15 M3 type scale tokens (display, headline, title, body, label, each in large/medium/small) have explicit overrides at 3 viewport stages:
  - **Mobile (< 768px)**: Scaled-down sizes optimized for narrow screens and thumb reach. Display large: 2.75rem, body large: 0.875rem, label large: 0.75rem.
  - **Tablet (768px - 1024px)**: Intermediate sizes for medium screens. Display large: 3rem, body large: 0.9375rem, label large: 0.8125rem.
  - **Desktop (> 1024px)**: Full M3 reference sizes. Display large: 3.5625rem, body large: 1rem, label large: 0.875rem.
  All overrides use CSS custom properties in `styles/m3-tokens.css`, so every Tailwind `text-{role}-{size}` class automatically adapts at each breakpoint without component-level media queries.

## VI. Color & Theme Responsiveness

- **Harmony & Accessibility**: Default colors use Material Design 3 light tokens based on WhatsApp greens (`#25D366` and `#075E54`).
- **System-Adaptive Dark Mode**: Theme follows `@media (prefers-color-scheme: dark)` exclusively, switching automatically with the user's OS/browser setting. No manual toggle, no localStorage override. Desaturated greens (`#61D989`) and surface container variables ensure high-contrast, accessible dark mode.

## VII. Every Screen Must Have a Free Exit (User Control & Freedom)

**Rule:** No screen in the app may trap the user. Every screen must provide a visible, one-tap way to leave it or reverse to the previous screen without performing any action. This implements Nielsen Heuristic #3 (User Control & Freedom) and Shneiderman's Golden Rule #7 (User Control).

- **Marketing pages:** Logo links back to home. "Back to Home" link on every sub-page (about, pricing, how-it-works).
- **Onboarding:** "Home" link in the top-left always visible. "Skip" button to bypass any step. "Back" button in the footer to return to the previous step. No step requires an answer to proceed.
- **Dashboard:** Logo links back to the marketing home page. "Optimize another file" text link after results. "Try Again" on failure. No dead-end states.
- **Results screen:** "Send to WhatsApp" and "Download" are primary/secondary actions, but "Optimize another file" is always present as an exit path. The user is never forced to share or download to leave the screen.
- **Upsell modal:** Dismissible by tapping outside or via "Maybe later." Never blocks the user from returning to the upload flow.
- **Error states:** Always include a "Try Again" or navigation option. Never show an error without a clear next step.

**Psychology basis:** Screens without exits create learned helplessness and anxiety (Seligman 1975). Providing exits increases willingness to explore, because users know they can always return to a known state (Exploration-Exploitation Tradeoff).

## VIII. M3 Token Enforcement Rules

All styling must reference CSS custom properties from `styles/m3-tokens.css` (single
source of truth). No hardcoded values are permitted in component files. This section
codifies the rules enforced across the codebase.

### Spacing
All spacing uses M3 spacing tokens. No raw `p-4`, `gap-6`, `m-2`, etc.

| Token | Value |
|-------|-------|
| `m3-none` | 0 |
| `m3-xx-small` | 2px |
| `m3-x-small` | 4px |
| `m3-small` | 8px |
| `m3-medium` | 16px |
| `m3-large` | 24px |
| `m3-x-large` | 32px |
| `m3-xx-large` | 48px |
| `m3-xxx-large` | 64px |
| `m3-xxxx-large` | 96px |

### Typography Weight
M3 type scale tokens define their own `fontWeight`. Never apply `font-bold` or
`font-semibold` on M3 type token classes (`text-title-*`, `text-headline-*`,
`text-display-*`, `text-body-*`, `text-label-*`, `text-caption`). This overrides
the M3-specified weight and flattens visual hierarchy.

M3 type scale weights:
- display: 400
- headline: 400
- title-large: 400, title-medium: 500, title-small: 500
- body: 400
- label-large: 500, label-medium: 500, label-small: 400

`font-bold` is permitted only on non-type-system decorative elements (avatar
initials, step number badges, file type badges, logo initials). These are small
decorative glyphs where bold weight is a stylistic choice, not a type hierarchy
element.

### Border Radius
All border radius uses M3 shape tokens. No `rounded-full`, `rounded-sm`,
`rounded-lg`, `rounded-xl`, `rounded-2xl`, or raw `rounded-N` values.

| Token | Value |
|-------|-------|
| `rounded-m3-none` | 0 |
| `rounded-m3-xs` | 4px |
| `rounded-m3-sm` | 8px |
| `rounded-m3-md` | 12px |
| `rounded-m3-lg` | 16px |
| `rounded-m3-xl` | 28px |
| `rounded-m3-full` | 9999px |

### Elevation
All box shadows use M3 elevation tokens. No bare `shadow` without suffix.

| Token | Value |
|-------|-------|
| `shadow-m3-0` | none |
| `shadow-m3-1` | 1dp elevation |
| `shadow-m3-2` | 3dp elevation |
| `shadow-m3-3` | 6dp elevation |
| `shadow-m3-4` | 8dp elevation |
| `shadow-m3-5` | 12dp elevation |

### Duration / Motion
All animation durations use M3 motion tokens. No `duration-100`, `duration-200`,
`duration-300`, etc.

| Token | Value |
|-------|-------|
| `duration-m3-short-1` | 50ms |
| `duration-m3-short-2` | 100ms |
| `duration-m3-medium-1` | 250ms |
| `duration-m3-medium-2` | 400ms |
| `duration-m3-medium-3` | 500ms |
| `duration-m3-long-1` | 450ms |
| `duration-m3-long-2` | 500ms |
| `duration-m3-long-3` | 700ms |

### Responsive Type Scale
All 15 M3 type scale tokens (display, headline, title, body, label, each in
large/medium/small) plus caption have explicit overrides at 3 viewport stages:
- **Mobile (< 768px)**: Scaled-down sizes for narrow screens.
- **Tablet (768px - 1024px)**: Intermediate sizes.
- **Desktop (> 1024px)**: Full M3 reference sizes.

Weights are viewport-independent. Font weight does NOT change across viewports.

### What Is NOT a Violation
The following are acceptable uses of non-token values:
- Layout constraints: `max-w-[1200px]`, `min-w-[200px]`, `z-[100]`
- Mockup-specific dimensions: `w-[200px]`, `h-[356px]` in device frame components
- CSS calc expressions: `w-[calc(100%-2rem)]`
- Custom `hero-display-text` class in `globals.css` (700 weight, not an M3 type token)

---

## IX. Share-to-WhatsApp Flow (FR-15)

- **Reduced Tap Count**: The primary post-optimization action is "Send to WhatsApp," reducing the flow from 3 taps (download, open WhatsApp, attach) to 1 tap plus WhatsApp's native confirm.
- **Loss Aversion at the Moment of Value**: The share button appears immediately after the user sees the before/after comparison, anchoring the share action to the moment of highest perceived value (Peak-End Rule).
- **Honest Share Message**: The pre-filled WhatsApp message says "Make your media look sharp on WhatsApp" with the `compr.app` branded link. No claims of bypassing or disabling compression. The link uses the product's own domain, not a URL shortener, to build trust (Trust Anchoring).
- **Secondary Download Option**: "Download to device" is always available below the share button as a secondary action, respecting user control and freedom (Nielsen Heuristic #3) for users who prefer to save locally or share to other platforms.
- **Go Back to Upload**: A tertiary text link "Optimize another file" sits at the bottom, maintaining navigation flow without competing with the primary CTA (Visual Hierarchy).

## X. Overlays: Fixed Positioning Inside Transformed Ancestors (Pitfall + Fix)

**Rule:** Any overlay that uses `position: fixed` (`fixed inset-0`, bottom sheets, drawers, modals) must NOT be nested inside an ancestor that carries a persisted CSS `transform`, `will-change: transform`, `filter`, or `backdrop-filter`.

**Why:** A CSS transform on an ancestor turns that ancestor into the containing block for every `position: fixed` descendant. `inset-0` then sizes the overlay to the ancestor's full box, not the viewport. On a page taller than the viewport, the overlay becomes as tall as the whole page, and content that should sit in the viewport (drawer links, modal body) is pushed far below the fold.

**Concrete failure (fixed in 1.4.0):** The marketing home `<main>` carries `animate-fade-in`, whose keyframe animates `translateY` and persists as `transform: translateY(0)` with `animation-fill-mode: forwards`. The mobile hamburger drawer rendered as a `fixed inset-0` child of that `<main>`, so its `inset-0` covered the entire 3276px page instead of the 844px viewport, placing the drawer links at y≈1500 — invisible to the user. This is subtle because the transform is always-present (final keyframe value), not just during the animation.

**Fix (applied in `app/(marketing)/marketing-client.tsx`):** Render the overlay through a React portal to `document.body`, so its containing block is the viewport again:

```tsx
import { createPortal } from "react-dom";
// ...
{isDrawerOpen && createPortal(<div className="fixed inset-0 z-50 ...">{/* drawer */}</div>, document.body)}
```

**Acceptance check:** When the overlay is open, its bounding rect must equal the viewport (`window.innerWidth × window.innerHeight`), not the page scroll height. On this codebase, verify with `document.querySelector(".fixed.inset-0").getBoundingClientRect()` in the opened state, and confirm drawer links fall inside `window.innerHeight`.

**Alternative considered:** Removing the `animate-fade-in` transform from `<main>` would also fix it, but portals are the more robust fix — any future `transform`/`filter` ancestor (e.g. a page-transition wrapper) re-triggers the bug, whereas `document.body` is never transformed by the app. Keep `animate-fade-in` on `<main>`; portal overlays out of it.
