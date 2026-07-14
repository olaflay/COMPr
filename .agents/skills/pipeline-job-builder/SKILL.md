---
name: pipeline-job-builder
description: Use for anything that runs in the worker pool — pipeline stages, BullMQ job types, queue processors, batch/segment handling, or the download/export stage. Covers job granularity, the gates that must pass before an encode runs, segment (Status-split) semantics, and export output shape.
---

# Pipeline Job Builder

Teaches the order of gates a job must clear before compute is spent on it,
how a job is broken into stages and (sometimes) segments, and what the
final export step must produce. Laws live in `workflow-pipeline.md`,
`uploads-and-storage.md`, and PRD §13, §16, §19.

## Procedure

1. **Confirm which queue the job belongs to.** `media-analysis` for
   lightweight probing, `media-encode` for the FFmpeg pass — they're
   separate so encode concurrency can be tuned independently
   (`workflow-pipeline.md`, PRD §19). Don't merge them into one queue for convenience.

2. **Clear the gates in this order before any FFmpeg process starts** —
   these are compute-cost gates, cheapest checks first:
   - **Format/magic-byte gate:** verify real file type server-side, reject
     corrupt/unreadable files immediately (`security.md`, PRD §13 step 2).
   - **Size-ceiling gate:** reject anything over the tier's max upload size
     (100MB free / 500MB premium) before touching the file further (PRD §10).
   - **Quota/exemption gate:** the job-creation route already resolved this,
     but the worker re-checks the job's `isPremium`/exemption flags before
     spending encode time — never assume the queue only contains valid jobs.
   A job that fails any gate is marked `FAILED` with the matching error
   code from PRD §25 — it never reaches the encode stage.

3. **Run the stage sequence: `queued → analyzing → encoding → verifying`.**
   Update `Job.status` at each transition so the goal-gradient progress
   display has real state to map against (FR-8, `lib/progress-stages.ts`).
   Never skip a stage or batch multiple stage transitions into one update.

4. **Decide granularity: one job, or a job that fans into segments.**
   Segmentation only triggers for WhatsApp Status video over the
   config-table duration ceiling (currently 90s) — it's a minority case,
   not the default shape of a job (PRD §16, workflow-pipeline.md). When it
   triggers: split at fixed intervals first, then run the full
   analyze→encode→verify sequence independently per segment. Each segment
   gets its own `MediaFile` row with `segmentIndex` set (PRD §21 schema).

5. **Batch uploads (premium multi-file) run as independent jobs, not one
   combined job.** Each file in a batch gets its own `Job` row and goes
   through the full gate sequence independently — one file failing gates or
   encoding does not block or fail the others (PRD FR-1, §27's batch
   description implies per-file independence, consistent with the
   per-segment independence pattern in step 4).

6. **Apply the two retry paths only inside the `encoding`/`verifying`
   stages, never before the gates in step 2.** Size-triggered and
   quality-triggered retries are separate paths, capped at 2 combined
   (`workflow-pipeline.md`, FR-7) — see that skill's rules file for the
   exact mechanics; this skill only tells you where in the job lifecycle
   they belong.

7. **Export/download stage:** once `verifying` passes, push the output to
   the R2 outputs bucket, return a presigned download URL, and mark
   `Job.status = DONE`. For a segmented job, produce one downloadable
   segment per part plus a "download all as zip" option (FR-9). The
   response always carries both the size comparison and the before/after
   frame reference needed by the client — size alone is never sufficient (FR-9).

8. **On any unrecoverable failure, mark `FAILED` with an `errorMessage`**
   from the PRD §25 table, log to Sentry with job metadata only — never
   file content (`security.md`, PRD §25).

## Code skeleton

```typescript
// workers/encode-worker.ts
async function processEncodeJob(job: BullMQJob) {
  // 1-2. Gates — cheapest first, before any FFmpeg process
  const validation = await validateFileType(job.data.fileKey);   // magic bytes
  if (!validation.ok) return failJob(job, 'CORRUPT_FILE');

  if (job.data.sizeBytes > getMaxSizeForTier(job.data.isPremium)) {
    return failJob(job, 'SIZE_CEILING_EXCEEDED');
  }

  const usage = await reconfirmQuota(job.data.fingerprintHash);
  if (!usage.allowed) return failJob(job, 'QUOTA_EXCEEDED');

  // 3. Stage sequence
  await setJobStatus(job.id, 'ANALYZING');
  const probe = await probe(job.data.fileKey);

  await setJobStatus(job.id, 'ENCODING');
  // 4. Granularity check
  const needsSplit = probe.mediaKind === 'VIDEO'
    && probe.durationSec > getStatusDurationCeiling();

  const segments = needsSplit
    ? await splitAndEncodeEach(probe)   // independent pipeline per segment
    : [await runPipeline(probe)];       // single pipeline run

  await setJobStatus(job.id, 'VERIFYING');
  // 5. retries happen inside runPipeline/splitAndEncodeEach, not here

  // 6. Export
  const outputs = await pushOutputsToR2(segments);
  await setJobStatus(job.id, 'DONE');
  return outputs;
}
```

## Traps

- Running the FFmpeg encode before the magic-byte/size/quota gates — wastes
  compute on a job that was always going to be rejected.
- Treating a batch upload as one job with multiple files inside it instead
  of N independent jobs — one bad file then fails the whole batch.
- Splitting a Status video by duration alone without checking the boundary
  case at exactly 90s — PRD §26 names 89/90/91s explicitly as a required test.
- Skipping a stage-status update ("just set it to DONE at the end") — breaks
  the goal-gradient progress display, which depends on real stage transitions.
- Letting a segment's failure crash the whole segmented job instead of
  handling it as an independent unit.

## Verify before done

- [ ] All three gates (format, size, quota) run and can independently fail the job before encoding starts.
- [ ] Every stage transition (`queued/analyzing/encoding/verifying/done`) is written to `Job.status`, none skipped.
- [ ] Segmentation only triggers over the config-table duration ceiling, never a hardcoded value.
- [ ] Batch/segment items fail independently, not as a block.
- [ ] Export output includes both size comparison and before/after frame data, not size alone.
- **Tests to write:** a gate-rejection test per gate (corrupt file, oversized file, exhausted quota), a boundary test at 89/90/91s for split triggering, and a test confirming one failed item in a batch/segment set doesn't fail the others.
