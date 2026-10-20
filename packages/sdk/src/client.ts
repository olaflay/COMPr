import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  PresignRequest,
  PresignResponse,
  CompleteIngestResponse,
  JobTelemetry,
} from '@vecteus/contracts';

export interface VecteusClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export class VecteusClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: VecteusClientOptions) {
    if (!options.apiKey) {
      throw new Error('VecteusClient requires an apiKey (e.g. vct_live_...)');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:3000').replace(/\/+$/, '');
  }

  public readonly ingest = {
    presign: async (opts: PresignRequest): Promise<PresignResponse> => {
      const res = await fetch(`${this.baseUrl}/v1/ingest/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vecteus-Key': this.apiKey,
        },
        body: JSON.stringify(opts),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Ingest presign failed (${res.status}): ${JSON.stringify(errorData)}`);
      }

      return (await res.json()) as PresignResponse;
    },

    complete: async (jobId: string): Promise<CompleteIngestResponse> => {
      const res = await fetch(`${this.baseUrl}/v1/ingest/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vecteus-Key': this.apiKey,
        },
        body: JSON.stringify({ jobId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Ingest complete failed (${res.status}): ${JSON.stringify(errorData)}`);
      }

      return (await res.json()) as CompleteIngestResponse;
    },

    upload: async (
      body: Buffer | Uint8Array | Blob,
      opts: PresignRequest
    ): Promise<PresignResponse> => {
      const presigned = await this.ingest.presign(opts);

      const putRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': opts.mimeType,
        },
        body: body as any,
      });

      if (!putRes.ok) {
        throw new Error(`Direct storage upload failed with status ${putRes.status}`);
      }

      await this.ingest.complete(presigned.jobId);
      return presigned;
    },
  };

  public readonly jobs = {
    get: async (jobId: string): Promise<JobTelemetry> => {
      const res = await fetch(`${this.baseUrl}/v1/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'X-Vecteus-Key': this.apiKey,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Get job failed (${res.status}): ${JSON.stringify(errorData)}`);
      }

      return (await res.json()) as JobTelemetry;
    },

    waitForCompletion: async (
      jobId: string,
      pollIntervalMs: number = 2000,
      timeoutMs: number = 300000
    ): Promise<JobTelemetry> => {
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        const job = await this.jobs.get(jobId);
        if (job.status === 'COMPLETED' || job.status === 'DONE' || job.status === 'FAILED') {
          return job;
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
    },
  };

  public static readonly webhooks = {
    verifySignature: (rawPayload: string, signature: string, secret: string): boolean => {
      const expected = createHmac('sha256', secret).update(rawPayload).digest('hex');
      if (expected.length !== signature.length) {
        return false;
      }
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    },
  };
}
