---
trigger: always_on
---

# Coding Standards — COMPr

## 1. Language & Strictness

- **TypeScript Strict Mode** is enforced. `tsc --noEmit` must pass without errors.
- **No `any`** unless absolutely required (e.g., third-party library inference gaps). Always prefer `unknown` and narrow with type guards.
- **No `@ts-ignore`** without a one-line comment explaining why the type system cannot satisfy the requirement.

## 2. Architectural Separation (The Golden Rule)

- **`/lib`** contains framework-agnostic, pure business logic. **It MUST NOT import from `/server` or `/workers`.**
- **`/server/routes`** are the thin HTTP layer. Route handlers MUST NOT contain FFmpeg calls, bitrate math, or Prisma queries inline. They call into `/lib` and the Prisma client only.
- **`/workers`** MUST NOT parse raw HTTP requests. They react only via BullMQ job data.

## 3. Function & File Structure

- **Pure Functions:** Functions in `/lib` must be named for what they compute (e.g., `calculateBitrate`, `dropOneResolutionTier`). Avoid generic names like `process` or `handle`.
- **File Size Limit:** No file in `/lib` should exceed **200 lines**. If it grows beyond, split responsibilities. If a valid technical reason requires exceeding 200 lines, justify it with a comment at the top of the file.
- **Single Responsibility:** Each function should do one thing. Functions should be small and testable.

## 4. Naming Conventions

- **Variables/Functions:** `camelCase` (e.g., `targetSizeMB`).
- **Classes/Components:** `PascalCase` (e.g., `JobStatus`, `UploadComponent`).
- **Environment Variables:** `UPPER_SNAKE_CASE`.
- **Exports:** Prefer named exports over default exports for clarity in imports.

## 5. Comments

- Comments explain **why** (business logic, PRD assumptions), not **what** (the code already shows that).
- Reference the PRD section number in comments for non-obvious constants (e.g., `// PRD §14 — 8% mux overhead margin`).

## 6. Linting & Formatting

- Prettier and ESLint are configured. Run `eslint . --fix` and `prettier --write .` before committing.
- CI pipeline MUST reject code that fails linting.

## 7. Secrets & Environment

- Never hardcode secrets. Read from `process.env` only.
- Validate required environment variables at application boot (fail-fast). Never log environment variables.
