/**
 * Pure decision + persistence helpers for the PWA InstallPromptModal.
 *
 * Extracted out of the component so the retry/dismiss logic is unit-testable
 * without a DOM. The component passes its own storage/clock (defaulting to
 * window.localStorage / Date.now), keeping the behavior byte-for-byte.
 */

export const DISMISS_KEY = 'vecteus_install_dismissed_at';
// Re-prompt after this many days if the user dismissed ("Not now") before.
export const REPROMPT_AFTER_DAYS = 7;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface InstallPromptStore {
  storage: StorageLike;
  now: () => number;
}

/** True when there is no stored dismissal, or the quiet period has elapsed. */
export function shouldShowAgain({ storage, now }: InstallPromptStore): boolean {
  const raw = storage.getItem(DISMISS_KEY);
  if (!raw) return true;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return true;
  const windowNs = REPROMPT_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return now() - dismissedAt >= windowNs;
}

/** Persist a "Not now" dismissal timestamp so we don't nag. Swallows errors. */
export function rememberDismissed({ storage, now }: InstallPromptStore): void {
  try {
    storage.setItem(DISMISS_KEY, String(now()));
  } catch {}
}

/**
 * True on iOS Safari / iPadOS when the PWA is NOT already installed.
 *
 * iOS Safari never fires `beforeinstallprompt`, so these users can only
 * install via the Share sheet -> "Add to Home Screen" flow. `navigator.standalone`
 * is true once the app is actually on the home screen (no prompt needed).
 */
export function isIOSDevice(userAgent: string, standalone: boolean): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) && !standalone;
}