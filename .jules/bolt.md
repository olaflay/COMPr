## 2024-05-24 - Missing Index on Job Intake Rate-Limit Query
**Learning:** The fallback IP-based rate limiter in `job-intake.ts` runs a `count` query on `Job` filtered by `ipHash` and `createdAt`. This table lacks an index for those fields, meaning every new job triggers a full table scan.
**Action:** Always add compound indexes for fields used heavily in high-frequency aggregation/count queries (like rate limiters) to prevent O(N) database scaling bottlenecks.

## 2024-06-03 - Prisma O(1) Existence Check Optimization
**Learning:** Using `count()` in Prisma to check if *any* record exists forces the database to perform a full table scan or index scan to count all matching rows, resulting in an O(N) performance penalty at scale.
**Action:** Always use `findFirst({ select: { id: true } })` for existence checks instead of `count()`. This limits the database to finding a single record and stops, yielding O(1) database performance.
