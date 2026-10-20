# Vecteus (`@vecteus/core`)

> Headless, zero-egress media ingestion and perceptual compression proxy. Drops into existing S3 pipelines, shrinking video storage and bandwidth costs by 65% to 80% with automated VMAF quality verification.

**Status:** v2.0 Architecture Pivot (B2B Infrastructure Engine). All unit tests passing. Fully operational on zero-cost cloud tiers.

---

## Architecture Overview

```
[ Client Mobile/Web App ] 
         │ (Direct Presigned Upload)
         ▼
[ S3 / Cloudflare R2 Staging ] 
         ▲
         │ (Job Triggers)
[ Vecteus Ingestion Gateway (Fastify) ] ──BullMQ──► [ Vecteus Transcoder Worker ]
                                                          │
                                                    (Perceptual VMAF Gate)
                                                    (SVT-AV1 / libx264)
                                                          │
                                                          ▼
                                            [ Tenant S3 / R2 Bucket ]
                                                          │
                                                    (Signed Webhook)
                                                          ▼
                                            [ Tenant Backend Server ]
```

---

## Core Capabilities

1. **Direct S3/R2 Presigned Broker:** Issues client-side chunked upload URLs directly to storage, keeping multi-gigabyte video streams off your API servers.
2. **Perceptually-Gated Closed Loop:** Runs SVT-AV1 or libx264 with an automated VMAF validation step (target score >= 92.0). Re-encodes adaptively if perceptual quality falls below threshold.
3. **Zero-Egress Direct Delivery:** Transcoded media is deposited directly into the tenant-owned S3 or Cloudflare R2 bucket.
4. **Hardware Sandboxing:** Workers run inside strict Linux cgroups memory allocations (768MB RAM ceiling) with thread throttling, preventing host out-of-memory crashes on low-spec or free-tier machines.
5. **Signed Outbound Webhooks:** Sends cryptographic HMAC-SHA256 authenticated event notifications (`job.completed`, `job.failed`) to your backend.

---

## Quickstart (Zero-Cost Local Dev)

### 1. Prerequisites
* Node.js 22+ (`node --version`)
* Docker & Docker Compose
* FFmpeg 6+ with SVT-AV1 and libvmaf support

### 2. Environment Setup
```bash
cp .env.example .env
# Configure DATABASE_URL, REDIS_URL, and S3/R2 storage credentials
```

### 3. Run Distributed Stack
```bash
# Start Postgres & Redis
docker-compose up -d postgres redis

# Run database migrations
npm run db:deploy

# Start API Ingestion Gateway (Fastify)
npm run start:server

# Start Transcoding & Webhook Workers
npm run start:workers
```

### 4. Verify Pipeline
```bash
npm run typecheck
npm test
npm run verify:pipeline
```

---

## API Reference

### 1. Create Ingestion Job
```bash
curl -X POST http://localhost:5000/v1/ingest/presign \
  -H "X-Vecteus-Key: vct_live_demo123" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "demo.mp4",
    "mimeType": "video/mp4",
    "sizeBytes": 52428800,
    "targetVmaf": 92.0
  }'
```

Response:
```json
{
  "jobId": "vec_job_01H...",
  "uploadUrl": "https://staging.vecteus.dev/uploads/...",
  "storageKey": "staging/vec_job_01H/source.mp4"
}
```

### 2. Complete Upload & Begin Encoding
```bash
curl -X POST http://localhost:5000/v1/ingest/complete \
  -H "X-Vecteus-Key: vct_live_demo123" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "vec_job_01H..."
  }'
```

### 3. Inspect Job Status
```bash
curl -X GET http://localhost:5000/v1/jobs/vec_job_01H... \
  -H "X-Vecteus-Key: vct_live_demo123"
```

---

## Zero-Cost Stack Compatibility
* **Storage:** Cloudflare R2 (10GB free, $0 egress fees)
* **Database:** Supabase PostgreSQL (500MB free tier)
* **Queue:** Upstash Redis or local Docker Redis container
* **Workers:** Local host or 1 vCPU / 1GB RAM cloud instances
