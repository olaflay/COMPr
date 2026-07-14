---
name: ui-component-builder
description: Use for anything a user sees — React components, screens, styling, or design-system work. Covers Material 3 token discipline, Apple-native information-architecture scoping, WCAG 2.1 AA and mid-range-Android performance constraints, and the mandatory visual before/after comparison.
---

# UI Component Builder

Teaches how to build a screen or component so it matches COMPr's locked
visual system and doesn't violate its accessibility/performance floor.
Laws live in `coding-standards.md`, `copy-and-claims.md`, and PRD §10, §12.

## Procedure

1. **Confirm this is styling/IA, not a components swap.** Material 3 (M3)
   governs structural components and visual styling — buttons, sheets,
   elevation, shape, motion curves, color tokens — followed as specified,
   not diluted. Apple-native simplicity is scoped only to information
   architecture: one primary decision per screen, minimal screen count,
   restrained copy, no nested menus. Don't flatten M3 elevation/component
   style in the name of "simplicity" (PRD §12).

2. **Reach for an existing token before hardcoding a value.** Color, spacing,
   elevation, and shape values come from the M3 token system, with the
   WhatsApp-family accent applied within it (`#25D366`/`#075E54`, flagged
   ASSUMPTION in PRD §12 — treat as provisional, not free to change without
   flagging). If a token doesn't exist for what you need, that's a signal to
   check with the design system before inventing a raw hex/px value.

3. **Zero jargon check.** No "bitrate," "codec," or "resolution" in
   user-facing copy inside the component (PRD §12, `copy-and-claims.md`).
   These stay internal unless building the post-MVP Advanced section.

4. **Trust-signal copy stays literal.** If the component is near the upload
   flow, the microcopy about deletion/no-auto-post must match the actual
   retention window and actual behavior — don't round it up or soften it
   (PRD §12, `copy-and-claims.md`).

5. **If building the download/result screen, the before/after comparison is
   mandatory, not optional.** A size number alone never satisfies FR-9 — the
   component must render a visual frame comparison (side-by-side or slider)
   alongside the size numbers.

6. **If building the progress indicator, wire it to `lib/progress-stages.ts`
   output, not raw compute-time.** The display is front-loaded early and
   switches to a step-countdown near completion (FR-8) — this logic lives
   in `/lib`; the component only renders what it's given, it doesn't
   recompute the mapping itself.

7. **Check the accessibility and performance floor before finishing.**
   WCAG 2.1 AA applies to core flows (upload, progress, download). The
   frontend must be usable and performant on mid-range Android over 3G/4G,
   and the PWA must remain installable and pass a Lighthouse PWA audit
   (PRD §10). Don't add a heavy asset or a blocking script that would
   regress this without flagging it.

## Code skeleton

```tsx
// components/BeforeAfterComparison.tsx
export function BeforeAfterComparison({ sourceFrameUrl, outputFrameUrl, sizeBefore, sizeAfter }: Props) {
  return (
    // M3 elevation/shape tokens, not raw box-shadow/border-radius values
    <div className="m3-surface m3-elevation-1 rounded-m3-lg p-4">
      {/* FR-9: visual comparison is mandatory, size number is not enough */}
      <FrameSlider before={sourceFrameUrl} after={outputFrameUrl} />
      <p className="text-m3-body-medium">
        {formatSize(sizeBefore)} → {formatSize(sizeAfter)}
      </p>
    </div>
  );
}
```

```tsx
// components/ProgressIndicator.tsx
export function ProgressIndicator({ stage }: { stage: JobStage }) {
  // Mapping lives in lib/progress-stages.ts — component renders it, doesn't compute it
  const { displayPercent, stepsRemaining } = mapStageToProgress(stage);
  return stepsRemaining <= 1
    ? <StepCountdown remaining={stepsRemaining} />   // goal-gradient finish
    : <ProgressBar percent={displayPercent} />;
}
```

## Traps

- Hardcoding a hex color or px value instead of using an M3 token — drifts
  the design system one component at a time.
- Flattening M3 elevation/shape "for a cleaner look" — conflates the IA
  simplicity principle with a styling principle it was never meant to touch.
- Shipping the download screen with only a size number, skipping the visual
  frame comparison — silently fails FR-9's acceptance criterion.
- Recomputing progress-percentage logic inside the component instead of
  consuming `lib/progress-stages.ts` — creates two sources of truth for the
  same goal-gradient behavior.
- Using "bitrate"/"codec"/"resolution" in a tooltip or helper string because
  it "helps power users" — not allowed outside the Advanced section.

## Verify before done

- [ ] No raw hex/px value introduced where an M3 token exists for it.
- [ ] IA changes didn't dilute M3 component/elevation styling.
- [ ] Download/result screens include both size and visual frame comparison.
- [ ] Progress display consumes `lib/progress-stages.ts` output, doesn't recompute it.
- [ ] No new user-facing jargon (bitrate/codec/resolution) introduced.
- [ ] Component still meets WCAG 2.1 AA for any core flow it's part of.
- **Tests to write:** a render test confirming the before/after component never renders with only a size prop and no frame URLs, and a snapshot/unit test for the stage→progress mapping consumed by the progress component (test belongs in `lib`, per `coding-standards.md`).
