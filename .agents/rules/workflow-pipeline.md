---
trigger: always_on
---

Governs the FFmpeg/ffprobe processing pipeline and the BullMQ worker cluster (`lib/pipeline.ts`, `lib/bitrate.ts`, `lib/resolution.ts`, `workers/`).

## Closed-Loop Quality Verification

- VMAF is the primary quality gate for Vecteus transcoding jobs.
- The standard VMAF quality floor is 90.0 (or tenant-configured `targetVmaf`).
- If an encode scores below the target threshold:
  1. The pipeline executes a single automated retry with CRF reduced by 3 (or step down one resolution tier).
  2. Maximum 1 quality retry per job is permitted to protect worker queue capacity.
- SSIM is sampled as a secondary structural metric.
- Never publish an output artifact to the tenant destination storage bucket if quality validation fails.

## Codec and Bitrate Governance

- Never upscale media beyond its source resolution.
- SVT-AV1 (`libsvtav1`) is the primary codec for maximum byte reduction.
- libx264 (`libx264`) is the universal compatibility codec.
- H.265 (HEVC) remains disabled to avoid patent licensing risks on client playback devices.
- SVT-AV1 execution must maintain thread limits (`lp=2`, lookahead 16) to prevent container memory saturation.

## Queue & Failure Architecture

- Separate BullMQ queues:
  * `vecteus:queue:analysis`: Frame sampling and stream probing.
  * `vecteus:queue:transcode`: CPU-intensive encoding.
  * `vecteus:queue:verify`: VMAF and SSIM quality computation.
  * `vecteus:queue:dispatch`: Destination write and webhook POST.
- Failure classification:
  * Transient failures (OOM, container eviction, storage socket timeout): Retry once with step-down preset (preset 8 to 10).
  * Permanent failures (corrupted container, invalid audio track, demuxer panic): Fail immediately without retries and dispatch `job.failed` webhook.
- Stalled jobs: BullMQ active lock renewal ensures that if a worker container restarts, pending jobs are automatically recovered and resumed.

## Definition of Done (Pipeline Level)

- [ ] Closed-loop VMAF verification enforced prior to destination dispatch.
- [ ] No upscale beyond source dimensions.
- [ ] Worker processes conform to 768MB memory limits.
- [ ] Failure classification (transient vs permanent) strictly maintained.
- [ ] No em dashes or double hyphens used in any comments or documentation.
