---
name: growth-and-quota-engine
description: Use for anything in lib/growth-ux.ts or lib/progress-stages.ts — quota/reciprocity decisions, upsell copy assembly, onboarding preference application, or the goal-gradient progress percentage mapping. Triggers on "quota," "reciprocity," "upsell," "onboarding," "progress indicator," "goal gradient."
---

# Growth and Quota Engine

Teaches the decision order for quota/reciprocity logic and the assembly
order for behavioral-UX copy and progress display, so the six named
patterns in PRD §38 stay both correct and honest. Laws live in
`copy-and-claims.md`, `workflow-pipeline.md`, and PRD FR-8, FR-11, FR-12, FR-13.

## Procedure

1. **Resolve the first-job exemption before any quota check runs.**
   `isFirstJobExemptFromQuota` (FR-11) is checked first, at the database
   level (keyed by fingerprint, not browser session, per PRD §26's
   cleared-cookies edge case) — never the other way around. A first job
   always completes and shows the full before/after comparison regardless
   of remaining quota.

2. **Only after the exemption check, evaluate remaining quota.** If quota
   is exhausted and this isn't an exempt first job, this is the point where
   the upsell path begins (step 4) — never before.

3. **For the progress indicator, map true job stage to a display value —
   don't invent a fake percentage.** `lib/progress-stages.ts` takes the real
   server-tracked stage (`queued → analyzing → encoding → verifying → done`)
   and produces a front-loaded display percentage for early stages, then
   switches to a step-countdown ("1 step left") near completion (FR-8). The
   underlying job state stays truthfully tracked server-side at all times —
   only the *display* is front-loaded, never the actual status reported by
   `GET /jobs/:jobId`.

4. **For upsell copy, gather real data before assembling any copy.**
   `buildUpsellCopy` needs actual numbers first — actual jobs blocked,
   actual price — never a placeholder (FR-12, `copy-and-claims.md`). If the
   real number needed isn't available (e.g. price point still open per PRD
   §32), stop and flag it rather than filling in a fake number.

5. **Assemble the upsell copy in this order: cost-of-staying-free first,
   subscription price second.** This is the contrast-effect requirement
   (FR-12) — the price must be judged against the cost line, so the cost
   line is built and rendered first, not appended after the price.

6. **Onboarding preferences are applied only after being explicitly
   answered or explicitly skipped — never assumed.** `ONBOARDING_QUESTIONS`
   are optional and never gate functionality (FR-13). If unanswered,
   `applyOnboardingPreferences` falls back to a neutral default, it doesn't
   guess an answer.

7. **Never fabricate a number anywhere in this file's output.** Every
   pattern here (reciprocity, loss aversion, contrast, IKEA, goal gradient)
   is required to be built from real, specific data — this is a hard
   constraint per PRD §30, §38's guardrail, not a style choice.

## Code skeleton

```typescript
// lib/growth-ux.ts
function isFirstJobExemptFromQuota(fingerprintHash: string): Promise<boolean> {
  // 1. Exemption resolved BEFORE any quota check — DB-level, not session-level
  return checkFirstJobFlag(fingerprintHash); // PRD §26: survives cleared cookies
}

async function resolveJobEligibility(fingerprintHash: string) {
  const isExempt = await isFirstJobExemptFromQuota(fingerprintHash); // 1
  if (isExempt) return { allowed: true, exempt: true };

  const usage = await getUsage(fingerprintHash); // 2. only checked after exemption
  return { allowed: usage.jobsRemainingToday > 0, exempt: false };
}

function buildUpsellCopy(realData: { jobsBlockedToday: number }) {
  // 4. real data required, never a placeholder
  // Note: price is a Phase 2 concern (PRD §27, §32). In Phase 1, upsell copy
  // focuses on loss-aversion framing (cost of staying free) without a price line.
  // When Phase 2 pricing is locked, add priceNaira/priceLine here.

  // 5. cost line built and returned
  const costLine = `You've hit today's free limit after ${realData.jobsBlockedToday} jobs — further sends today will use unoptimized quality.`;
  return { costLine }; // Phase 2: add priceLine after costLine for contrast effect
}
```

```typescript
// lib/progress-stages.ts
function mapStageToDisplay(trueStage: JobStatus): { displayPercent: number; stepsRemaining: number } {
  // 3. Display is front-loaded; trueStage (server-tracked) is never altered
  const FRONT_LOADED_MAP = { QUEUED: 5, ANALYZING: 40, ENCODING: 70, VERIFYING: 90, DONE: 100 };
  const stepsRemaining = STAGE_ORDER.length - STAGE_ORDER.indexOf(trueStage);
  return { displayPercent: FRONT_LOADED_MAP[trueStage], stepsRemaining };
}
```

## Traps

- Checking quota before checking the first-job exemption — blocks the
  guaranteed first job FR-11 exists to protect.
- Making the exemption check session/cookie-based instead of database/fingerprint-based — trivially defeated by clearing cookies (PRD §26 names this explicitly).
- Altering the actual server-tracked `Job.status` to make the progress bar
  look better — the front-loading is display-only; the real state must stay
  truthful (FR-8).
- Rendering the subscription price before the cost-of-staying-free line —
  inverts the contrast-effect requirement.
- Filling in a placeholder number for price or jobs-blocked when the real
  value isn't available yet, instead of flagging the gap.

## Verify before done

- [ ] Exemption check runs and resolves before any quota-block check.
- [ ] Exemption is keyed by fingerprint hash at the DB level, not session/cookie.
- [ ] Progress display logic never mutates the true `Job.status` value.
- [ ] Upsell copy renders cost-of-staying-free before price, using only real data.
- [ ] No placeholder/fabricated number appears in any growth-ux output.
- **Tests to write:** a test asserting a first job proceeds at zero remaining quota, a test asserting `buildUpsellCopy` throws/flags rather than fabricating a missing price, and a test asserting the cost line precedes the price line in the returned copy object.
