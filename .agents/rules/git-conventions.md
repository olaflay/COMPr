---
trigger: always_on
---

# Git & Version Control — COMPr

## 1. Branching Strategy

- **`main`**: Always deployable. Protected branch. No direct commits.
- **Feature Branches**: Named `feature/FR-<number>-<short-desc>` (e.g., `feature/FR-7-retry-logic`).
- **Bugfix Branches**: Named `fix/<issue-number>-<short-desc>`.

## 2. Commit Messages (Conventional Commits)

While the code must work regardless of message format, we strongly enforce the **Conventional Commits** standard for auditability:

- `feat:` — New feature (correlates to a PRD FR).
- `fix:` — Bug fix.
- `chore:` — Build/tooling changes.
- `docs:` — Documentation updates.
- `test:` — Adding/fixing tests.
- `refactor:` — Code restructuring with no behavior change.

**Example:** `feat(FR-7): implement quality-triggered resolution drop`

## 3. Pull Requests

- Every PR must reference the specific PRD section(s) or FR number(s) it implements.
- PRs are **incomplete** if `tsc --noEmit`, `eslint`, and the test suite (`node --test`) do not pass.
- PRs must include a brief summary of how the changes were validated (manual or automated).

## 4. CI/CD Checks

The CI pipeline runs automatically on every PR:

1. Install dependencies.
2. Run `tsc --noEmit`.
3. Run ESLint.
4. Run tests (unit + integration).
5. Build the Next.js application.s
