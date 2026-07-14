---
name: platform-limit-validation
description: Use whenever a WhatsApp platform constant is being set, changed, or re-verified — duration ceilings, resolution caps, size ceilings, or anything in config/platform-limits.json or the PlatformLimit table. Triggers on "platform limit," "WhatsApp constant," "duration ceiling," "Milestone 2," or a scheduled re-validation task.
---

# Platform Limit Validation

Teaches the safe sequence for locking or changing a WhatsApp platform
constant, required because these values have changed twice in under two
years and must be periodically re-verified, not treated as static
(PRD §16, §30). Laws live in `workflow-pipeline.md` and PRD §21 (`PlatformLimit`).

## Procedure

1. **Never change a constant from assumption or memory.** Every value
   (duration ceiling, resolution cap, size ceiling) must come from an
   empirical test send — actual Status/Chat sends on current device/OS
   versions — before it's written anywhere (PRD §35 Milestone 2, §16).

2. **Run the empirical test and record the result.** Send real media
   through WhatsApp Status/Chat at the boundary being tested, observe the
   actual behavior (does it split at 90s, does it downscale past 720p,
   does it compress past 16MB), and note the source/date of the test.

3. **Update both sources together, never just one.** The dev/local mirror
   (`config/platform-limits.json`) and the prod-backing table
   (`PlatformLimit` in Postgres) must be updated in the same change. These
   two are documented as mirrors of each other (AGENTS.md Q2, PRD §21) —
   letting them drift apart means dev and prod silently disagree on a
   WhatsApp constant.

4. **Never hardcode the new value anywhere else.** If a change requires
   touching `lib/pipeline.ts`, `lib/resolution.ts`, or any route/component
   logic to reference the new number, that logic should already be reading
   from the config table — if it isn't, that's a separate bug to flag
   (`coding-standards.md`'s magic-number rule), not a reason to hardcode
   the new value inline as a shortcut.

5. **Re-run dependent tests after the constant changes.** Anything testing
   Status-split boundary behavior (89/90/91s pattern from PRD §26), bitrate
   ceiling floors, or resolution-cap logic must be re-run against the new
   value — a stale hardcoded assumption in a test can pass silently while
   the real behavior has moved.

6. **Note the `PlatformLimit.effectiveFrom` timestamp and `notes` field**
   with the source of the change (PRD §21 schema) — this is the audit trail
   for why a constant is what it is, not just what it is.

7. **If this is a scheduled periodic re-validation (not a change), and the
   empirical test confirms the existing value still holds,** record that
   confirmation with a fresh date rather than leaving the last-verified date
   stale — the PRD treats "verified recently" as itself meaningful (PRD §16,
   §30, §35 Milestone 12's pre-launch re-validation).

## Code skeleton

```json
// config/platform-limits.json — dev/local mirror, updated together with the DB table
{
  "STATUS": {
    "maxDurationSec": 90,
    "maxResolutionW": 1280,
    "maxResolutionH": 720,
    "maxSizeMB": 16,
    "verifiedAt": "2026-07-14",
    "source": "manual test send, Android 14, WhatsApp v2.26.x"
  }
}
```

```typescript
// scripts/update-platform-limit.ts — the only correct way to change a constant
async function updatePlatformLimit(preset: PresetType, newValues: PlatformLimitUpdate, source: string) {
  // 3. Both sources updated together, in one operation
  await prisma.platformLimit.create({
    data: {
      preset,
      ...newValues,
      effectiveFrom: new Date(),
      notes: `Empirically verified: ${source}`,
    },
  });
  await writeConfigMirror('config/platform-limits.json', preset, newValues); // dev mirror kept in sync
}
```

## Traps

- Changing a constant based on a forum post, an old assumption, or "I think
  it's still 90s" instead of a fresh empirical test.
- Updating `config/platform-limits.json` but forgetting the `PlatformLimit`
  table (or vice versa) — dev and prod silently disagree.
- Hardcoding the new number directly into `lib/pipeline.ts` as a quick fix
  instead of routing it through the config table.
- Changing the constant without re-running the boundary tests (89/90/91s
  pattern) — a stale test can mask that the split logic no longer matches
  the new ceiling.
- Skipping the `notes`/source field — leaves no audit trail for why the
  number is what it is, which matters given how often WhatsApp changes it.

## Verify before done

- [ ] The new value traces to an actual empirical test, not assumption.
- [ ] `config/platform-limits.json` and `PlatformLimit` were updated together.
- [ ] No code path hardcodes the new value outside the config table.
- [ ] Dependent boundary tests (e.g. 89/90/91s split logic) were re-run against the new value.
- [ ] `PlatformLimit.notes`/source is recorded for the change.
- **Tests to write:** a boundary test at the new ceiling ±1 unit (seconds/px/MB) confirming split/cap logic responds correctly, and a config-consistency test asserting the JSON mirror and DB table agree.
