## 2024-05-24 - Missing Index on Job Intake Rate-Limit Query
**Learning:** The fallback IP-based rate limiter in `job-intake.ts` runs a `count` query on `Job` filtered by `ipHash` and `createdAt`. This table lacks an index for those fields, meaning every new job triggers a full table scan.
**Action:** Always add compound indexes for fields used heavily in high-frequency aggregation/count queries (like rate limiters) to prevent O(N) database scaling bottlenecks.

## 2024-05-25 - Avoid Prisma `count()` for Database Existence Checks
**Learning:** Checking for existence using `count() === 0` in Prisma (like `isFirstJob` check in `job-intake.ts`) triggers an O(N) full table/index scan counting all matching rows, which scales poorly as the table grows.
**Action:** Use `findFirst({ select: { id: true } })` instead of `count()` when you only need to know if at least one record exists. This creates a `LIMIT 1` query that completes in O(1) time.
