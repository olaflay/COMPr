# Vecteus Product Requirements Document (PRD)

**Version:** 2.0  
**Product Name:** Vecteus (`@vecteus/core`)  
**Product Type:** Headless, Zero-Egress Media Ingestion and Perceptual Compression Engine  
**Target Market:** B2B SaaS, LMS Platforms, Remote Inspection, Field Operations, and UGC Marketplaces  
**Baseline Operating Economics:** $0.00 Infrastructure Baseline (Docker, Cloudflare R2 Free Tier, Supabase Free Tier, Upstash Free Redis, Local Worker)

---

## 1. Executive Summary & Core Value Proposition

Vecteus is a developer-native, headless media ingestion proxy that eliminates video storage and bandwidth bill shock for software companies. It intercepts media uploads at the edge via standard S3-compatible endpoints, compresses payloads by 65% to 80% using closed-loop SVT-AV1 and libx264 transcoding with automated VMAF validation, and writes the optimized artifacts directly into customer-owned storage buckets.

### One-Sentence Value Proposition
> Vecteus cuts software video processing, storage, and egress bills in half by compressing user uploads up to 80% with guaranteed perceptual clarity before files hit cloud storage.

---

## 2. Orthogonal Tension Goals (Paired Metric Contracts)

In distributed media infrastructure, optimizing any single metric in isolation produces catastrophic failure modes. Vecteus enforces four coupled engineering contracts that balance opposing operational and economic vectors:

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
* **The Contradiction:** Extreme compression (e.g. SVT-AV1 preset 2) can achieve 85% byte reduction but requires 15x real-time CPU compute, destroying worker economics. Fast encoding (preset 12) saves CPU but saves negligible bandwidth.
* **Service Level Indicator (SLI):**
  * Byte Reduction: `(sourceSizeBytes - outputSizeBytes) / sourceSizeBytes * 100`
  * Compute Utilization Factor: `workerCpuSeconds / sourceDurationSec`
* **Service Level Objective (SLO):**
  * Deliver `>= 65.0%` average byte reduction across all video jobs while worker compute factor remains `<= 1.25x` real-time duration on reference hardware.
* **Error Budget:** `1.0%` of jobs on noisy, chaotic, or non-compressible media (e.g., film grain, confetti) may return less than 65% reduction to protect quality.

### Goal Pair 2: Perceptual Quality Floor vs. Transcode Latency
* **The Contradiction:** Retrying encodes multiple times guarantees high visual fidelity but saturates job queues and creates unacceptable turnaround latency for end users.
* **Service Level Indicator (SLI):**
  * Objective Perceptual Quality: Harmonic mean VMAF score across sampled frame sequences.
  * Turnaround Latency: Total elapsed duration from `ingest.complete` to `job.completed` webhook.
* **Service Level Objective (SLO):**
  * Output VMAF score `>= 92.0` (visually indistinguishable from source to human eyes) with `p90` end-to-end turnaround latency `<= 1.5x` source video duration. Maximum 1 automated CRF step-down retry per job.
* **Error Budget:** `0.2%` of extreme high-motion clips may step down to VMAF `88.0` to prevent queue starvation.

### Goal Pair 3: Network Ingest Resilience vs. Gateway Memory Overhead
* **The Contradiction:** Buffering and parsing chunked uploads from thousands of intermittent mobile devices can quickly exhaust API gateway memory and degrade event-loop latency.
* **Service Level Indicator (SLI):**
  * Resumable Completion Success: Percentage of chunked uploads completing without data loss over lossy connections (10% simulated packet drop, 400ms latency).
  * API Gateway Heap Footprint: `process.memoryUsage().heapUsed` on the Fastify ingestion process.
* **Service Level Objective (SLO):**
  * `100%` byte recovery on interrupted uploads while API gateway resident heap stays `<= 64MB` under 500 concurrent presigned sessions (enforced by direct client-to-storage streaming).
* **Error Budget:** `0%` data corruption. Client upload timeout allowance: 60 minutes.

### Goal Pair 4: Economic Arbitrage vs. Cloud Egress Overhead
* **The Contradiction:** Providing transcode infrastructure can expose the operator to catastrophic bandwidth bills if media bytes proxy through the application server or egress through traditional AWS/GCP zones.
* **Service Level Indicator (SLI):**
  * Tenant Cost Reduction: `(Tenant Previous Cost - Vecteus Cost) / Tenant Previous Cost * 100`
  * Vecteus Egress Cost per Gigabyte: Total egress bill divided by processed gigabytes.
* **Service Level Objective (SLO):**
  * Tenant savings `>= 60.0%` vs Mux/Cloudinary while Vecteus internal egress cost remains `$0.0000 per GB` by enforcing Cloudflare R2 and tenant-direct S3 presigned routing.
* **Error Budget:** `0%` billable cloud egress permitted through internal compute nodes.

---

## 3. System Anti-Goals and Architectural Boundaries

To preserve zero-cost viability and protect operational stability, Vecteus strictly defines what it refuses to do:

### Anti-Goal 1: No Live WebRTC or Real-Time Interactive Streaming
* **Boundary:** Vecteus processes asynchronous, nearline media uploads only.
* **Architectural Rationale:** Real-time WebRTC transcoding requires sub-200ms latency, which forces low-efficiency zero-latency encoding modes (x264 ultrafast) that sacrifice 50% of potential compression efficiency. Nearline processing allows multi-frame lookahead, 10-bit AV1 rate control, and closed-loop VMAF verification.

### Anti-Goal 2: No Long-Term File or Video Playback Hosting
* **Boundary:** Output media is committed directly into the customer private S3/R2 storage bucket. Intermediate staging files are deleted within 60 minutes of completion.
* **Architectural Rationale:** Hosting customer videos long-term transforms Vecteus into a storage and CDN company, incurring balance-sheet liability, egress risk, and data sovereignty compliance headaches (GDPR, HIPAA, SOC 2). Customers retain full ownership of their data.

### Anti-Goal 3: No Proprietary Client SDK Enforced
* **Boundary:** Vecteus endpoints speak standard AWS S3 REST Multipart and HTTP PUT protocols.
* **Architectural Rationale:** Requiring mobile and frontend developers to bundle a proprietary Vecteus SDK creates adoption friction, app-store update lags, and dependency bloat. By speaking standard S3 presigned wire commands, existing client upload logic works with zero changes.

### Anti-Goal 4: No Resolution Upscaling or Generative AI Hallucination
* **Boundary:** Output resolution is clamped to source dimensions: `outputWidth <= sourceWidth` and `outputHeight <= sourceHeight`. No AI diffusion upscaling or super-resolution filters are executed.
* **Architectural Rationale:** Upscaling introduces artificial artifacts, inflates bitrates with fake pixels, and consumes massive GPU memory. Vecteus is purely deterministic mathematical rate-distortion optimization.

### Anti-Goal 5: No Lossy Audio Downsampling Below 96kbps AAC
* **Boundary:** Audio streams are normalized to 96-128kbps stereo AAC and never crushed below 96kbps.
* **Architectural Rationale:** Video compression savings come from video pixels (which make up 95% of total payload bytes). Crushing audio to 32kbps saves negligible space while introducing metallic speech distortion that immediately fails human quality evaluations.

---

## 4. Developer Value Milestones and Economic Proof

```
[Day 0: Drop-In Ingest] ────► [Day 30: Bill Deflation] ────► [Day 90: Scale Invariance]
   Zero SDK rewrite;             65% storage drop verified;     100k mins processed;
   S3 endpoint changed.          Invoice halved vs Mux.         Zero worker OOMs.
```

### Developer Value Milestones
* **Day 0 (Drop-In Ingestion):** The tenant backend points its S3 presigned client to Vecteus. First user video streams through the gateway with zero client app modifications.
* **Day 30 (Bill Deflation Proof):** The tenant compares their month-over-month AWS S3 storage line item and Mux invoice, observing a verified 65% to 80% reduction in storage accumulation and zero egress penalties.
* **Day 90 (Production Scale Invariance):** Tenant traffic surges 5x during a product campaign. Vecteus queues absorb the burst without worker crashes, thread starvation, or billing rate-limit lockouts.

### Empirical Economic Arbitrage Model

| Monthly Volume (Mins) | Mux / Cloudinary Cost ($0.05/min) | Vecteus Plan | Vecteus Compute COGS | Vecteus Gross Margin | Tenant Savings |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **10,000 mins** | $500 / month | $199 / month | $16.20 | **91.8%** | **60.2% ($301/mo)** |
| **50,000 mins** | $2,500 / month | $799 / month | $81.00 | **89.8%** | **68.0% ($1,701/mo)** |
| **200,000 mins** | $10,000 / month | $2,499 / month | $324.00 | **87.0%** | **75.0% ($7,501/mo)** |

#### COGS Assumptions (Zero-Dollar & Dedicated Infrastructure Baseline)
* **Compute:** 8 vCPU dedicated AMD host at ~$70/mo processes ~75,000 video minutes/month at 60% average load ($0.00162 per minute).
* **Storage:** Staging buffer uses Cloudflare R2 Free Tier (10GB active buffer, $0 egress). Long-term storage is zero cost to Vecteus (deposited directly in tenant bucket).
* **Database & Queue:** Supabase free PostgreSQL + local/Upstash Redis.

---

## 5. Deterministic Verification Gate

To ensure continuous adherence to these goals without subjective human evaluation, CI runs automated deterministic verification:

1. **Mathematical Invariant Assertion (`npm run verify:pipeline`):**
   * Verifies 16px macroblock alignment on non-standard source geometries.
   * Asserts calculated bitrate achieves `>= 60%` theoretical file size reduction on reference 1080p clips.
   * Proves closed-loop VMAF gate logic: passing score `>= 90.0` proceeds without re-encode; score `< 90.0` triggers CRF reduction of 3.
   * Validates HMAC-SHA256 webhook cryptographic signature integrity.
2. **Type Safety & Schema Integrity (`npm run typecheck`):**
   * `tsc --noEmit` must exit with code 0 across all gateway, worker, and test modules.
3. **End-to-End Test Suite (`npm test`):**
   * 154+ unit and integration tests must pass with 0 failures under isolated, network-mocked environments.
