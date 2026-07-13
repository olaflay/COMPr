---
trigger: always_on
---

# Uploads & Object Storage — COMPr

## 1. Architecture (R2 & Presigned URLs)

- **Cloudflare R2** is the object storage solution.
- The API server **MUST NEVER proxy raw file bytes**.
- Uploads and downloads happen directly between the client and R2 via **presigned URLs**. This keeps the API stateless and prevents egress bandwidth costs on Vercel.

## 2. Presigned URL Settings

- **Upload URLs:** Expiry = **60 minutes**. (This accommodates users in the primary launch market with slow, variable 3G/4G connectivity).
- **Download URLs:** Expiry = **24 hours** (matching the output retention window).

## 3. Retention & Deletion (The Single Source of Truth)

- Source files are retained **only until job completion** + a 1-hour grace period for debugging.
- Output files are retained for **24 hours**.
- **The Cleanup Cron Job is the SOLE AUTHORITY on deletion:**
  1. It deletes the R2 object.
  2. It updates `MediaFile.deletedAt` in Postgres.
- R2's built-in lifecycle rule is explicitly a **secondary safety net**, not the primary workflow.

## 4. Resumable Uploads

- Uploads must support resumable/chunked transfer (e.g., TUS protocol or multipart with resume support).
- If an upload fails due to network interruption, the client must be able to resume from the last confirmed byte, not restart from zero.

## 5. File Size Limits

- Free Tier source file limit: **100 MB**.
- Premium Tier source file limit: **500 MB**.
- Reject source files exceeding these limits at the API level before generating the upload URL.
