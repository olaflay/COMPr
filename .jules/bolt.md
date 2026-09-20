## 2024-05-24 - Missing Index on Job Intake Rate-Limit Query
**Learning:** The fallback IP-based rate limiter in `job-intake.ts` runs a `count` query on `Job` filtered by `ipHash` and `createdAt`. This table lacks an index for those fields, meaning every new job triggers a full table scan.
**Action:** Always add compound indexes for fields used heavily in high-frequency aggregation/count queries (like rate limiters) to prevent O(N) database scaling bottlenecks.
## 2024-05-24 - Prisma `.count()` Anti-Pattern for Existence Checks
**Learning:** Using `prisma.model.count()` simply to check if any records exist (e.g., `count === 0`) executes a `SELECT COUNT(*)` query, which causes a full table scan or full index scan resulting in O(N) database performance.
**Action:** Always use `prisma.model.findFirst({ select: { id: true } })` when checking for existence. This compiles to a `SELECT id ... LIMIT 1` query, returning immediately upon finding the first match for O(1) performance.
