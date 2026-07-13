
# skills/ui-component-builder.md

```yaml
---
name: UI Component Builder
description: |
  Trigger on anything a user sees: components, screens, styling, or the 
  design system. Teaches semantic-token discipline, the gap-filling procedure 
  for missing tokens, flag rendering that is visible and not color-only, and 
  the 360px accessibility floor.
---

This skill provides the workflow for building React components using Next.js 
and Tailwind CSS. It enforces the Material 3 design tokens, the WhatsApp 
accent colors, and the accessibility requirements. Its laws live in 
`AGENTS.md` (UX principles) and PRD §12.

## Procedure

1. **Apply the Material 3 semantic tokens.**
   Use M3 color roles (`primary`, `onPrimary`, `surface`, `error`) instead of 
   hex codes. Define them in `tailwind.config.js` using CSS variables.

2. **Apply the WhatsApp teal accent.**
   Set the primary token to `#25D366` and the deep accent to `#075E54`. 
   These override the default M3 primary. (PRD §12)

3. **Build with mobile‑first responsiveness.**
   Use Tailwind's `sm:` and `md:` breakpoints. Ensure the component fits 
   within a 360px viewport. (PRD §10)

4. **Implement the goal‑gradient progress display.**
   Use `cumulativeDisplayPercent` and `stepsRemaining` from 
   `lib/progress-stages.ts`. Do not use raw compute‑time percentages. 
   (PRD FR-8)

5. **Render accessibility flags.**
   For any status (e.g., premium badge, error state), use an icon + text, 
   never color alone. Ensure contrast ratio ≥ 4.5:1. (PRD §10)

6. **Handle gap‑filling for missing tokens.**
   If a component uses a design token not defined in the theme, define it 
   in the theme file first. Never hardcode a missing color or spacing value.

7. **Wire the smart‑default chip.**
   After file analysis, the preset is pre-selected client-side via the 
   smart-defaults heuristic (`lib/smart-defaults.ts`'s `suggestPreset`). 
   Display as a pre-selected chip with one-tap override. No separate API 
   endpoint is needed — the heuristic runs on file metadata (aspect ratio, 
   duration, size) available client-side after upload. (PRD FR-2)

## Code Skeleton (key patterns)

```tsx
// components/PresetSelector.tsx
import { useState, useEffect } from 'react';
import { suggestPreset } from '../lib/smart-defaults';

// Chip component — a selectable pill button for preset choice.
// Uses M3 shape (extra-small corner) and elevation tokens.
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'
      }`}
    >
      {label}
    </button>
  );
}

export function PresetSelector({ fileInfo }: { fileInfo: { width: number; height: number; duration?: number; sizeBytes: number } }) {
  const [selected, setSelected] = useState<'STATUS' | 'CHAT' | 'CUSTOM'>('CHAT');
  const suggested = suggestPreset(fileInfo);

  useEffect(() => {
    if (suggested) setSelected(suggested);
  }, [suggested]);

  return (
    <div className="flex gap-2">
      <Chip 
        label="Status" 
        active={selected === 'STATUS'}
        onClick={() => setSelected('STATUS')}
      />
      <Chip 
        label="Chat" 
        active={selected === 'CHAT'}
        onClick={() => setSelected('CHAT')}
      />
      <Chip 
        label="Custom Size" 
        active={selected === 'CUSTOM'}
        onClick={() => setSelected('CUSTOM')}
      />
    </div>
  );
}
