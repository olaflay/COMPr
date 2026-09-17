## 2024-05-24 - Missing Index on Job Intake Rate-Limit Query
**Learning:** The fallback IP-based rate limiter in `job-intake.ts` runs a `count` query on `Job` filtered by `ipHash` and `createdAt`. This table lacks an index for those fields, meaning every new job triggers a full table scan.
**Action:** Always add compound indexes for fields used heavily in high-frequency aggregation/count queries (like rate limiters) to prevent O(N) database scaling bottlenecks.

## 2024-05-24 - Replace count() with findFirst() for existence checks
**Learning:** Using `count()` in Prisma to check if a record exists (e.g., `jobCount === 0`) results in a full table scan, even if there's an index, especially for large tables like `Job`. This is an O(N) database scaling bottleneck.
**Action:** Always use `findFirst()` with a select clause (e.g., `select: { id: true }`) instead of `count()` when only performing a boolean existence check. This enables the database to return immediately after finding a single record, making it an O(1) operation.
