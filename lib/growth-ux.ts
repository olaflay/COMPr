/**
 * Growth & Conversion UX — PRD FR-11, FR-12, FR-13, §38.
 *
 * Implements: reciprocity (first-job exemption), loss aversion + contrast
 * effect (upsell copy), and IKEA effect (onboarding preferences).
 */

export interface OnboardingQuestion {
  id: string;
  question: string;
  options: Array<{ value: string; label: string }>;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'primary_use',
    question: 'What do you mainly share on WhatsApp?',
    options: [
      { value: 'products', label: 'Product photos & videos for customers' },
      { value: 'status', label: 'Status updates' },
      { value: 'personal', label: 'Personal videos & memories' },
    ],
  },
  {
    id: 'priority',
    question: 'What matters most when you send media?',
    options: [
      { value: 'quality', label: 'Looking as sharp as possible' },
      { value: 'speed', label: 'Getting it sent quickly' },
      { value: 'size', label: 'Keeping the file small' },
    ],
  },
];

export interface OnboardingAnswers {
  primary_use?: string;
  priority?: string;
}

export interface OnboardingResult {
  emphasis: string;
  primaryUse: string | null;
}

export function applyOnboardingPreferences(answers: OnboardingAnswers): OnboardingResult {
  const emphasis =
    answers.priority === 'quality'
      ? 'quality-forward'
      : answers.priority === 'size'
        ? 'size-forward'
        : 'balanced';
  return { emphasis, primaryUse: answers.primary_use ?? null };
}

/**
 * PRD FR-11, §26: The first job for any new fingerprint always runs the
 * full pipeline. This exemption applies once per fingerprint at the
 * database level, not per browser session.
 *
 * NOTE: This function checks "first job ever" via the database flag
 * isFirstJobForFingerprint, NOT "first job today."
 */
export function isFirstJobExemptFromQuota(isFirstJobForFingerprint: boolean): boolean {
  return isFirstJobForFingerprint;
}

export interface UpsellCopyResult {
  anchorLine: string;
  priceLine: string;
  ctaLabel: string;
}

/**
 * PRD FR-12, §38: Loss aversion + contrast effect.
 * The "cost of staying free" is shown before the subscription price,
 * anchoring perception.
 */
export function buildUpsellCopy({
  jobsBlockedThisMonth,
  premiumPriceLabel,
}: {
  jobsBlockedThisMonth: number;
  premiumPriceLabel: string;
}): UpsellCopyResult {
  const lossLine =
    jobsBlockedThisMonth > 0
      ? `You've had ${jobsBlockedThisMonth} file${jobsBlockedThisMonth === 1 ? '' : 's'} this month that couldn't be optimized once you hit today's limit -- sent at lower quality than they could have been.`
      : `Once you hit today's free limit, any more files you send today go out without COMPr's optimization.`;

  return {
    anchorLine: lossLine,
    priceLine: `${premiumPriceLabel} removes the daily limit entirely.`,
    ctaLabel: 'Never send a blurry file again',
  };
}
