# Deployment Guide

Deploy COMPr to production with 1000+ concurrent user capacity on free/cheap tiers (Railway, Render, Vercel, Neon).

---

## §1. Pre-Deployment Checklist

- [ ] GitHub repo cloned & on `main` branch (commit `026722c` or later)
- [ ] `.env` file created locally with all secrets filled in
- [ ] FFmpeg 6+ installed on worker machines
- [ ] PostgreSQL 14+, Redis 7+, Node 18+ available
- [ ] Cloudflare R2 account with 2 buckets created (`compr-uploads`, `compr-outputs`)
- [ ] Flutterwave account (Phase 2 billing; placeholder OK for MVP)
- [ ] Sentry DSN (optional but recommended)
- [ ] PostHog API key (optional but recommended for analytics)

---

## §2. Infrastructure Setup

### Option A: Railway (Recommended for Hobby)

**PostgreSQL Service:**
1. Create new project
2. Add PostgreSQL plugin
3. Copy connection string to `.env` as `DATABASE_URL`
4. Run migrations (see §4)

**Redis Service:**
1. Add Redis plugin
2. Copy connection string as `REDIS_URL`
3. Enable AOF persistence (Settings → "Save Configuration")

**API Service (Fastify + Workers):**
1. Link GitHub repo `COMPr`
2. Set environment variables (see §3)
3. Build command: `npm run build`
4. Start command: `node dist/server/index.js` + background worker via `npm run worker`
5. Enable autoscaling (≥2 replicas, max 4 for free tier)

**Frontend Service (Next.js):**
1. Add new service, link same repo
2. Set `NEXT_PUBLIC_API_URL=https://api-prod.railway.app`
3. Build: `npm run build`
4. Start: `npm run start`
5. Set custom domain (Settings)

### Option B: Render (Free Tier Alternative)

**PostgreSQL:**
1. Create Managed Database
2. Copy DSN to `DATABASE_URL`

**Redis:**
1. Create Redis instance
2. Enable persistence (toggle in Settings)

**Web Services:**
1. Create web service from GitHub
2. Set environment vars
3. Deploy

### Option C: Vercel (Frontend Only) + Railway (API)

**Frontend on Vercel:**
```bash
npx vercel deploy --prod
# Set env: NEXT_PUBLIC_API_URL=https://your-railway-api.com
```

**API on Railway** (same as §2A)

---

## §3. Environment Variables

Copy `.env.example` to `.env` and fill in each variable:

```bash
# DATABASE (PostgreSQL)
# Format: postgresql://user:password@host:port/dbname?schema=public
DATABASE_URL="postgresql://compr:PASSWORD@db.railway.internal:5432/compr?schema=public"

# REDIS (for BullMQ queue)
# Format: redis://default:password@host:port
REDIS_URL="redis://default:PASSWORD@redis.railway.internal:6379"

# CLOUDFLARE R2 (Object Storage)
# Get from R2 → Settings → API tokens
R2_ENDPOINT="https://ACCOUNT-ID.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_UPLOADS_BUCKET="compr-uploads"      # Created bucket #1
R2_OUTPUTS_BUCKET="compr-outputs"      # Created bucket #2

# SECURITY (Cryptography)
# Generate: openssl rand -base64 32
CRYPTO_SALT="YOUR-RANDOM-BASE64-SALT-HERE"

# CORS (Frontend origins)
CORS_ORIGINS="https://compr.app,https://www.compr.app"

# FLUTTERWAVE (Payment provider — Phase 2, use dummy values for MVP)
FLUTTERWAVE_PUBLIC_KEY="pk_test_xxxxxxx"
FLUTTERWAVE_SECRET_KEY="sk_test_xxxxxxx"
FLUTTERWAVE_WEBHOOK_SECRET="whsec_xxxxxxx"

# SENTRY (Error tracking — optional)
SENTRY_DSN="https://xxx@sentry.io/PROJECT_ID"
SENTRY_AUTH_TOKEN="your-auth-token"

# POSTHOG (Product analytics — optional)
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
POSTHOG_API_KEY="your-personal-api-key"

# NEXT.JS
NEXT_PUBLIC_APP_URL="https://compr.app"
NEXT_PUBLIC_API_URL="https://api.compr.app"
NODE_ENV="production"

# PORT (for API server)
PORT="5000"
```

**Keep secrets safe:**
- Never commit `.env` to git
- Use platform secrets (Railway Settings, Render Environment, Vercel Secrets)
- Rotate `CRYPTO_SALT` annually

---

## §4. Database Setup

### First Time (Fresh DB)

```bash
# Run all pending migrations
npx prisma migrate deploy

# Expected output:
# ✓ Already applied: 20260720091650_add_job_prioritize_detail
# ✓ Already applied: 20260727000000_add_encoding_profiles
# ✓ Already applied: 20260727153336_add_job_destination
# ✓ Already applied: 20260731152137_add_share_bonus_credits
# ✓ Already applied: 20260810063007_add_queue_position
```

### Verify Schema

```bash
# List all tables
psql $DATABASE_URL -c "\dt"

# Expected tables: Job, MediaFile, UsageRecord, PlatformLimit, 
#                  EncodingProfile, OnboardingPreference, User, LedgerEntry, Payment
```

### Create Initial Platform Limits (WhatsApp Constants)

```bash
psql $DATABASE_URL << 'EOF'
INSERT INTO "PlatformLimit" ("preset", "maxDurationSec", "maxResolutionW", "maxResolutionH", "maxSizeMB", "effectiveFrom", "notes") VALUES
('STATUS', 90, 720, 1280, 16, NOW(), 'WhatsApp Status per-item ceiling'),
('CHAT', NULL, 720, 1280, 16, NOW(), 'WhatsApp Chat media compression trigger'),
('CUSTOM', NULL, 1080, 1920, 16, NOW(), 'User-specified target size (1-16 MB)');
EOF
```

---

## §5. Redis Configuration

**Critical for Production:** Enable AOF (Append-Only File) persistence.

### Railway/Render Dashboard

```
Redis Service → Settings → Persistence
☑ Enable AOF (Append Only File)
```

### Self-Hosted Redis

```bash
# redis.conf
appendonly yes
appendfsync everysec  # fsync every 1s (balance durability + performance)
maxmemory 1gb
maxmemory-policy allkeys-lru
```

**Why AOF?** If Redis restarts during a load spike, BullMQ's stalled-job recovery can reconcile job state. Without AOF, jobs vanish silently.

---

## §6. Object Storage (Cloudflare R2)

### Create Buckets

1. **Cloudflare Dashboard → R2**
2. Create bucket: `compr-uploads`
3. Create bucket: `compr-outputs`

### Bucket Lifecycle Rules

**Uploads bucket** (delete after 1 hour of inactivity):
```
Rule name: "cleanup-stale-uploads"
Apply to path: "uploads/*"
Delete object versions older than: 1 day
```

**Outputs bucket** (delete after 24 hours):
```
Rule name: "cleanup-stale-outputs"
Apply to path: "outputs/*"
Delete object versions older than: 1 day
```

**Note:** COMPr's cleanup cron is the primary deletion authority (updates `MediaFile.deletedAt` atomically). R2 lifecycle rules are a secondary safety net only.

### CORS Configuration (R2)

Restrict upload/download URLs to your domain:

```json
{
  "AllowedOrigins": ["https://compr.app", "https://www.compr.app"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

---

## §7. Deploy Frontend

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL
# Value: https://api.compr.app
```

### Railway / Self-Hosted

```bash
# Build
npm run build

# Start
npm run start
```

**Custom domain:**
1. Point DNS `compr.app` to your platform's nameservers
2. Enable SSL/TLS (auto-renewal via Let's Encrypt or platform default)

---

## §8. Deploy API & Workers

### Railway

```bash
# Commit & push to main
git add -A && git commit -m "deploy: production release"
git push origin main

# Railway auto-deploys on push (if linked to GitHub)
# Check deployment status: Railway Dashboard → Deployments
```

### Render / Self-Hosted

```bash
# Build
npm run build

# Start API server (foreground)
# OR in background: npm run worker &
npm run dev
```

### Docker (Self-Hosted / Any Platform)

```bash
# Build images
docker build -f Dockerfile.api -t compr-api .
docker build -f Dockerfile.worker -t compr-worker .
docker build -f Dockerfile.web -t compr-web .

# Run API
docker run -e DATABASE_URL=$DATABASE_URL -e REDIS_URL=$REDIS_URL \
  -p 5000:5000 compr-api

# Run workers (multiple replicas)
docker run -e DATABASE_URL=$DATABASE_URL -e REDIS_URL=$REDIS_URL \
  compr-worker
docker run -e DATABASE_URL=$DATABASE_URL -e REDIS_URL=$REDIS_URL \
  compr-worker
```

---

## §9. Health Checks & Initial Tests

### API Health

```bash
curl -v https://api.compr.app/health
# Expected: 200 OK (or 503 if unhealthy)
```

### Job Queue Status

```bash
curl https://api.compr.app/api/v1/queue-stats | jq .
# Expected: { "analysisQueue": { "waiting": 0, "active": 0 }, "encodeQueue": { ... } }
```

### Upload → Compress → Download Flow

```bash
# 1. Get presigned upload URL
UPLOAD_RESPONSE=$(curl -X POST https://api.compr.app/api/v1/uploads/presign \
  -H 'Content-Type: application/json' \
  -d '{"filename": "test.mp4", "mimeType": "video/mp4", "sizeBytes": 5242880}')

UPLOAD_URL=$(echo $UPLOAD_RESPONSE | jq -r '.uploadUrl')
FILE_KEY=$(echo $UPLOAD_RESPONSE | jq -r '.fileKey')

# 2. Upload file
curl -X PUT -T test.mp4 "$UPLOAD_URL"

# 3. Create job
JOB_RESPONSE=$(curl -X POST https://api.compr.app/api/v1/jobs \
  -H 'Content-Type: application/json' \
  -d "{\"fileKey\": \"$FILE_KEY\", \"preset\": \"CHAT\", \"fingerprint\": \"test_fp_001\"}")

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.jobId')

# 4. Poll status (wait for completion)
for i in {1..30}; do
  STATUS=$(curl https://api.compr.app/api/v1/jobs/$JOB_ID?fingerprint=test_fp_001 | jq -r '.status')
  echo "Job $JOB_ID: $STATUS"
  [ "$STATUS" = "DONE" ] && break
  sleep 2
done

# 5. Download result
curl $(curl https://api.compr.app/api/v1/jobs/$JOB_ID?fingerprint=test_fp_001 | jq -r '.outputs[0].downloadUrl') \
  -o optimized.mp4
```

**Success criteria:**
- ✅ Upload completes in <30s
- ✅ Job queues immediately
- ✅ Status progresses: QUEUED → ANALYZING → ENCODING → VERIFYING → DONE
- ✅ Output file is 50-90% smaller than input
- ✅ Download URL works and serves the optimized file

---

## §10. Monitoring & Alerting

### Database Metrics

```sql
-- Connection pool usage
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- Slow queries
SELECT query, mean_time, calls FROM pg_stat_statements 
  WHERE mean_time > 1000 ORDER BY mean_time DESC LIMIT 10;

-- Table bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
  FROM pg_tables WHERE schemaname != 'pg_catalog' ORDER BY 3 DESC;
```

### Redis Metrics

```bash
# Memory usage
redis-cli info memory

# Slow commands
redis-cli CONFIG GET slowlog-max-len
redis-cli SLOWLOG GET 10

# Queue depth
redis-cli LLEN bull:media-analysis:waiting
redis-cli LLEN bull:media-encode:waiting
```

### Application Metrics (Sentry / PostHog)

- **Error rate:** Track encode failures, validation errors
- **Queue latency:** p50, p95 time from queued → analyzing
- **Upload time:** Track resumable upload resume count + duration
- **Job completion rate:** % of jobs DONE vs FAILED
- **Scaling events:** Worker spin-up/down, queue depth spikes

---

## §11. Scaling to 1000+ Concurrent Users

**Configuration Adjustments:**

1. **Worker Concurrency:**
   - Set `workers/encode-worker.ts` concurrency to `Math.min(vCPU_count / 2, 8)`
   - Add more worker replicas when queue depth > 10

2. **Database Connection Pool:**
   - Add to `DATABASE_URL`: `?connection_limit=20` (adjust based on free tier)
   - Use PgBouncer if hitting connection exhaustion

3. **Redis:**
   - Increase `maxmemory` to 2-4GB
   - Monitor `used_memory_rss` and `evicted_keys`

4. **Job Timeouts:**
   - Encode timeout: 5 minutes (typical video)
   - Image processing: 30 seconds
   - Analysis: 60 seconds

5. **Rate Limiting:**
   - `/api/v1/jobs`: 20 req/min/IP (enforced by rate-limit plugin)
   - `/api/v1/uploads/presign`: 20 req/min/IP
   - Consider fingerprint-based fallback if proxy rotates IPs

**Load Testing:**

```bash
npm run test:load -- --users 1000 --duration 300 --ramp-up 60
```

Expected results:
- Median job completion: 15-30s
- p95 completion: 45-90s
- p99 queue wait: <30s (from queued to analyzing)
- Worker CPU: 60-80% sustained
- Database connections: <15 active

---

## §12. Rollback & Recovery

### If Deployment Fails

```bash
# Roll back to previous commit
git revert <bad-commit-hash>
git push origin main

# Platform auto-redeploys (Railway/Render)
# OR manually redeploy if self-hosted
```

### If Database Migration Fails

```bash
# Check migration status
npx prisma migrate status

# Resolve in interactive mode
npx prisma migrate resolve --rolled-back <migration-name>

# OR rollback to previous schema version
# (consult Prisma docs for your DB; usually manual SQL)
```

### If Redis is Corrupted

```bash
# Save backup
redis-cli BGSAVE /backup/dump.rdb

# Restart Redis (discard corrupted data)
# Note: Any in-flight jobs will be reconciled by BullMQ on next worker restart
```

---

## §13. Post-Launch Checklist

- [ ] All 5 services deployed (Frontend, API, Workers, Postgres, Redis)
- [ ] Custom domain DNS pointing to correct IP/CNAME
- [ ] SSL/TLS certificate issued and auto-renewing
- [ ] Environment variables set on all services
- [ ] Database migrations applied successfully
- [ ] Health checks passing (API /health, queue-stats)
- [ ] Sample upload → compress → download flow tested end-to-end
- [ ] Monitoring dashboard set up (Sentry, PostHog)
- [ ] Alerting configured (CPU >80%, DB connections >20, Redis memory >80%)
- [ ] Backup strategy documented (DB snapshots daily, R2 lifecycle rules enabled)
- [ ] Documentation links updated (README, OPERATIONS)
- [ ] Support contact set up (support@compr.app or feedback form)
- [ ] Analytics tracking verified (PostHog events firing)

---

## §14. Support & Troubleshooting

**Common Issues:**

| Problem | Cause | Solution |
|---------|-------|----------|
| **Jobs stuck in QUEUED** | Workers not running or no CPU | Scale workers, check concurrency |
| **Upload fails: 403 Forbidden** | Presigned URL expired or wrong R2 credentials | Check R2 keys, ensure 60min expiry |
| **Download URL 404** | File deleted before download | Increase retention window (currently 24h) |
| **CORS errors** | Origin not in allow-list | Update CORS_ORIGINS in .env |
| **OOM on workers** | Too many concurrent encodes | Reduce worker concurrency, add replicas |
| **Slow encoding** | Slow/2-pass running during load | Verify queue depth logic, check CPU |
| **VMAF failures** | Quality gate too strict | Lower floor from 80 to 75, or skip gate |

**Debug Commands:**

```bash
# Check worker logs
docker logs compr-worker-1

# Inspect job in queue
redis-cli HGETALL "bull:media-encode:active:job:123"

# List failed jobs
redis-cli LRANGE "bull:media-encode:failed" 0 -1

# Force retry of failed job
redis-cli LPUSH "bull:media-encode:waiting" "<job-id>"
```

---

See [OPERATIONS.md](./OPERATIONS.md) for runbooks, monitoring dashboards, and scaling procedures.
