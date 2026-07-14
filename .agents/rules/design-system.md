---
trigger: glob
---

# Design System — COMPr

## 1. Single Source of Truth

- The file `styles/m3-tokens.css` (containing the complete M3 color, typography, shape, elevation, and motion variables) is the **single source of truth** for all visual styling.
- Tailwind CSS is the utility framework, but it is configured to reference M3 CSS custom properties — Tailwind classes must map to `--md-sys-color-*`, `--md-sys-typescale-*`, etc., never to hardcoded values.
- **Never** hardcode hex values (`#075E54`), raw font sizes (`32px`), or arbitrary radii (`12px`) directly in component files, Tailwind config overrides, or inline styles.
- All styling must reference the CSS custom properties defined in `styles/m3-tokens.css`. This ensures theming consistency, maintainability, and future support for dark mode.

## 2. The Gap-Filling Procedure for Missing Tokens

- If a designer or a requirement demands a color, size, or shape **not** present in the current M3 token set (e.g., a "warning" yellow or a specific spacing value):
  1. **STOP**. Do not use a hardcoded value.
  2. **Define** the new token in `styles/m3-tokens.css` using the correct M3 semantic structure (e.g., `--md-sys-color-warning: #F9A825;`).
  3. **Map** it to the Tailwind theme in `tailwind.config.js` if the component will use Tailwind classes.
  4. **Commit** the token file changes **before** writing the component's styles.
- This prevents "style debt" where the design system drifts from the actual codebase.

## 3. Color Enforcement

- Use semantic color roles, not literal colors.
  - **Correct:** `bg-primary`, `text-on-surface`, `border-outline`.
  - **Incorrect:** `bg-[#1DA851]`, `text-[#1A1C19]`.
- State changes (hover, press, drag) must use the M3 state layer system (opacity overlays) or the correct container variants (e.g., `surface-container-high` for hovered cards).
- **Accessibility Constraint (Contrast):** All color combinations must meet WCAG 2.1 AA contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text). Use `on-surface` for text on `surface`, `on-primary` for text on `primary`.

## 4. Typography Enforcement

- Do not use "magic" font sizes. Every text style must map to one of the 15 M3 type scale tokens.
  - **Correct:** `class="text-title-large"` or `style="font: var(--md-sys-typescale-title-large)"`.
  - **Incorrect:** `class="text-[22px] font-medium"`.
- The accepted font family is **Roboto** (as defined in the `--md-ref-typeface-brand` variable). No other fonts may be loaded or used without explicit design approval.

## 5. Shape & Elevation Enforcement

- **Shape:** Corners must use the `--md-sys-shape-corner-*` tokens.
  - Use `extra-small` for tags/chips, `medium` for cards/buttons, `large` for FABs, `full` for pills/avatars.
- **Elevation:** Do not write custom box-shadows. Use the `--md-sys-elevation-level-*` tokens.
  - Level 0: Static content.
  - Level 1: Hover states.
  - Level 2: Active/Focus interactive components.
  - Level 3: Dragging elements.
  - Level 4: Modals/Dialogs.
  - Level 5: Navigation drawers / Bottom sheets.

## 6. Motion (Animation & Transition)

- Use the M3 duration and easing tokens for all UI animations.
  - **Standard UI:** `var(--md-ref-motion-duration-medium-1)` and `var(--md-ref-motion-easing-standard)`.
  - **Emphasized (Hero):** `var(--md-ref-motion-duration-long-1)` and `var(--md-ref-motion-easing-emphasized)`.
  - **Micro-interactions (fades):** `var(--md-ref-motion-duration-short-2)` and `var(--md-ref-motion-easing-linear)`.
- Never use CSS `ease-in-out` or arbitrary `0.3s` durations unless they map directly to these tokens.

## 7. Mobile-First & Accessibility Floor

- **Viewport:** All components must fit and function on a **360px wide** viewport (the minimum supported mobile width). Test every new UI at this breakpoint.
- **Non-Color Indicators:** Status, errors, and flags (e.g., "Premium", "Failed") must include an **icon or text label** in addition to color. Do not rely on color alone to convey meaning (PRD §10, Accessibility).
- **Touch Targets:** Minimum touch target size is **44x44 dp**. This is explicitly enforced by M3 component tokens.

## 8. Design QA Checklist

Before any UI feature is marked "Done", verify:

- [ ] No hardcoded hex values, pixel font sizes, or raw box-shadows exist in the component's JSX or CSS.
- [ ] All colors map to `--md-sys-color-*` tokens.
- [ ] All fonts map to `--md-sys-typescale-*` tokens.
- [ ] All corners use `--md-sys-shape-corner-*` tokens.
- [ ] All shadows use `--md-sys-elevation-level-*` tokens.
- [ ] The component passes a Lighthouse accessibility audit (Contrast, ARIA, touch targets).
- [ ] The component renders without horizontal overflow at 360px viewport width.
- [ ] Any new token was first added to `styles/m3-tokens.css` and approved via PR.

**Violating this rule means the UI fails the PRD's acceptance criteria for visual consistency and accessibility. The task is incomplete until these tokens are used.**
