---
trigger: always_on
---


Kept deliberately short. This file only contains rules where breaking them
causes real harm (a leak, an unauditable change) — not commit-message taste.

## Never commit

- `.env` files, R2 credentials, Redis connection strings, Flutterwave API
  keys/webhook secrets, or any value that belongs in `process.env`.
- Real uploaded media, test fixtures containing personal data, or database
  dumps.
- If a secret is accidentally staged, stop and flag it — do not commit and
  "fix it in a follow-up."

## Traceability for high-risk changes

- Any commit touching the deletion path (`cleanup-cron.ts`,
  `MediaFile.deletedAt`), the quota/reciprocity logic (`growth-ux.ts`,
  `UsageRecord`), or billing code (once Phase 2 starts) references the
  relevant PRD section or FR number in the commit message or PR description.
  These are the paths where "what changed and why" must be greppable later
  without re-reading the diff.
- A PR that changes a WhatsApp platform constant states where the new value
  came from (empirical test, PRD update) — never a silent number change.

## Commits and branches (convention, not a hard gate)

- Branch names: `feature/…`, `fix/…`, `chore/…`.
- Commit subject line states the change in imperative mood, PRD/FR reference
  in the body when applicable. This is a convention for readability — it
  does not by itself make a task pass or fail.

## PR size

- Prefer PRs scoped to one PRD requirement or one `/lib` module at a time.
  A PR that touches upload, pipeline, and billing simultaneously is a sign
  scope crept beyond the assigned task — split it or flag it.
