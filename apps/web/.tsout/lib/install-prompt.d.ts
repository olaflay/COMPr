/**
 * Pure decision + persistence helpers for the PWA InstallPromptModal.
 *
 * Extracted out of the component so the retry/dismiss logic is unit-testable
 * without a DOM. The component passes its own storage/clock (defaulting to
 * window.localStorage / Date.now), keeping the behavior byte-for-byte.
 */
export declare const DISMISS_KEY = "vecteus_install_dismissed_at";
export declare const REPROMPT_AFTER_DAYS = 7;
interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export interface InstallPromptStore {
    storage: StorageLike;
    now: () => number;
}
/** True when there is no stored dismissal, or the quiet period has elapsed. */
export declare function shouldShowAgain({ storage, now }: InstallPromptStore): boolean;
/** Persist a "Not now" dismissal timestamp so we don't nag. Swallows errors. */
export declare function rememberDismissed({ storage, now }: InstallPromptStore): void;
/**
 * True on iOS Safari / iPadOS when the PWA is NOT already installed.
 *
 * iOS Safari never fires `beforeinstallprompt`, so these users can only
 * install via the Share sheet -> "Add to Home Screen" flow. `navigator.standalone`
 * is true once the app is actually on the home screen (no prompt needed).
 */
export declare function isIOSDevice(userAgent: string, standalone: boolean): boolean;
export {};
//# sourceMappingURL=install-prompt.d.ts.map