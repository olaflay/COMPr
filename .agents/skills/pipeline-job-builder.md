
# skills/pipeline-job-builder.md

```yaml
---
name: Pipeline Job Builder
description: |
  Trigger on anything that runs in the worker: pipeline stages, job types, 
  queue processors, or export. Teaches job granularity, the encoding loop 
  with dual retry paths, and completion notification.
---

This skill teaches how to construct a BullMQ worker processor that orchestrates 
the media pipeline. It enforces the dual retry paths, the max 2 retries rule, 
and the strict separation of size and quality failures. Its laws live in 
`workflow-pipeline.md` and `AGENTS.md`.

## Procedure

1. **Define the job data schema.**
   The queue payload must contain `inputPath`, `outputDir`, `targetSizeMB`, 
   `presetMaxHeight`, and `jobId`. No file content.

2. **Stage 1: Analysis (probe).**
   Call `ffprobe` to extract duration, resolution, and audio channels. 
   Verify the file is readable. (workflow-pipeline.md §6)

3. **Stage 2: Compute parameters.**
   Call `calculateBitrate` and `chooseInitialResolution`. Never upscale 
   source. (workflow-pipeline.md §3)

4. **Stage 3: Encoding loop (1 initial + 2 retries max, per FR-7).**
   For attempt 0, 1, 2 (initial encode plus up to 2 retries total across both paths):
   - Run `encode` with the current resolution and bitrate.
   - Measure output size. If size tolerance failed, trigger the 
     size-retry path (adjust bitrate, re-encode).
   - Measure SSIM (fixed 2‑second intervals). If SSIM < 0.90, trigger 
     the quality-retry path (drop one resolution tier, recalc bitrate).
   - If both pass, break.
   (workflow-pipeline.md §4, PRD FR-7 — max 2 retries total, not 3)

5. **Stage 4: Store output metadata.**
   Save the final output path, actual size, SSIM score, and attempt history 
   to the database via Prisma.

6. **Stage 5: Notify completion.**
   Update job status to `DONE` and emit a PostHog event.

## Code Skeleton (key patterns)

```typescript
// workers/encode-worker.ts
import { Worker } from 'bullmq';
import { runPipeline } from '../lib/pipeline';

const worker = new Worker('media-encode', async (job) => {
  const { inputPath, outputDir, targetSizeMB, presetMaxHeight } = job.data;

  const result = runPipeline({
    inputPath,
    outputDir,
    targetSizeMB,
    presetMaxHeight,
    tolerancePct: TOLERANCE_PCT,    // from config/platform-limits.json, PRD §31 assumption
    ssimFloor: SSIM_FLOOR,          // from config/platform-limits.json, PRD §31 assumption
  });

  // If max retries reached without meeting both targets, return the best
  // achieved result transparently — do NOT throw. Per PRD §25, show the user
  // what was achieved (e.g., "We got as close as possible: 18.2MB instead of
  // your 16MB target, because going smaller would have visibly hurt quality").
  const bestAttempt = result.attempts[result.attempts.length - 1];
  if (!bestAttempt.sizeWithinTolerance || !bestAttempt.qualityOk) {
    return { ...result, partialSuccess: true, bestAttempt };
  }

  return result;
}, { 
  concurrency: 1 // Per vCPU, per PRD §19
});
