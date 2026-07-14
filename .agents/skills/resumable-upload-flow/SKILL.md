---
name: resumable-upload-flow
description: Use for anything on the resumable/chunked upload path — client-side chunking, presigned upload requests, interruption/resume handling, or upload-completion confirmation. Triggers on "upload," "resume," "chunk," "tus," "interrupted."
---

# Resumable Upload Flow

Teaches the exact handshake sequence for a resumable upload, required
because the primary launch market has variable 3G/4G connectivity (PRD §10)
and this is a Phase 1 hard requirement, not best-effort. Laws live in
`uploads-and-storage.md` and PRD §10, §11, §13.

## Procedure

1. **Client-side validation happens before any network call.** Check format
   and size against the tier ceiling (100MB free / 500MB premium) locally,
   fast-fail with a plain-language message before upload begins (PRD §11
   step 4, §25's error table).

2. **Request the presigned upload URL only after local validation passes.**
   `POST /uploads/presign` with `{ filename, mimeType, sizeBytes }`, get
   back `{ uploadUrl, fileKey, expiresAt }` with a 60-minute expiry
   (PRD §18, `r2-storage-handler`'s key-creation step already covers the
   server side of this — this skill covers the client-side sequencing).

3. **Upload in chunks with checkpoints, not a single PUT.** Use a
   resumable protocol (tus, or multipart with resume support) so progress
   is tracked chunk-by-chunk, not as one all-or-nothing transfer (PRD §10).

4. **Show upload progress as it happens**, distinct from job-processing
   progress — this is the upload progress bar in PRD §11 step 7, not the
   goal-gradient job progress (that's `growth-and-quota-engine`'s concern).

5. **On interruption, detect it and resume from the last confirmed chunk —
   never restart from zero.** This is the specific behavior PRD §25's error
   table and §8's user story both call out: "I want my upload to resume if
   it's interrupted, not fail and force a full restart."

6. **On full upload completion, confirm before enqueuing.** Only after the
   last chunk is confirmed written does the client call `POST /jobs` with
   the `fileKey` to enqueue processing (PRD §11 steps 7–8). Don't enqueue
   speculatively before the upload is actually complete.

7. **If the presigned URL expires mid-upload (60 minutes),** the client
   requests a fresh presign rather than retrying against a dead URL —
   don't silently swallow the expiry error.

## Code skeleton

```typescript
// lib client-side: resumable upload orchestration
async function uploadWithResume(file: File, onProgress: (pct: number) => void) {
  // 1. Client-side validation first
  const validation = validateFileClientSide(file); // format + size ceiling
  if (!validation.ok) throw new UploadError(validation.error);

  // 2. Presign request only after validation passes
  const { uploadUrl, fileKey } = await requestPresignedUpload({
    filename: file.name, mimeType: file.type, sizeBytes: file.size,
  });

  // 3. Chunked upload with checkpoints
  const upload = new tus.Upload(file, {
    endpoint: uploadUrl,
    chunkSize: CHUNK_SIZE_BYTES,
    onProgress: (bytesUploaded, bytesTotal) => onProgress(bytesUploaded / bytesTotal),
    // 5. Resume from last checkpoint on interruption
    onError: (err) => {
      if (isNetworkInterruption(err)) upload.start(); // resumes, doesn't restart
      else throw err;
    },
    onSuccess: async () => {
      // 6. Enqueue only after confirmed completion
      await createJob({ fileKey, /* preset, targetSizeMB */ });
    },
  });
  upload.start();
}
```

## Traps

- Enqueuing the job before the last chunk is confirmed written — races
  against an incomplete upload.
- Restarting from byte zero on any interruption instead of resuming from
  the last checkpoint — exactly the failure mode PRD §8's user story exists
  to prevent.
- Treating upload progress and job-processing progress as the same bar —
  they're different stages with different sources of truth.
- Retrying against an expired 60-minute presigned URL instead of requesting a fresh one.
- Skipping client-side validation and letting an oversized/wrong-format
  file reach the presign request — wastes a round trip the fast-fail was meant to avoid.

## Verify before done

- [ ] Client-side format/size validation runs before any network call.
- [ ] Upload uses a resumable protocol with checkpointing, not a single PUT.
- [ ] Interruption resumes from the last confirmed chunk, not from zero.
- [ ] Job creation (`POST /jobs`) only fires after upload completion is confirmed.
- [ ] Expired presigned URL triggers a fresh presign request, not a silent failure.
- **Tests to write:** a simulated-interruption test asserting the resumed
  upload doesn't re-send already-confirmed chunks, and a test asserting
  `POST /jobs` is never called before the upload-complete callback fires.
