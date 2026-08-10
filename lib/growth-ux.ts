/**
 * Growth & Conversion UX, PRD FR-11, FR-12, FR-13, §38.
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
    question: 'Wetin you dey mostly share for WhatsApp?',
    options: [
      { value: 'products', label: 'Product photos and videos for customers' },
      { value: 'status', label: 'Status updates' },
      { value: 'personal', label: 'Personal videos and memories' },
    ],
  },
  {
    id: 'priority',
    question: 'Wetin dey matter most when you dey send media?',
    options: [
      { value: 'quality', label: 'To dey look as sharp as possible' },
      { value: 'speed', label: 'To send am quickly' },
      { value: 'size', label: 'To keep the file small' },
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
      ? `You don get ${jobsBlockedThisMonth} file${jobsBlockedThisMonth === 1 ? '' : 's'} this month wey no fit optimize once you hit today limit, and dem send at lower quality than dem for don be.`
      : `Once you hit today free limit, any more files wey you send today go go out without COMPr optimization.`;

  return {
    anchorLine: lossLine,
    priceLine: `${premiumPriceLabel} dey remove the daily limit completely.`,
    ctaLabel: 'Never send blurry file again',
  };
}
