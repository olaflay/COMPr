## 2024-05-24 - Missing Index on Job Intake Rate-Limit Query
**Learning:** The fallback IP-based rate limiter in `job-intake.ts` runs a `count` query on `Job` filtered by `ipHash` and `createdAt`. This table lacks an index for those fields, meaning every new job triggers a full table scan.
**Action:** Always add compound indexes for fields used heavily in high-frequency aggregation/count queries (like rate limiters) to prevent O(N) database scaling bottlenecks.
