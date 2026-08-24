# Operations & Monitoring Guide

Runbooks, health checks, scaling procedures, and troubleshooting for NoBlur in production.

---

## §1. Health Checks

### Automated (Set Up in Your Platform)

**API Health Endpoint:**
```bash
curl -v https://<YOUR_API_HOST_URL>/health
```
- **200 OK** → All systems healthy
- **503 Service Unavailable** → Database/Redis unreachable

**Configure platform to:**
- Check every 30 seconds
- Alert if 3+ consecutive failures
- Auto-restart service if unhealthy

### Manual Health Verification

```bash
#!/bin/bash
echo "=== API HEALTH ==="
curl -s https://<YOUR_API_HOST_URL>/health | jq .

echo "=== DATABASE ==="
psql $DATABASE_URL -c "SELECT now();" || echo "FAILED"

echo "=== REDIS (Upstash) ==="
redis-cli -u $REDIS_URL PING || echo "FAILED"

echo "=== SUPABASE STORAGE BUCKETS ==="
# Supabase Storage's S3-compatible endpoint; requires --endpoint-url and forcePathStyle equivalent (--endpoint-url handles this for the CLI)
aws s3 ls "s3://$SUPABASE_UPLOADS_BUCKET" --endpoint-url "$SUPABASE_S3_ENDPOINT" --region "$SUPABASE_S3_REGION" || echo "FAILED"
aws s3 ls "s3://$SUPABASE_OUTPUTS_BUCKET" --endpoint-url "$SUPABASE_S3_ENDPOINT" --region "$SUPABASE_S3_REGION" || echo "FAILED"

echo "=== QUEUE DEPTH ==="
redis-cli LLEN bull:media-analysis:waiting
redis-cli LLEN bull:media-encode:waiting
redis-cli LLEN bull:media-analysis:active
redis-cli LLEN bull:media-encode:active
```

---

## §2. Monitoring Dashboard (Grafana / Datadog / Sentry)

### Key Metrics to Observe

**API Server:**
- Request rate (req/s)
- P50 / P95 / P99 latency
- Error rate (4xx, 5xx)
- Database connection pool utilization
- Rate limiter hit rate

**Job Queue:**
- Jobs waiting (analysis + encode)
- Jobs active (concurrent)
- Jobs failed (by hour)
- Queue depth trend
- Retry rate

**Workers:**
- CPU utilization per worker
- Memory usage
- Encode time distribution (p50, p95, p99)
- VMAF gate failure rate
- Timeout rate

**Storage (Supabase Storage):**
- Object count (uploads + outputs buckets)
- Deleted vs retained file ratio
- Cleanup cron duration
- Presigned URL generation latency

**Database:**
- Connection pool (active, idle, max)
- Query latency (p95)
- Table size (Job, MediaFile, UsageRecord)
- Replication lag (if replicated)

**Redis:**
- Memory usage (rss, used)
- Evicted keys per hour
- Command latency (p95)
- AOF sync duration

### Example Prometheus Queries (Grafana)

```promql
# Jobs stuck in QUEUED for >2 minutes
histogram_quantile(0.95, rate(job_queue_latency_seconds{status="QUEUED"}[5m])) > 120

# Encode worker CPU too high
node_cpu_seconds_total{job="encode-worker"} > 0.8

# Database connection pool exhaustion risk
pg_stat_activity_count >= 18  # If max is 20

# Storage cleanup falling behind
increase(media_files_deleted_total[1h]) < 100

# VMAF failures trending up
rate(vmaf_gate_failures_total[5m]) > 0.1
```

---

## §3. Alerting Rules

Set up alerts for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Error Rate | >5% for 5min | Page on-call (service degradation) |
| Queue Depth | >500 jobs | Add worker replicas |
| Queue Wait (p95) | >60s | Scale up API instances |
| Database Connections | >18/20 | Reduce connection leak, add PgBouncer |
| Redis Memory | >80% | Increase maxmemory or add replica |
| Cleanup Lag | >24hr behind | Investigate cleanup cron failures |
| Worker OOM | Any crash | Reduce concurrency, check encode timeouts |
| VMAF Failure Rate | >20% | Lower quality floor or disable gate |

---

## §4. Scaling Procedures

### When to Scale Up

**Add Workers When:**
- Queue depth > 10 and p95 queue wait > 30s
- Encode worker CPU > 80% sustained for 10min
- Job timeouts increasing (>1% of jobs)

**Add API Instances When:**
- Request rate > 500 req/s
- P95 latency > 500ms
- Database connections > 15/20

**Increase Database Resources When:**
- Connection pool near capacity
- Query latency (p95) > 1s
- Slow query log growing

### Scaling Commands

**Add Worker Replica (Railway/Render):**
```bash
# Via CLI
railway service scale --replicas 3 noblur-worker

# Via Dashboard: Services → noblur-worker → Scaling → Set replicas to 3
```

**Scale Up Database:**
```bash
# Via Platform Dashboard
# Usually requires brief downtime or maintenance window
# Check platform docs for zero-downtime scale options
```

**Monitor Scale-Up Impact:**

```bash
# After adding workers, verify queue drains
watch -n 5 'redis-cli LLEN bull:media-encode:waiting'

# After adding API instances, verify load distribution
curl https://<YOUR_API_HOST_URL>/api/v1/stats | jq '.instanceId'  # Should rotate

# After scaling DB, verify connections balanced
psql $DATABASE_URL -c "SELECT pid, usename, application_name FROM pg_stat_activity;" | wc -l
```

---

## §5. Database Maintenance

### Regular Tasks

**Daily:**
```sql
-- Check for table bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 3 DESC;

-- Check connection pool health
SELECT datname, count(*) as connections
FROM pg_stat_activity 
GROUP BY datname;
```

**Weekly:**
```sql
-- Reindex frequently scanned tables (Job, UsageRecord)
REINDEX INDEX "Job_fingerprintHash_createdAt_idx";
REINDEX INDEX "Job_status_idx";
REINDEX INDEX "UsageRecord_fingerprintHash_date_idx";

-- Vacuum to reclaim space
VACUUM ANALYZE "Job";
VACUUM ANALYZE "MediaFile";
VACUUM ANALYZE "UsageRecord";
```

**Monthly:**
```sql
-- Backup before major maintenance
-- (Use Supabase's backup feature: Project Settings > Database > Backups)

-- Clean up old jobs (older than 90 days)
DELETE FROM "Job" WHERE "completedAt" < NOW() - INTERVAL '90 days' AND "status" = 'DONE';
```

### Connection Pool Optimization

If hitting connection limit (<20 on free Postgres):

**Option A: Use Connection Pooler**
```bash
# PgBouncer on Railway/Render
# Reduces per-app connections by 10x via connection multiplexing
```

**Option B: Adjust App Pool Size**
```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  datasource: { url: process.env.DATABASE_URL },
});
// Default pool size: min(10, CPU cores * 2)
// For Railway free tier: ~4 connections per instance
```

---

## §6. Redis Maintenance

### Monitor Memory

```bash
# Current usage
redis-cli INFO memory | grep used_memory_human

# Memory breakdown
redis-cli MEMORY DOCTOR

# Top consumers
redis-cli MEMORY USAGE <key> --SAMPLES 5
```

### Handle Memory Pressure

**If Redis memory > 80% of maxmemory:**

```bash
# Check for memory leaks in queue data
redis-cli --scan --pattern "bull:*" | wc -l

# Clear orphaned/dead-letter queue
redis-cli LLEN "bull:media-encode:dead"
redis-cli DEL "bull:media-encode:dead"

# If still full, increase maxmemory (Redis config)
# redis.conf: maxmemory 2gb
```

### AOF Rewrite

```bash
# Trigger manual rewrite (reduces file size)
redis-cli BGREWRITEAOF

# Monitor progress
redis-cli INFO persistence | grep aof_rewrite
```

---

## §7. Backup & Disaster Recovery

### Backup Strategy

**Automated (Set Up Once):**
- Database: Daily snapshots (Supabase's built-in Postgres backups)
- Redis: Upstash-managed persistence (auto-recovery on restart)
- Supabase Storage: enable bucket versioning if you need rollback to a previous object version

**Manual Backups (Before Major Deployments):**

```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
redis-cli BGSAVE /backup/dump.rdb

# Copy to secure storage
aws s3 cp backup_*.sql s3://my-backup-bucket/noblur-db/
```

### Recovery Procedures

**Database Corruption:**
```bash
# Restore from latest backup
psql $DATABASE_URL < backup_2026_08_10.sql

# Verify schema
psql $DATABASE_URL -c "\dt"
```

**Redis Data Loss:**
```bash
# If AOF is corrupted, restart Redis
# BullMQ will automatically reconcile job states on next worker poll
redis-cli SHUTDOWN

# Restart service
systemctl restart redis-server  # or platform's restart button
```

**Lost Jobs (Queue Corruption):**
```sql
-- Query Job table for jobs marked QUEUED but not in Redis
-- Manually requeue by updating status to QUEUED and touching updatedAt
UPDATE "Job" 
SET "status" = 'QUEUED', "updatedAt" = NOW() 
WHERE "status" IN ('QUEUED', 'ANALYZING') 
AND "updatedAt" < NOW() - INTERVAL '1 hour';

-- Workers will re-process stalled jobs on next poll
```

---

## §8. Common Issues & Fixes

### Issue: Jobs Stuck in QUEUED

**Symptoms:** Queue depth > 100, no jobs moving to ANALYZING

**Investigation:**
```bash
redis-cli LRANGE "bull:media-analysis:waiting" 0 5
redis-cli LRANGE "bull:media-analysis:active" 0 5
docker logs noblur-analysis-worker-1 | tail -20
```

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| **Analysis worker crashed** | Restart worker: `docker restart noblur-analysis-worker-1` |
| **FFprobe missing** | Verify FFmpeg installed: `ffprobe -version` |
| **Supabase Storage credentials invalid** | Check `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY` in .env |
| **Disk full** | Check worker `/tmp`: `df -h` and clean up temp files |
| **Worker OOM** | Reduce concurrency, increase memory allocation |

---

### Issue: Encode Failures Spike

**Symptoms:** VMAF gate failures >20%, timeout rate >5%

**Investigation:**
```bash
curl https://<YOUR_API_HOST_URL>/api/v1/stats | jq '.failuresByReason'
docker logs noblur-encode-worker-1 | grep -i error | tail -20
```

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| **Queue too deep (slow preset)** | Check: is queue depth > 10? If yes, concurrency is too low; add workers |
| **VMAF threshold too strict** | Lower floor from 80 to 75: `qualityGate(vmafScore, 75)` in lib/vmaf.ts |
| **Corrupt input files** | Increase tolerance for corrupt files; fail gracefully instead of retry |
| **Timeout too short** | Extend from 5min to 10min if typical encodes take >5min |

---

### Issue: Database Connection Pool Exhausted

**Symptoms:** "too many connections" errors, 90% of jobs fail at DB write stage

**Investigation:**
```bash
psql $DATABASE_URL -c "SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;"
lsof -i :5432 | wc -l  # Count open connections
```

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| **Long-running queries** | Kill slow queries: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query_start < NOW() - INTERVAL '10 min';` |
| **Connection leak in app** | Check Prisma client lifecycle; ensure `prisma.$disconnect()` on shutdown |
| **Too many API instances** | Reduce replicas or add PgBouncer connection pooler |

---

### Issue: Workers OOM (Out of Memory)

**Symptoms:** Worker process killed, queue stalls, logs show "Cannot allocate memory"

**Investigation:**
```bash
free -h  # Check available memory
docker stats noblur-encode-worker-1  # Monitor memory in real-time
```

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| **Too many concurrent encodes** | Reduce concurrency in workers/encode-worker.ts from 4 to 2 |
| **Large video files** | Implement file size limit validation; cap at 500MB |
| **Memory leak in FFmpeg** | Verify FFmpeg version; update if outdated |
| **Insufficient instance memory** | Scale up worker instance (e.g., Railway: $5→$10/mo tier) |

---

### Issue: Cleanup Cron Not Running

**Symptoms:** Supabase Storage buckets fill with old files, no new files deleted for >24hr

**Investigation:**
```bash
docker logs noblur-cleanup-cron | tail -30
redis-cli HGETALL "bull:cleanup-cron:last-run"
psql $DATABASE_URL -c "SELECT max(\"updatedAt\") FROM \"MediaFile\" WHERE \"deletedAt\" IS NOT NULL;"
```

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| **Cron job never started** | Restart: `npm run cleanup-cron` or container restart |
| **Cron running but failing silently** | Check error logs; verify Supabase Storage credentials |
| **Database locks** | Kill long-running transactions: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';` |

---

## §9. Performance Tuning

### Encode Speed Optimization

**Current Defaults (v1.1):**
- Fast/1-pass by default
- Slow/2-pass only when queue depth ≤ 1
- Single FFmpeg pass ~15-30s for typical video

**To Make Even Faster:**

```typescript
// workers/encode-worker.ts
// Lower cpuPreset threshold
if (waitingCount <= 0) {  // Changed from <= 1
  cpuPreset = 'slow';
  passCount = 2;
} else if (waitingCount <= 2) {  // Changed from <= 3
  cpuPreset = 'medium';
  passCount = 2;
}
// Stays fast/1-pass for all queue depths > 2
```

### Quality vs Speed Trade-Off

| Mode | CRF | Speed | Quality | Use Case |
|------|-----|-------|---------|----------|
| **Quality** | 18-20 | Slow (2-pass) | Highest VMAF | Idle queue, user prefers detail |
| **Balanced** | 23-25 | Medium (2-pass) | Good VMAF | Moderate load |
| **Fast** | 28-32 | Fast (1-pass) | Acceptable VMAF | High load, user prefers speed |

Current logic: Fast by default → acceptable quality + throughput for 1000 users.

---

## §10. Observability (Sentry / PostHog)

### Error Tracking (Sentry) — Pending Setup

`@sentry/nextjs` and `@sentry/node` are installed as dependencies, but Sentry is **not yet initialized anywhere in the code** — there is no `Sentry.init()` call wired up. `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` in `.env` currently have no effect. Wiring this up is tracked as a separate, in-progress task. Until it lands:
- Do not assume errors are being reported to Sentry.
- Do not rely on a Sentry dashboard for the alerting rules in §3 — use application logs and the `/health` / `/api/v1/queue-stats` endpoints instead.
- Once initialized, the intended setup is: get a DSN from Sentry project settings, set `SENTRY_DSN`, and filter in the Sentry dashboard for FFmpeg encode errors (expected failures), database connection errors (actionable), and rate limit errors (informational).

### Set Up Product Analytics (PostHog)

```bash
# Track key user journeys
# - First upload (onboarding funnel drop-off)
# - Preset selection (which presets used most)
# - Share to WhatsApp (conversion to premium)
# - Error recovery (how many users retry after failure)

curl -X POST https://app.posthog.com/capture \
  -H 'Content-Type: application/json' \
  -d '{
    "api_key": "phc_xxx",
    "distinct_id": "user_123",
    "event": "job_completed",
    "properties": {
      "duration_seconds": 25,
      "preset": "CHAT",
      "size_reduction_percent": 75
    }
  }'
```

---

## §11. Incident Response

### On-Call Runbook

**Page Received:** Ping immediately
1. Check application logs / `/health` and `/api/v1/queue-stats` for error spike or alert details (Sentry is not yet wired up — see §10)
2. Run health checks (§1)
3. Check queue depth (`redis-cli LLEN bull:...`)
4. Review logs (`docker logs <service> | tail -50`)
5. Determine severity (P1: all users affected, P2: some users, P3: minor issue)

**P1 (Critical):**
- API completely down → Restart API instances
- Database unreachable → Check credentials, connectivity, backups
- Redis down → Restart, check AOF, reconcile jobs
- Worker mass failure → Check logs, restart, check disk space

**P2 (High):**
- Queue backing up (>1000 jobs) → Add workers
- Database slow → Kill slow queries, increase resources
- Upload failures (>10% error rate) → Check Supabase Storage credentials, check network

**P3 (Low):**
- Isolated job failures → Check input file, retry job
- Occasional timeouts → Monitor, no action needed if <1%

### Post-Incident

1. **Resolve:** Fix the issue (restart, patch, rollback)
2. **Communicate:** Post status update (if user-facing)
3. **Log:** Incident report (what, when, impact, root cause, fix)
4. **Review:** Team debrief within 24hr (what could prevent this?)
5. **Improve:** Update runbooks, alerting, monitoring based on findings

---

## §12. Compliance & Auditing

### Data Retention Audit

```sql
-- Verify deletion is working as intended
SELECT 'Deleted (last 24hr)' as category, count(*) as count
FROM "MediaFile" WHERE "deletedAt" BETWEEN NOW() - INTERVAL '24 hours' AND NOW()
UNION ALL
SELECT 'Active (not deleted)', count(*) FROM "MediaFile" WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Orphaned (no job)', count(*) FROM "MediaFile" WHERE "jobAsSource" IS NULL AND "jobAsOutput" IS NULL;
```

### GDPR / Privacy Checklist

- [ ] No user IPs stored (only hashed)
- [ ] No raw fingerprints stored (only hashed)
- [ ] File content never logged
- [ ] Presigned URLs single-object scoped
- [ ] Deletion working (files removed from Supabase Storage + DB within 24hr of job completion)
- [ ] Privacy policy posted (`<YOUR_DOMAIN>/privacy`)
- [ ] Cookie consent (no third-party tracking cookies without consent)

---

See [DEPLOYMENT.md](./DEPLOYMENT.md) for initial setup and [SECURITY.md](./SECURITY.md) for security-specific runbooks.
