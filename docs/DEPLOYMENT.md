# Deployment Guide

Deploy NoBlur to production. The frontend (Next.js) deploys to **Vercel**; the Fastify API server and BullMQ workers are long-running Node processes that Vercel serverless functions cannot host, so they need separate hosting (Railway, Render, and Fly.io are all reasonable — pick whichever fits your budget/ops preference).

---

## §1. Pre-Deployment Checklist

- [ ] GitHub repo cloned & on `main` branch
- [ ] `.env` file created locally from `.env.example` with all secrets filled in
- [ ] FFmpeg 6+ (with libsvtav1) and Python3 + OpenCV (`cv2`) installed on worker machines — see §2C, `Dockerfile.worker` already provisions these
- [ ] Supabase project created (Postgres + Storage)
- [ ] Supabase Storage buckets created (`noblur-uploads`, `noblur-outputs` by default, or your own names)
- [ ] Upstash Redis database created (TLS/`rediss://` endpoint)
- [ ] Flutterwave: **not required for launch** — billing routes are stubbed (see §3B / §9)
- [x] Sentry DSN — initialized via instrumentation.ts + sentry.server.config.ts (client + server)
- [ ] PostHog API key (optional, for analytics)

---

## §2. Infrastructure Setup

NoBlur's runtime has three deployable pieces, plus two managed services:

| Piece | What it is | Where it runs |
|---|---|---|
| Frontend | Next.js app (`npm run build` / `npm run start`) | **Vercel** |
| API server | Fastify server, `npm run start:server`, listens on `PORT` (default 5000) | Railway / Render / Fly.io (long-running process) |
| Workers | BullMQ workers, `npm run start:workers` | Railway / Render / Fly.io (long-running process, needs ffmpeg + Python/OpenCV — see §2C) |
| Database | Supabase Postgres | Supabase (managed) |
| Queue backend | Upstash Redis | Upstash (managed) |
| Object storage | Supabase Storage (S3-compatible) | Supabase (managed) |

### A. Database — Supabase Postgres

1. Create a Supabase project (or use an existing one).
2. From Project Settings → Database, grab:
   - The **pooled connection string** (for `DATABASE_URL`, used by the app at runtime — goes through Supabase's connection pooler).
   - The **direct connection string** (for `DIRECT_URL`, used only for running migrations — `prisma/schema.prisma`'s `datasource` block requires both `url` and `directUrl`).
3. Set both in your environment (see §3). Note: `DIRECT_URL` is required by `prisma/schema.prisma` but is not currently listed in `.env.example` — add it yourself alongside `DATABASE_URL` when you fill in `.env`.
4. Run migrations (§4).

### B. Queue Backend — Upstash Redis

1. Create an Upstash Redis database.
2. Copy the `rediss://` (TLS) connection string into `REDIS_URL`. `lib/queue.ts` passes this directly to `ioredis`/BullMQ — no other Redis-specific config is required.

### C. Object Storage — Supabase Storage (S3-compatible)

1. In the same Supabase project, go to Storage and create two buckets (default names used by the app: `noblur-uploads`, `noblur-outputs`).
2. Go to Project Settings → Storage → S3 Access Keys and generate an access key pair.
3. Note your project's storage endpoint: `https://<project-ref>.storage.supabase.co/storage/v1/s3`, and your project's region.
4. Fill in `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`, `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY`, `SUPABASE_UPLOADS_BUCKET`, `SUPABASE_OUTPUTS_BUCKET` (see §3). `server/services/storage.ts` is the authoritative implementation — it uses `forcePathStyle: true` and the project's real region (unlike Cloudflare R2, Supabase does not accept `region: "auto"`).
5. This has been verified end-to-end (presigned multipart upload + real PUT) as working with this configuration.

### D. Frontend — Vercel

```bash
npm i -g vercel
vercel deploy --prod
```

Set environment variables in Vercel (Project Settings → Environment Variables) — see §3. Set `NEXT_PUBLIC_API_URL` to wherever you deploy the API server (§2E).

No custom domain has been decided yet. Vercel will assign something like `<project>.vercel.app` — use that (or a placeholder `<YOUR_DOMAIN>`) until a real domain is chosen. Once you do pick a domain (even a temporary `.vercel.app` one), update:
- `CORS_ORIGINS` in `.env` / your API host's env vars
- The hardcoded `https://noblur.app` references in `lib/seo.ts` and `lib/whatsapp-share.ts` (not covered by this doc — these are code changes, not deploy config)

### E. API Server + Workers — Railway / Render / Fly.io

These cannot run on Vercel (no long-running processes / background workers in serverless functions). Pick one host and deploy two services from it: the API server and the workers. `Dockerfile.api` and `Dockerfile.worker` in the repo root are set up for exactly this split — see §8 for build/run instructions.

General steps on any of the three platforms:
1. Link the GitHub repo (or point at the Dockerfiles directly).
2. **API service:** build `Dockerfile.api`, expose port `5000` (or whatever `PORT` is set to), set env vars (§3).
3. **Worker service:** build `Dockerfile.worker` — this image installs ffmpeg (with libsvtav1), Python3, and OpenCV; do **not** deploy the worker as a bare Node buildpack, it will fail on missing `ffmpeg`/`ffprobe`/`cv2`. Set the same env vars minus frontend-only ones.
4. Point `NEXT_PUBLIC_API_URL` (Vercel) at the API service's public URL.

---

## §3. Environment Variables

Copy `.env.example` to `.env` and fill in each variable. This list is pulled directly from `.env.example` (the authoritative source) plus `DIRECT_URL`, which the Prisma schema requires but which is currently missing from `.env.example`:

```bash
# Database (Supabase Postgres)
DATABASE_URL="postgresql://noblur:noblur@localhost:5432/noblur?schema=public"   # pooled connection, used at runtime
DIRECT_URL="postgresql://noblur:noblur@localhost:5432/noblur?schema=public"     # direct connection, used only for `prisma migrate deploy` — NOT in .env.example yet, add manually

# Redis (Upstash — BullMQ queue backend)
# Use the rediss:// (TLS) URL Upstash gives you
REDIS_URL="rediss://default:PASSWORD@your-db.upstash.io:6379"

# Supabase Storage (S3-compatible object storage)
# Endpoint format: https://<project-ref>.storage.supabase.co/storage/v1/s3
# Get access keys + region from: Project Settings > Storage > S3 Access Keys
SUPABASE_S3_ENDPOINT="https://<project-ref>.storage.supabase.co/storage/v1/s3"
SUPABASE_S3_REGION="<your-project-region, e.g. us-east-1>"
SUPABASE_S3_ACCESS_KEY_ID="<your-supabase-s3-access-key>"
SUPABASE_S3_SECRET_ACCESS_KEY="<your-supabase-s3-secret-key>"
SUPABASE_UPLOADS_BUCKET="noblur-uploads"
SUPABASE_OUTPUTS_BUCKET="noblur-outputs"

# Flutterwave (payment provider — NOT YET IMPLEMENTED, see §9. Dummy values are fine.)
FLUTTERWAVE_PUBLIC_KEY="<your-flutterwave-public-key>"
FLUTTERWAVE_SECRET_KEY="<your-flutterwave-secret-key>"
FLUTTERWAVE_WEBHOOK_SECRET="<your-flutterwave-webhook-secret>"

# Sentry (error monitoring — initialized via instrumentation.ts + sentry.server.config.ts)
SENTRY_DSN="<your-sentry-dsn>"
SENTRY_AUTH_TOKEN="<your-sentry-auth-token>"

# PostHog (product analytics)
NEXT_PUBLIC_POSTHOG_KEY="<your-posthog-public-key>"
NEXT_PUBLIC_POSTHOG_HOST="<your-posthog-host-or-https://app.posthog.com>"
POSTHOG_API_KEY="<your-posthog-personal-api-key>"

# Cryptography (fingerprint/IP hashing)
# Generate a strong salt: openssl rand -base64 32
CRYPTO_SALT="<your-random-base64-salt>"

# CORS (comma-separated list of allowed origins)
# Update once a real domain (even a temporary .vercel.app one) is chosen
CORS_ORIGINS="<YOUR_DOMAIN>,http://localhost:3000"

# Next.js
NEXT_PUBLIC_APP_URL="<YOUR_DOMAIN>"          # e.g. https://<project>.vercel.app
NEXT_PUBLIC_API_URL="<YOUR_API_HOST_URL>"    # e.g. https://noblur-api.up.railway.app
NODE_ENV="production"

# PORT (API server only, default 5000)
PORT="5000"
```

**Keep secrets safe:**
- Never commit `.env` to git
- Use platform secrets (Vercel Environment Variables, Railway/Render/Fly.io secrets)
- Rotate `CRYPTO_SALT` if it's ever exposed

---

## §4. Database Setup

### First Time (Fresh DB)

Run migrations against `DIRECT_URL` (the non-pooled connection), matching the `db:deploy` script in `package.json`:

```bash
npm run db:deploy
# equivalent to: npx prisma migrate deploy
```

### Verify Schema

```bash
psql $DIRECT_URL -c "\dt"

# Expected tables: Job, MediaFile, UsageRecord, PlatformLimit,
#                  EncodingProfile, OnboardingPreference, User, LedgerEntry, Payment
# (User, LedgerEntry, Payment are Phase 2 forward-compat models, not wired to app code yet)
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

## §5. Running the Three Processes

NoBlur is three separate long-running things once deployed. Locally (or on any of the API/worker hosts):

```bash
# Frontend (Next.js) — Vercel handles this in production; locally:
npm run build && npm run start

# API server (Fastify) — listens on $PORT, default 5000
npm run start:server

# Workers (BullMQ: analysis, encode, cleanup-cron — see workers/run-all.ts)
npm run start:workers
```

All three read from `.env` (via `--env-file=.env`) when run with the `start:*` scripts.

---

## §6. Docker Builds

`Dockerfile.api` and `Dockerfile.worker` already exist in the repo root and are the recommended way to deploy the API and workers to Railway/Render/Fly.io.

```bash
# Build images
docker build -f Dockerfile.api -t noblur-api .
docker build -f Dockerfile.worker -t noblur-worker .

# Run API
docker run -e DATABASE_URL=$DATABASE_URL -e DIRECT_URL=$DIRECT_URL -e REDIS_URL=$REDIS_URL \
  -e SUPABASE_S3_ENDPOINT=$SUPABASE_S3_ENDPOINT -e SUPABASE_S3_REGION=$SUPABASE_S3_REGION \
  -e SUPABASE_S3_ACCESS_KEY_ID=$SUPABASE_S3_ACCESS_KEY_ID -e SUPABASE_S3_SECRET_ACCESS_KEY=$SUPABASE_S3_SECRET_ACCESS_KEY \
  -e SUPABASE_UPLOADS_BUCKET=$SUPABASE_UPLOADS_BUCKET -e SUPABASE_OUTPUTS_BUCKET=$SUPABASE_OUTPUTS_BUCKET \
  -e CORS_ORIGINS=$CORS_ORIGINS -e CRYPTO_SALT=$CRYPTO_SALT \
  -p 5000:5000 noblur-api

# Run workers (multiple replicas as needed)
docker run -e DATABASE_URL=$DATABASE_URL -e REDIS_URL=$REDIS_URL \
  -e SUPABASE_S3_ENDPOINT=$SUPABASE_S3_ENDPOINT -e SUPABASE_S3_REGION=$SUPABASE_S3_REGION \
  -e SUPABASE_S3_ACCESS_KEY_ID=$SUPABASE_S3_ACCESS_KEY_ID -e SUPABASE_S3_SECRET_ACCESS_KEY=$SUPABASE_S3_SECRET_ACCESS_KEY \
  -e SUPABASE_UPLOADS_BUCKET=$SUPABASE_UPLOADS_BUCKET -e SUPABASE_OUTPUTS_BUCKET=$SUPABASE_OUTPUTS_BUCKET \
  noblur-worker
```

`Dockerfile.worker` installs `ffmpeg` (verified to include `libsvtav1`), `libopencv-dev`, `python3`, `python3-opencv`, and `python3-numpy`, and validates at build time that `cv2` imports correctly — this is what `lib/opencv_analyze.py` needs at runtime via `python3`/`python`. Whatever platform you choose to host the worker on must run this image (or an equivalent environment with ffmpeg + ffprobe + Python/OpenCV installed) — a bare Node buildpack will not work.

There is no `Dockerfile.web` in the repo; the frontend is deployed to Vercel directly (§2D), not via Docker.

---

## §7. Health Checks & Initial Tests

### API Health

```bash
curl -v https://<YOUR_API_HOST_URL>/health
# Expected: 200 OK (or 503 if unhealthy)
```

### Job Queue Status

```bash
curl https://<YOUR_API_HOST_URL>/api/v1/queue-stats | jq .
# Expected: { "analysisQueue": { "waiting": 0, "active": 0 }, "encodeQueue": { ... } }
```

### Upload → Compress → Download Flow

```bash
# 1. Get presigned upload URL
UPLOAD_RESPONSE=$(curl -X POST https://<YOUR_API_HOST_URL>/api/v1/uploads/presign \
  -H 'Content-Type: application/json' \
  -d '{"filename": "test.mp4", "mimeType": "video/mp4", "sizeBytes": 5242880}')

UPLOAD_URL=$(echo $UPLOAD_RESPONSE | jq -r '.uploadUrl')
FILE_KEY=$(echo $UPLOAD_RESPONSE | jq -r '.fileKey')

# 2. Upload file
curl -X PUT -T test.mp4 "$UPLOAD_URL"

# 3. Create job
JOB_RESPONSE=$(curl -X POST https://<YOUR_API_HOST_URL>/api/v1/jobs \
  -H 'Content-Type: application/json' \
  -d "{\"fileKey\": \"$FILE_KEY\", \"preset\": \"CHAT\", \"fingerprint\": \"test_fp_001\"}")

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.jobId')

# 4. Poll status (wait for completion)
for i in {1..30}; do
  STATUS=$(curl https://<YOUR_API_HOST_URL>/api/v1/jobs/$JOB_ID?fingerprint=test_fp_001 | jq -r '.status')
  echo "Job $JOB_ID: $STATUS"
  [ "$STATUS" = "DONE" ] && break
  sleep 2
done

# 5. Download result
curl $(curl https://<YOUR_API_HOST_URL>/api/v1/jobs/$JOB_ID?fingerprint=test_fp_001 | jq -r '.outputs[0].downloadUrl') \
  -o optimized.mp4
```

**Success criteria:**
- Upload completes in <30s
- Job queues immediately
- Status progresses: QUEUED → ANALYZING → ENCODING → VERIFYING → DONE
- Output file is meaningfully smaller than input
- Download URL works and serves the optimized file

---

## §8. Payment — Not Yet Implemented

Flutterwave integration is a deliberate stub, not a deploy step. `server/routes/billing.ts` routes return HTTP 501, and `FLUTTERWAVE_PUBLIC_KEY` / `FLUTTERWAVE_SECRET_KEY` / `FLUTTERWAVE_WEBHOOK_SECRET` in `.env` are placeholder values only — there is nothing to configure here for launch. Do not treat these as a deployment blocker or expect billing to function until this is built out.

---

## §9. Rollback & Recovery

### If Deployment Fails

```bash
git revert <bad-commit-hash>
git push origin main
# Vercel / Railway / Render / Fly.io auto-redeploy on push if linked to GitHub
```

### If Database Migration Fails

```bash
npx prisma migrate status
npx prisma migrate resolve --rolled-back <migration-name>
# or roll back to a previous schema version manually (consult Prisma docs)
```

---

## §10. Post-Launch Checklist

- [ ] Frontend deployed to Vercel
- [ ] API server deployed (Railway/Render/Fly.io)
- [ ] Workers deployed (Railway/Render/Fly.io), using `Dockerfile.worker` or equivalent with ffmpeg + Python/OpenCV
- [ ] Supabase Postgres + Storage buckets provisioned
- [ ] Upstash Redis provisioned
- [ ] Environment variables set on all three services (frontend/API/workers)
- [ ] `DIRECT_URL` set and migrations applied via `npm run db:deploy`
- [ ] Health checks passing (`/health`, `/api/v1/queue-stats`)
- [ ] Sample upload → compress → download flow tested end-to-end
- [ ] `CORS_ORIGINS`, `NEXT_PUBLIC_APP_URL` updated once a real (or temporary `.vercel.app`) domain is chosen; `lib/seo.ts` and `lib/whatsapp-share.ts` updated separately in code
- [x] Sentry — initialized (instrumentation.ts, sentry.server.config.ts, sentry.edge.config.ts)
- [ ] Analytics tracking verified (PostHog events firing), if configured

---

See [OPERATIONS.md](./OPERATIONS.md) for runbooks, monitoring, and scaling procedures.
