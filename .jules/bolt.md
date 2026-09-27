## 2024-05-24 - Missing Index on Job Intake Rate-Limit Query
**Learning:** The fallback IP-based rate limiter in `job-intake.ts` runs a `count` query on `Job` filtered by `ipHash` and `createdAt`. This table lacks an index for those fields, meaning every new job triggers a full table scan.
**Action:** Always add compound indexes for fields used heavily in high-frequency aggregation/count queries (like rate limiters) to prevent O(N) database scaling bottlenecks.

## 2024-05-25 - Prisma .count() vs .findFirst() for Existence Checks
**Learning:** Using Prisma's `.count()` method simply to check if a record exists (e.g., `count === 0` for "is this the first job?") forces the database to scan or tally multiple rows, degrading into O(N) performance as the table grows.
**Action:** Always use `.findFirst({ select: { id: true } })` and check for `null` instead of `.count()` when only determining existence, ensuring an O(1) lookup.
