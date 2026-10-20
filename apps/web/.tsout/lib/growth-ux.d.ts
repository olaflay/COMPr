/**
 * Growth & Conversion UX, PRD FR-11, FR-12, FR-13, §38.
 *
 * Implements: reciprocity (first-job exemption), loss aversion + contrast
 * effect (upsell copy), and IKEA effect (onboarding preferences).
 */
export interface OnboardingQuestion {
    id: string;
    question: string;
    options: Array<{
        value: string;
        label: string;
    }>;
}
export declare const ONBOARDING_QUESTIONS: OnboardingQuestion[];
export interface OnboardingAnswers {
    primary_use?: string;
    priority?: string;
}
export interface OnboardingResult {
    emphasis: string;
    primaryUse: string | null;
}
export declare function applyOnboardingPreferences(answers: OnboardingAnswers): OnboardingResult;
/**
 * PRD FR-11, §26: The first job for any new fingerprint always runs the
 * full pipeline. This exemption applies once per fingerprint at the
 * database level, not per browser session.
 *
 * NOTE: This function checks "first job ever" via the database flag
 * isFirstJobForFingerprint, NOT "first job today."
 */
export declare function isFirstJobExemptFromQuota(isFirstJobForFingerprint: boolean): boolean;
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
export declare function buildUpsellCopy({ jobsBlockedThisMonth, premiumPriceLabel, }: {
    jobsBlockedThisMonth: number;
    premiumPriceLabel: string;
}): UpsellCopyResult;
export declare function formatDataSaved(sizeBeforeBytes: number, sizeAfterBytes: number): string;
//# sourceMappingURL=growth-ux.d.ts.map