## 2024-05-24 - Missing Index on Job Intake Rate-Limit Query
**Learning:** The fallback IP-based rate limiter in `job-intake.ts` runs a `count` query on `Job` filtered by `ipHash` and `createdAt`. This table lacks an index for those fields, meaning every new job triggers a full table scan.
**Action:** Always add compound indexes for fields used heavily in high-frequency aggregation/count queries (like rate limiters) to prevent O(N) database scaling bottlenecks.
## 2026-09-18 - Prevent O(N) queries with findFirst
**Learning:** When checking for the existence of records (e.g. checking if an item is the first job), using `count()` forces the database to scan all matching rows (O(N)), which becomes a bottleneck on heavily used queries.
**Action:** Use `findFirst({ select: { id: true } })` instead of `count()` when only checking for existence (e.g. count === 0). This allows the database to return immediately after finding the first match (O(1)).
