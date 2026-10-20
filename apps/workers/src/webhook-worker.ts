import { Worker, type Job as BullJob } from 'bullmq';
import { redisConnection } from '../lib/queue.ts';
import { prisma } from '../lib/prisma.ts';
import { signWebhookPayload } from '../lib/crypto.ts';
import { validateWebhookUrl } from '../lib/ssrf.ts';

export interface WebhookJobData {
  jobId: string;
  event: 'job.completed' | 'job.failed';
}

export { signWebhookPayload };


export const webhookWorker = new Worker<WebhookJobData>(
  'vecteus-webhooks',
  async (bullJob: BullJob<WebhookJobData>) => {
    const { jobId, event } = bullJob.data;
    console.log(`[WebhookWorker] Processing ${event} for job ${jobId}`);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        sourceFile: true,
        outputs: true,
        tenant: {
          include: {
            webhooks: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!job || !job.tenant) {
      console.log(`[WebhookWorker] Job ${jobId} or tenant not found, skipping webhook`);
      return;
    }

    const webhooks = job.tenant.webhooks.filter((w) => w.events.includes(event));
    if (webhooks.length === 0) {
      console.log(`[WebhookWorker] No active webhook endpoints registered for event ${event}`);
      return;
    }

    const sourceSize = job.sourceFile?.sizeBytes ?? 0;
    const outputSize = job.outputs[0]?.sizeBytes ?? 0;
    const savingsPercent = sourceSize > 0 && outputSize > 0
      ? Math.round((1 - outputSize / sourceSize) * 1000) / 10
      : 0;

    const payloadObj = {
      event,
      jobId: job.id,
      tenantId: job.tenant.id,
      source: {
        sizeBytes: sourceSize,
        durationSec: job.sourceFile?.durationSec ?? null,
        width: job.sourceFile?.width ?? null,
        height: job.sourceFile?.height ?? null,
      },
      output: {
        sizeBytes: outputSize,
        savingsPercent,
        vmafScore: job.vmafScore ?? null,
        storageKey: job.outputs[0]?.storageKey ?? null,
      },
      errorMessage: job.errorMessage,
      completedAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
    };

    const payloadString = JSON.stringify(payloadObj);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    for (const webhook of webhooks) {
      // Outbound SSRF defense: block private, loopback, or cloud metadata endpoints
      const ssrfCheck = await validateWebhookUrl(webhook.url);
      if (!ssrfCheck.valid) {
        console.warn(`[WebhookWorker] SSRF blocked for webhook ${webhook.id} (${webhook.url}): ${ssrfCheck.reason}`);
        await prisma.webhookDelivery.create({
          data: {
            jobId: job.id,
            endpointId: webhook.id,
            payloadJson: payloadObj,
            attempts: 1,
            error: `SSRF_BLOCKED: ${ssrfCheck.reason}`,
          },
        });
        continue;
      }

      const signature = await signWebhookPayload(payloadString, webhook.signingSecret);

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Vecteus-Signature': signature,
            'X-Vecteus-Timestamp': timestamp,
            'X-Vectis-Signature': signature,
            'X-Vectis-Timestamp': timestamp,
          },
          body: payloadString,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        await prisma.webhookDelivery.create({
          data: {
            jobId: job.id,
            endpointId: webhook.id,
            payloadJson: payloadObj,
            responseStatus: response.status,
            attempts: bullJob.attemptsMade + 1,
            deliveredAt: response.ok ? new Date() : null,
            error: response.ok ? null : `HTTP ${response.status}`,
          },
        });

        console.log(`[WebhookWorker] Dispatched to ${webhook.url}: status ${response.status}`);
        if (!response.ok && response.status >= 500 && bullJob.attemptsMade < 3) {
          throw new Error(`Webhook endpoint returned HTTP ${response.status}`);
        }
      } catch (err: any) {
        console.error(`[WebhookWorker] Delivery failed to ${webhook.url}:`, err.message);
        await prisma.webhookDelivery.create({
          data: {
            jobId: job.id,
            endpointId: webhook.id,
            payloadJson: payloadObj,
            attempts: bullJob.attemptsMade + 1,
            error: err.message,
          },
        });

        if (bullJob.attemptsMade < 3) {
          throw err;
        }
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);
