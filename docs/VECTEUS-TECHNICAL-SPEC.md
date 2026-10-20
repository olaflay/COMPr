# Vecteus Technical Specification: Core Distributed Architecture

## 1. Executive Summary & Product Invariants
Vecteus (`@vecteus/core`) is a developer-native, headless media ingestion and perceptual compression proxy. It sits between client upload frontends and cloud object storage (AWS S3, Cloudflare R2, MinIO). By applying closed-loop SVT-AV1 and libx264 perceptual transcoding with automated VMAF validation, Vecteus reduces video file sizes by 65% to 80% with zero perceived visual degradation, eliminating bandwidth markups and storage costs.

### Non-Negotiable System Invariants
1. **Source Immutability:** Raw incoming media payloads are strictly read-only and deleted from intermediate staging within 60 minutes of completion.
2. **Closed-Loop Perceptual Gate:** No video artifact is published to customer destination storage unless it meets or exceeds the configured VMAF quality threshold (default: 92.0).
3. **Zero-Egress Routing:** Video bytes never proxy through the core API server. Direct uploads stream from client to presigned storage buckets; output writes stream directly from worker to destination storage.
4. **Hard Memory Ceilings:** Worker child process trees are strictly bounded to 768MB RAM via Linux cgroups v2, preventing host OOM crashes on low-spec or free-tier deployments.
5. **Deterministic Error Separation:** Transient failures (OOM, network reset) trigger a single step-down retry; permanent failures (bitstream corruption, unsupported format) terminate immediately without retries.

---

## 2. Orthogonal Tension Goals (Paired Metric Contracts)

```
+-----------------------------------+-----------------------------------+
| Vector A: Quality & Savings       | Vector B: Compute & Resource Cost |
+-----------------------------------+-----------------------------------+
| 1. Compression vs Compute Budget  | BD-Rate >= 65%  |  CPU <= 1.25x RT|
| 2. Perceptual Floor vs Latency    | VMAF >= 92.0    |  p90 Turnaround |
| 3. Ingest Resilience vs Memory    | 100% Resumable  |  Heap <= 64MB   |
| 4. Economic Arbitrage vs Egress   | 60%+ Savings    |  $0.00 Egress   |
+-----------------------------------+-----------------------------------+
```

### Goal Pair 1: Compression Efficiency vs. Compute Budget
* **Contradiction:** Extreme compression modes (preset 2) can achieve 85% byte reduction but require 15x real-time CPU compute. Fast encoding modes save CPU but waste bandwidth.
* **SLI:** `(sourceSizeBytes - outputSizeBytes) / sourceSizeBytes` vs `workerCpuSeconds / sourceDurationSec`.
* **SLO:** Deliver `>= 65.0%` average byte reduction across all video jobs while worker compute factor remains `<= 1.25x` real-time duration on reference hardware.
* **Error Budget:** `1.0%` of jobs on noisy or non-compressible media may return less than 65% reduction to protect quality.

### Goal Pair 2: Perceptual Quality Floor vs. Transcode Latency
* **Contradiction:** Retrying encodes multiple times guarantees high visual fidelity but saturates job queues and creates unacceptable turnaround latency.
* **SLI:** Harmonic mean VMAF score vs total elapsed job duration.
* **SLO:** Output VMAF score `>= 92.0` with `p90` turnaround latency `<= 1.5x` source video duration. Maximum 1 automated CRF step-down retry per job.
* **Error Budget:** `0.2%` of extreme high-motion clips may step down to VMAF `88.0` to prevent queue starvation.

### Goal Pair 3: Network Ingest Resilience vs. Gateway Memory Overhead
* **Contradiction:** Buffering and parsing chunked uploads from thousands of intermittent mobile devices can quickly exhaust API gateway memory and degrade event-loop latency.
* **SLI:** Resumable chunk completion rate over 10% simulated packet drop vs Fastify event-loop p99 heap allocation.
* **SLO:** `100%` byte recovery on interrupted uploads while API gateway resident heap stays `<= 64MB` under 500 concurrent presigned sessions.
* **Error Budget:** `0%` data corruption. Client upload timeout allowance: 60 minutes.

### Goal Pair 4: Economic Arbitrage vs. Cloud Egress Overhead
* **Contradiction:** Processing media can expose the operator to catastrophic bandwidth bills if media bytes proxy through internal compute nodes.
* **SLI:** Tenant cost reduction % vs Vecteus internal egress cost per gigabyte.
* **SLO:** Tenant savings `>= 60.0%` vs Mux/Cloudinary while Vecteus internal egress cost remains `$0.0000 per GB` via direct Cloudflare R2 and tenant S3 presigned routing.
* **Error Budget:** `0%` billable cloud egress permitted through internal compute nodes.

---

## 3. System Anti-Goals and Architectural Boundaries

1. **No Live WebRTC or Real-Time Streaming:** Vecteus strictly processes asynchronous nearline media uploads. Real-time sub-second streaming forces low-efficiency encoding (x264 ultrafast) that sacrifices 50% of compression gains.
2. **No Long-Term File or Video Hosting:** Output media is committed directly into the customer private S3/R2 storage bucket. Intermediate staging files are deleted within 60 minutes. Vecteus does not store customer video assets long-term.
3. **No Proprietary Client SDK Enforced:** Vecteus speaks standard AWS S3 REST Multipart and HTTP PUT protocols. Existing client applications integrate by changing upload endpoints without adding new SDK packages.
4. **No Resolution Upscaling or AI Hallucination:** Output resolution is strictly clamped to source dimensions (`outputWidth <= sourceWidth`). No generative super-resolution or diffusion upscaling is permitted.
5. **No Lossy Audio Downsampling Below 96kbps AAC:** Audio streams are normalized to 96-128kbps stereo AAC and never crushed below 96kbps, protecting human voice and musical clarity.

---

## 4. Developer Value Milestones and Economic Proof

### Developer Value Milestones
* **Day 0 (Drop-In Ingestion):** Tenant backend points S3 presigned client to Vecteus. First video compresses with zero client-side SDK changes.
* **Day 30 (Bill Deflation Proof):** Tenant verifies a 65% to 80% reduction in month-over-month AWS S3 storage accumulation and zero egress penalties.
* **Day 90 (Production Scale Invariance):** Tenant traffic surges 5x. Queues absorb load without worker crashes, thread starvation, or billing rate-limit lockouts.

### Empirical Economic Arbitrage Model

| Monthly Volume (Mins) | Mux / Cloudinary Cost ($0.05/min) | Vecteus Plan | Vecteus Compute COGS | Vecteus Gross Margin | Tenant Savings |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **10,000 mins** | $500 / month | $199 / month | $16.20 | **91.8%** | **60.2% ($301/mo)** |
| **50,000 mins** | $2,500 / month | $799 / month | $81.00 | **89.8%** | **68.0% ($1,701/mo)** |
| **200,000 mins** | $10,000 / month | $2,499 / month | $324.00 | **87.0%** | **75.0% ($7,501/mo)** |

---

## 5. Wire Protocol & API Specifications

### HTTP Authentication
All requests to the Vecteus Ingest Gateway require the tenant API key header:
`X-Vecteus-Key: vct_live_...` (or `X-Vectis-Key` for backwards compatibility)

### Ingestion Endpoints

#### `POST /v1/ingest/presign`
Generates a chunked presigned upload URL directly to storage.
* **Request Payload:**
  ```json
  {
    "filename": "customer-video.mp4",
    "mimeType": "video/mp4",
    "sizeBytes": 52428800,
    "targetVmaf": 92.0,
    "maxBitrateKbps": 4000,
    "segmentDurationSec": null,
    "storageDestinationId": "dest_clp1234..."
  }
  ```
* **Response (HTTP 200 OK):**
  ```json
  {
    "jobId": "vec_job_01HXYZ...",
    "uploadUrl": "https://staging.vecteus.dev/uploads/...",
    "storageKey": "staging/vec_job_01HXYZ/source.mp4",
    "expiresAt": "2026-10-18T00:30:00.000Z"
  }
  ```

#### `POST /v1/ingest/complete`
Signals upload completion and triggers the BullMQ processing pipeline.
* **Request Payload:**
  ```json
  {
    "jobId": "vec_job_01HXYZ..."
  }
  ```
* **Response (HTTP 202 Accepted):**
  ```json
  {
    "jobId": "vec_job_01HXYZ...",
    "status": "QUEUED",
    "queuePosition": 1
  }
  ```

#### `GET /v1/jobs/:jobId`
Returns telemetry, progress, and performance metrics.
* **Response (HTTP 200 OK):**
  ```json
  {
    "jobId": "vec_job_01HXYZ...",
    "status": "COMPLETED",
    "sourceSizeBytes": 52428800,
    "outputSizeBytes": 12850200,
    "savingsPercent": 75.5,
    "vmafScore": 93.8,
    "ssimScore": 0.976,
    "durationSec": 45.2,
    "completedAt": "2026-10-17T22:45:10.000Z"
  }
  ```

---

## 6. Outbound Webhook Specification

Upon job completion or terminal failure, Vecteus dispatches an HTTP POST request to the tenant webhook endpoint.

### Security Headers
* `X-Vecteus-Signature`: Hex-encoded HMAC-SHA256 signature calculated over the raw request body using the tenant webhook secret.
* `X-Vecteus-Timestamp`: Unix timestamp (seconds) of dispatch for replay attack mitigation.

### Payload Schema (`job.completed`)
```json
{
  "event": "job.completed",
  "jobId": "vec_job_01HXYZ...",
  "tenantId": "ten_99482...",
  "source": {
    "sizeBytes": 52428800,
    "durationSec": 45.2,
    "width": 1920,
    "height": 1080,
    "format": "mp4"
  },
  "output": {
    "sizeBytes": 12850200,
    "savingsPercent": 75.5,
    "vmafScore": 93.8,
    "ssimScore": 0.976,
    "codec": "libsvtav1",
    "storageUri": "s3://tenant-production-bucket/videos/vec_job_01HXYZ.mp4"
  },
  "completedAt": "2026-10-17T22:45:10.000Z"
}
```

---

## 7. Deterministic Verification Gate
Continuous verification runs on every CI commit:
1. `npm run typecheck` (`tsc --noEmit` exit 0).
2. `npm run verify:pipeline` (proves 16px macroblock alignment, >= 60% size reduction arithmetic, closed-loop VMAF gate logic, and HMAC-SHA256 signatures).
3. `npm test` (154 unit and integration tests passing with zero failures).
