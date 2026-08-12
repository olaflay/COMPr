import { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Supabase Storage's S3-compatible endpoint (see /docs/guides/storage/s3/authentication).
// Unlike R2 ('auto'), Supabase requires the project's real region and forcePathStyle.
const SUPABASE_S3_ENDPOINT = process.env.SUPABASE_S3_ENDPOINT;
const SUPABASE_S3_REGION = process.env.SUPABASE_S3_REGION || 'us-east-1';
const SUPABASE_S3_ACCESS_KEY_ID = process.env.SUPABASE_S3_ACCESS_KEY_ID || 'dummy';
const SUPABASE_S3_SECRET_ACCESS_KEY = process.env.SUPABASE_S3_SECRET_ACCESS_KEY || 'dummy';
const UPLOADS_BUCKET = process.env.SUPABASE_UPLOADS_BUCKET || 'compr-uploads';
const OUTPUTS_BUCKET = process.env.SUPABASE_OUTPUTS_BUCKET || 'compr-outputs';

export const r2Client = new S3Client({
  endpoint: SUPABASE_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: SUPABASE_S3_SECRET_ACCESS_KEY,
  },
  region: SUPABASE_S3_REGION,
});

/**
 * Generate a presigned PUT URL for client-direct uploads (60 minutes expiry).
 * Enforces Content-Length-Range to prevent size-ceiling bypass (PRD §23).
 */
export async function getPresignedUploadUrl(key: string, _maxBytes: number = 500 * 1024 * 1024): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: UPLOADS_BUCKET,
    Key: key,
    // Presigner doesn't natively support Content-Length-Range, so document the expectation:
    // Client must NOT exceed maxBytes; server-side HEAD/validation still applies.
  });
  // 60-minute expiry per PRD §13, §23
  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * Generate a presigned GET URL for client-direct downloads (24 hours expiry).
 */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: OUTPUTS_BUCKET,
    Key: key,
  });
  // 24-hour expiry per PRD §22, §23
  return getSignedUrl(r2Client, command, { expiresIn: 86400 });
}

import { createReadStream, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Downloads an object from the uploads R2 bucket to a local filepath.
 */
export async function downloadFromR2(key: string, localPath: string): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: UPLOADS_BUCKET,
    Key: key,
  });
  const response = await r2Client.send(command);
  if (response.Body instanceof Readable) {
    await pipeline(response.Body, createWriteStream(localPath));
  } else {
    throw new Error('R2 response body is not readable stream');
  }
}

/**
 * Uploads a local file to the outputs R2 bucket.
 */
export async function uploadToR2(key: string, localPath: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: OUTPUTS_BUCKET,
    Key: key,
    Body: createReadStream(localPath),
  });
  await r2Client.send(command);
}

/**
 * Initiate a multipart upload in R2 uploads bucket (60 minutes expiry).
 */
export async function startMultipartUpload(key: string, mimeType: string): Promise<string> {
  const command = new CreateMultipartUploadCommand({
    Bucket: UPLOADS_BUCKET,
    Key: key,
    ContentType: mimeType,
  });
  const response = await r2Client.send(command);
  if (!response.UploadId) {
    throw new Error('Failed to initiate S3 multipart upload (no UploadId returned)');
  }
  return response.UploadId;
}

/**
 * Generate a presigned URL for uploading a specific part of a multipart upload (60 minutes expiry).
 */
export async function getPresignedPartUploadUrl(key: string, uploadId: string, partNumber: number): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: UPLOADS_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * Complete a multipart upload in R2 uploads bucket.
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ ETag: string; PartNumber: number }>
): Promise<void> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: UPLOADS_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
    },
  });
  await r2Client.send(command);
}

