import { prisma } from './prisma.ts';

export interface RecordTenantUsageParams {
  tenantId: string;
  durationSec: number;
  bytesIn: number;
  bytesOut: number;
  timestamp?: Date;
}

export function getBillingMonth(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export async function recordTenantUsage(params: RecordTenantUsageParams) {
  const date = params.timestamp || new Date();
  const billingMonth = getBillingMonth(date);
  const minutes = Math.max(0, params.durationSec / 60);
  const inBytes = BigInt(Math.max(0, Math.round(params.bytesIn)));
  const outBytes = BigInt(Math.max(0, Math.round(params.bytesOut)));

  return await prisma.tenantUsage.upsert({
    where: {
      tenantId_billingMonth: {
        tenantId: params.tenantId,
        billingMonth,
      },
    },
    create: {
      tenantId: params.tenantId,
      billingMonth,
      minutesEncoded: minutes,
      bytesIn: inBytes,
      bytesOut: outBytes,
      jobCount: 1,
    },
    update: {
      minutesEncoded: { increment: minutes },
      bytesIn: { increment: inBytes },
      bytesOut: { increment: outBytes },
      jobCount: { increment: 1 },
    },
  });
}
