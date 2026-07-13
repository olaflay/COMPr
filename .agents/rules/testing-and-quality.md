---
trigger: always_on
---

# Testing & Quality Assurance — COMPr

## 1. Unit Test Coverage

- **Mirror structure:** Every file in `/lib` must have a corresponding test file in `/tests` (e.g., `bitrate.js` ➔ `bitrate.test.js`).
- **Every exported function** in `/lib` MUST have at least one passing unit test that covers its core behavior.
- Tests must be runnable using Node.js native test runner (`node --test`).

## 2. Pipeline Validation

- The `runPipeline` function must be tested against a known, small generated test clip (e.g., 1080p/10s) to verify:
  1. SSIM measurement works.
  2. Size retry triggers correctly.
  3. Quality retry drops resolution correctly.
  4. Max 2 retries are enforced.

## 3. Mocking External Services

- Unit tests MUST NOT require live Cloudflare R2, Redis, or Postgres.
- Mock these services (e.g., using `sinon` or `jest` mocks) to test business logic in isolation.
- Integration tests (using testcontainers or ephemeral DBs) are encouraged but separate from the unit test run.

## 4. "Done" Checklist Criteria

A task is **not complete** unless:

- [ ] `tsc --noEmit` passes.
- [ ] `eslint` passes with 0 errors.
- [ ] The test suite passes with 0 failures.
- [ ] New logic in `/lib` has corresponding tests.
- [ ] No Phase 2/3 features were accidentally introduced.
