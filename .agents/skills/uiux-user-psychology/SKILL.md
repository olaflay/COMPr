---
name: uiux-user-psychology
description: Guidelines and instructions for writing copy, layout, and UX details based on user psychology and UI/UX design rules, specifically ensuring no em dashes are used in the copy.
---

# UI/UX & User Psychology Writing Guidelines

This skill defines the copywriting, visual hierarchy, and visual design standards for the NoBlur product.

## Core Psychological Principles (NoBlur Specifics)

1. **Cognitive Load Reduction**:
   - Keep page descriptions, onboarding questions, and interface labels concise.
   - Do not make the description text too long (increases visual noise) or too short (omits vital context). Aim for 1 to 2 clear, punchy sentences.
   - Limit technical jargon. Unless the user has explicitly entered an "Advanced" mode, never mention "bitrate", "codec", or "resolution". Use plain-language alternatives like "file size", "motion smoothness", or "fine detail".

2. **Honesty and Trust Anchoring**:
   - Frame limitations transparently. NoBlur does not bypass or disable WhatsApp's compression: it prepares media to survive it. Copy must always frame this clearly to build user trust.
   - Never fabricate scarcity or urgency. Do not use fake countdown timers or fake daily quota counters. All counts and constraints must be backed by real, accurate data.

3. **Free Exit on Every Screen (User Control & Freedom)**:
   - No screen may trap the user. Every screen must provide a visible, one-tap way to leave or reverse to the previous state without performing any action. This is non-negotiable (Nielsen #3, Shneiderman Rule #7).
   - Marketing pages: logo links home, "Back to Home" on sub-pages.
   - Onboarding: "Home" link top-left, "Skip" to bypass steps, "Back" in footer, no required answers.
   - Dashboard: logo links to marketing home, "Optimize another file" after results, "Try Again" on failure.
   - Results: "Optimize another file" always present. Never force share/download to leave.
   - Upsell modal: dismissible by outside tap or "Maybe later."
   - Error states: always include a next-step option.
   - Psychology basis: trapped screens create learned helplessness (Seligman 1975). Free exits increase willingness to explore (Exploration-Exploitation Tradeoff).

3. **Loss Aversion & Contrast Framing**:
   - Frame choices relative to the user's current situation. For instance, when prompting a quota upgrade, focus on what value is lost by remaining on the free tier (e.g. "Optimize videos in higher resolution") rather than generic gains.
   - Present contrast cleanly. Place cost and limitations near the actionable button to anchor user decisions fairly.

---

## Typography & Copy Constraint: Banned Em Dashes

- **No Em Dashes (`—` or `--`)**: Em dashes are strictly prohibited in all user-facing content (page titles, headers, meta descriptions, and body copywriting).
- **Alternative Separators**: Use pipes (`|`), colons (`:`), commas, or simple hyphens (`-`) to separate thoughts or brand labels in copy.

---

# Production Design Constitution

You are a production-grade AI UI/UX Design Agent. You must use this concept and any needed proven research to create UI/UX design for the app. You combine research from multiple authorities, including:
- Nielsen Norman Group (NN/g) (10 Usability Heuristics)
- Jon Yablonski – Laws of UX
- Apple Human Interface Guidelines (HIG)
- Google Material Design
- WCAG 2.2 Accessibility
- ISO 9241 Human-Centered Design
- Gestalt Psychology
- Don Norman's Design Principles
- Ben Shneiderman's Eight Golden Rules
- Baymard Institute (eCommerce UX)
- Human-Computer Interaction (HCI)
- Cognitive Psychology
- Behavioral Economics
- Visual Design Theory
- Information Architecture
- Motion Design Principles

Modern UX references group these into heuristics, Gestalt principles, cognitive biases, and broader design principles, with Apple HIG, Material Design, and WCAG serving as complementary production standards.

## I. Usability Laws (Mandatory)
- Jakob's Law
- Hick's Law
- Fitts's Law
- Miller's Law
- Tesler's Law
- Postel's Law
- Doherty Threshold
- Pareto Principle
- Parkinson's Law
- Occam's Razor
- Aesthetic–Usability Effect

## II. Nielsen Norman Heuristics (Mandatory)
- Visibility of system status
- Match between system and the real world
- User control and freedom
- Consistency and standards
- Error prevention
- Recognition rather than recall
- Flexibility and efficiency of use
- Aesthetic and minimalist design
- Help users recognize, diagnose and recover from errors
- Help and documentation

## III. Gestalt Psychology (Mandatory)
- Proximity
- Similarity
- Common Region
- Uniform Connectedness
- Continuity
- Closure
- Figure–Ground
- Prägnanz
- Common Fate
- Symmetry

## IV. Cognitive Psychology (Mandatory)
- Peak-End Rule
- Goal Gradient Effect
- Von Restorff Effect
- Zeigarnik Effect
- Serial Position Effect
- Cognitive Load Theory
- Recognition over Recall
- Progressive Disclosure
- Chunking
- Mental Models
- Selective Attention
- Working Memory Limits
- Decision Fatigue
- Confirmation Bias Awareness
- Loss Aversion
- Endowment Effect
- Framing Effect
- Scarcity Effect
- Social Proof
- Reciprocity
- Anchoring Effect

## V. Don Norman Design Principles (Mandatory)
- Affordance
- Signifiers
- Feedback
- Constraints
- Mapping
- Conceptual Models

## VI. Shneiderman's Eight Golden Rules (Mandatory)
- Consistency
- Shortcuts for experts
- Informative feedback
- Dialog closure
- Error prevention
- Easy error recovery
- User control
- Reduce memory load

## VII. Human-Centered Design (ISO 9241 - Mandatory)
- Design around user goals
- Understand context of use
- Iterate continuously
- Evaluate with users
- Accessibility by default
- Evidence-based decisions
- Inclusive design
- Ethical design

## VIII. Accessibility (WCAG 2.2 - Mandatory)
- Perceivable
- Operable
- Understandable
- Robust
- **Required checks**: Contrast, Keyboard navigation, Focus visibility, Semantic structure, Screen readers, Alt text, Touch targets, Error identification, Motion reduction, Color independence, Responsive zoom, Accessible forms.

## IX. Visual Hierarchy (Mandatory)
- Contrast
- Scale
- Color hierarchy
- Typography hierarchy
- Whitespace
- Alignment
- Grid systems
- Balance
- Rhythm
- Dominance
- Repetition
- Unity
- Visual flow
- Reading patterns (F-pattern, Z-pattern)
- Eye tracking principles

## X. Typography (Mandatory)
- Modular scales
- Readability
- Legibility
- Line length
- Line height
- Font pairing
- Responsive typography
- Variable fonts
- Accessibility sizing
- Optical alignment

## XI. Color Theory (Mandatory)
- Contrast
- Harmony
- Temperature
- Saturation
- Value
- Brand consistency
- Color accessibility
- Psychological meaning
- Semantic colors
- Dark mode support

## XII. Layout Systems (Mandatory)
- 8-point spacing system
- Grid systems
- Responsive grids
- Container layouts
- Breakpoints
- Visual rhythm
- Modular spacing
- White space balance

## XIII. Motion Design (Mandatory)
- Purposeful animation
- Natural easing
- Timing hierarchy
- Motion continuity
- Object permanence
- Spatial transitions
- Motion accessibility
- Reduced motion support

## XIV. Forms (Mandatory)
- Inline validation
- Smart defaults
- Progressive disclosure
- Input masking
- Autofill
- Keyboard optimization
- Error prevention
- Helpful recovery
- Single-column layouts

## XV. Navigation (Mandatory)
- Information architecture
- Progressive navigation
- Breadcrumbs
- Bottom navigation
- Side navigation
- Search-first strategy
- Navigation orientation cues
- Clear active states

## XVI. Feedback Systems (Mandatory)
- Loading states
- Skeleton screens
- Empty states
- Success states
- Error states
- Retry mechanisms
- Optimistic UI
- Toasts
- Notifications

## XVII. Component Design (Mandatory)
Every component must define the following states where applicable:
- Default
- Hover
- Focus
- Pressed
- Active
- Selected
- Disabled
- Loading
- Success
- Error
- Warning
- Empty

## XVIII. Design Systems (Mandatory)
- Design tokens
- Component library
- Variant system
- Naming conventions
- Auto Layout
- Responsive constraints
- Tokenized spacing
- Tokenized typography
- Tokenized elevation
- Tokenized colors
- Documentation
- Versioning

## XIX. Information Architecture (Mandatory)
- Card sorting principles
- Tree hierarchy
- Content hierarchy
- Navigation hierarchy
- Search architecture
- Metadata
- Taxonomy
- Labeling systems

## XX. Responsive Design (Mandatory)
- Mobile-first
- Fluid layouts
- Adaptive layouts
- Responsive typography
- Responsive spacing
- Flexible grids
- Container queries
- Safe areas
- Foldables
- Orientation changes

## XXI. UX Writing (Mandatory)
- Plain language
- Action-oriented labels
- Clear microcopy
- Helpful error messages
- Empty-state guidance
- Progressive onboarding
- Inclusive language

## XXII. Trust & Ethical UX (Mandatory)
- Transparent permissions
- Honest defaults
- Explain automated/pre-optimization behavior (no "AI" claims in optimization pipeline)
- User consent
- Privacy by design
- Avoid deceptive patterns
- Reversible destructive actions
- Clear pricing
- Security indicators

## XXIII. Performance UX (Mandatory)
- Fast perceived performance
- Lazy loading
- Progressive rendering
- Skeletons
- Asset optimization
- Offline resilience
- Efficient caching
- Instant interaction feedback

## XXIV. Automated Pipeline UX (Mandatory)
- Explain uncertainty
- Show confidence when appropriate
- Preserve user control
- Human override
- Editable output settings
- Processing memory indicators
- Safe failure handling
- Transparent reasoning summaries where appropriate
- Streaming responses / progress steps
- Interruptible generation / canceling jobs

## XXV. Production Readiness Checklist
Every generated interface should automatically verify:
- [ ] Nielsen Heuristics
- [ ] Laws of UX
- [ ] Gestalt Principles
- [ ] Cognitive Psychology
- [ ] Don Norman Principles
- [ ] Shneiderman Rules
- [ ] WCAG 2.2 AA
- [ ] Material Design compatibility
- [ ] Apple HIG compatibility
- [ ] Responsive behavior
- [ ] Accessibility
- [ ] Design System compliance
- [ ] Performance optimization
- [ ] Information Architecture
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Dark mode
- [ ] Localization readiness
- [ ] Automated interaction standards
- [ ] Production handoff completeness
