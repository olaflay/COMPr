/**
 * Daily quota & reciprocity rules — PRD FR-11, §27.
 *
 * The single owner of the free-daily-limit, the WhatsApp share bonus, and
 * today's UsageRecord accessors. Previously these were duplicated across
 * server/routes/jobs.ts and server/routes/usage.ts; both now call here so the
 * rules live in one module with one set of tests.
 */

import { prisma } from './prisma.ts';

export const FREE_DAILY_LIMIT = 5;
export const SHARE_BONUS = 3;

/** Start of today (UTC), the key used by UsageRecord rows. */
export function todayStart(): Date {
  const todayStr = new Date().toISOString().split('T')[0];
  return new Date(todayStr);
}

/** Total compressions allowed today for a given bonus count. */
export function allowanceFor(bonusCount: number): number {
  return FREE_DAILY_LIMIT + bonusCount;
}

/** True when a fingerprint has exhausted its daily allowance. */
export function isQuotaExhausted(usedCount: number, bonusCount: number): boolean {
  return usedCount >= allowanceFor(bonusCount);
}

/** Compressions left today, never negative. */
export function remainingJobs(usedCount: number, bonusCount: number): number {
  return Math.max(0, allowanceFor(bonusCount) - usedCount);
}

/** Read today's UsageRecord for a fingerprint (null when none exists yet). */
export async function fetchUsage(fingerprintHash: string, date: Date) {
  return prisma.usageRecord.findUnique({
    where: { fingerprintHash_date: { fingerprintHash, date } },
  });
}

/** Count this job against today's usage (upsert). */
export async function incrementUsage(
  fingerprintHash: string,
  ipHash: string,
  date: Date,
): Promise<void> {
  await prisma.usageRecord.upsert({
    where: { fingerprintHash_date: { fingerprintHash, date } },
    update: { jobCount: { increment: 1 } },
    create: { fingerprintHash, ipHash, date, jobCount: 1 },
  });
}

/**
 * Grant the once-per-day WhatsApp share bonus. Returns the number of
 * compressions actually granted (0 when already claimed today).
 */
export async function grantShareBonus(
  fingerprintHash: string,
  ipHash: string,
): Promise<number> {
  const record = await prisma.usageRecord.upsert({
    where: { fingerprintHash_date: { fingerprintHash, date: todayStart() } },
    update: {},
    create: { fingerprintHash, ipHash, date: todayStart(), jobCount: 0, bonusCount: SHARE_BONUS },
  });

  let granted = 0;
  if (record.bonusCount === 0) {
    await prisma.usageRecord.update({
      where: { id: record.id },
      data: { bonusCount: SHARE_BONUS },
    });
    granted = SHARE_BONUS;
  }
  return granted;
}
