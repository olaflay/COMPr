'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { isIOSDevice, rememberDismissed, shouldShowAgain } from '../lib/install-prompt';

/**
 * PWA install prompt modal.
 *
 * Captures the browser's `beforeinstallprompt` event and surfaces a
 * value-first modal (icon + benefits + Install / Not-now). "Not now" dismisses
 * for this session and sets a localStorage flag so we re-prompt (not nag)
 * after a quiet period. Fully accessible: dialog role, focus trap, Escape,
 * reduced-motion respected via the app's global CSS.
 *
 * iOS Safari never fires `beforeinstallprompt`, so on iOS (PWA-1) we skip the
 * install-button flow entirely and instead show a short "Share sheet ->
 * Add to Home Screen" walkthrough the first few sessions.
 */

interface DeferredInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// How long to wait after the deferred prompt becomes available before showing
// the modal, so we don't interrupt a first paint / immediate action.
const SHOW_DELAY_MS = 4000;

export default function InstallPromptModal({ onInstalled }: { onInstalled?: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);
  // True only on iOS Safari/iPadOS when the PWA isn't already on the home
  // screen (that browser never fires `beforeinstallprompt`).
  const [isIOS] = useState(() =>
    typeof navigator !== 'undefined' &&
    isIOSDevice(navigator.userAgent, Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
  const [iosPrompt, setIosPrompt] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(false);

  // localStorage-backed store; guards access in non-browser environments.
  const store = useRef({
    storage: {
      getItem: (k: string) => (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(k) : null),
      setItem: (k: string, v: string) => { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(k, v); },
    },
    now: () => Date.now(),
  }).current;

  // Listen for the deferred install prompt once.
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (shownRef.current) return;
      shownRef.current = true;
      setDeferredPrompt(e as unknown as DeferredInstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Show the modal a short beat after the prompt is available (and only if the
  // user hasn't dismissed recently).
  useEffect(() => {
    if (!deferredPrompt || !shouldShowAgain(store)) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPrompt]);

  // iOS has no install prompt API, so surface the manual Add-to-Home-Screen
  // walkthrough on its own timer (same non-nagging quiet-period logic).
  useEffect(() => {
    if (!isIOS || !shouldShowAgain(store)) return;
    const timer = setTimeout(() => setIosPrompt(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIOS]);

  // Focus trap while open (mirrors the dashboard upsell modal pattern).
  useEffect(() => {
    if (!visible || !modalRef.current) return;
    const modal = modalRef.current;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    (first || modal)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
      if (e.key !== 'Tab') return;
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = useCallback(() => setVisible(false), []);

  // "Not now" is a deliberate deferral: it sets the quiet-period flag so we
  // won't re-prompt for REPROMPT_AFTER_DAYS (non-nagging).
  const handleDismiss = useCallback(() => {
    rememberDismissed(store);
    setDeferredPrompt(null);
    setIosPrompt(false);
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [close]);

  // "Cancel" (X) is a lightweight exit for THIS prompt only: it closes without
  // pinning the dismissal flag, so the prompt is allowed to appear again in a
  // later session (Nielsen "user control and freedom" — a visible cancel that
  // doesn't silently commit the user to a long quiet period).
  const handleCancel = useCallback(() => {
    setDeferredPrompt(null);
    setIosPrompt(false);
    close();
  }, [close]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        close();
        onInstalled?.();
      }
    } catch {
      // Prompt can throw if already used or unavailable; treat as dismissed.
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt, close, onInstalled]);

  if (!visible && !iosPrompt) return null;

  // On iOS there's no `beforeinstallprompt`, so we render the manual
  // Add-to-Home-Screen walkthrough instead of an install button.
  const iosMode = iosPrompt && !deferredPrompt;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-m3-medium" role="presentation">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={handleDismiss} aria-hidden="true" />
      {/* Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-prompt-title"
        aria-describedby="install-prompt-desc"
        className="relative w-full max-w-sm bg-surface-container-high text-on-surface rounded-m3-xl shadow-m3-4 p-m3-large flex flex-col gap-m3-medium"
      >
        {/* Cancel (X) icon button — always-visible exit that doesn't pin the
            quiet-period flag (see handleCancel). M3 icon button, keyboard
            focusable, participates in the focus trap. */}
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel"
          className="absolute top-m3-x-small right-m3-x-small rounded-m3-full p-m3-x-small text-on-surface-variant hover:bg-surface-container-hover active:scale-[0.98] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="w-12 h-12 rounded-m3-lg bg-primary-container text-on-primary-container flex items-center justify-center shadow-m3-1">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <path d="M16 8l-4-4-4 4" />
            <line x1="12" y1="4" x2="12" y2="16" />
          </svg>
        </div>

        <div className="flex flex-col gap-m3-small">
          <h2 id="install-prompt-title" className="text-title-large font-semibold">
            {iosMode ? 'Put NoBlur for your home screen' : 'Put NoBlur for your phone'}
          </h2>
          <p id="install-prompt-desc" className="text-body-medium text-on-surface-variant">
            {iosMode
              ? 'iOS no go prompt you to install. Put NoBlur for your home screen, then open am one-tap.'
              : 'Open am like app, straight from your phone. Sharp WhatsApp media, no browser hunting.'}
          </p>
        </div>

        {iosMode ? (
          <ol className="flex flex-col gap-m3-small text-body-medium text-on-surface">
            <li className="flex items-start gap-m3-x-small">
              <span className="shrink-0 w-8 h-8 rounded-m3-md bg-primary-container text-on-primary-container flex items-center justify-center" aria-hidden="true">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </span>
              Open Safari, tap the Share button
            </li>
            <li className="flex items-start gap-m3-x-small">
              <span className="shrink-0 w-8 h-8 rounded-m3-md bg-primary-container text-on-primary-container flex items-center justify-center" aria-hidden="true">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Scroll down, tap “Add to Home Screen”
            </li>
            <li className="flex items-start gap-m3-x-small">
              <span className="shrink-0 w-8 h-8 rounded-m3-md bg-primary-container text-on-primary-container flex items-center justify-center" aria-hidden="true">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 12 2 2 4-4" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              Tap “Add”, open am for your home screen
            </li>
          </ol>
        ) : (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
              aria-controls="install-prompt-why"
              className="flex items-center justify-between text-body-medium font-medium text-on-surface-variant hover:text-on-surface transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Why add am?
              <svg
                className={`w-5 h-5 transition-transform duration-m3-medium-1 ${showWhy ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div
              id="install-prompt-why"
              className={`grid transition-all duration-m3-medium-1 ease-m3-standard ${showWhy ? 'grid-rows-[1fr] mt-m3-small' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-m3-xx-small text-body-small text-on-surface-variant">
                  <div className="flex items-center gap-m3-x-small">
                    <span className="text-primary" aria-hidden="true">✓</span> De open fast like an app
                  </div>
                  <div className="flex items-center gap-m3-x-small">
                    <span className="text-primary" aria-hidden="true">✓</span> Start optimising one-tap
                  </div>
                  <div className="flex items-center gap-m3-x-small">
                    <span className="text-primary" aria-hidden="true">✓</span> Free, no account needed
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-m3-small mt-m3-small">
          <button
            onClick={handleDismiss}
            className="flex-1 py-m3-small rounded-m3-full text-label-large text-on-surface-variant hover:bg-surface-container-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Not now
          </button>
          {iosMode ? (
            <button
              onClick={handleDismiss}
              className="flex-[1.4] py-m3-small rounded-m3-full bg-primary text-on-primary font-semibold text-label-large hover:bg-primary/90 active:scale-[0.98] transition-all shadow-m3-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Got it
            </button>
          ) : (
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-[1.4] py-m3-small rounded-m3-full bg-primary text-on-primary font-semibold text-label-large hover:bg-primary/90 active:scale-[0.98] transition-all shadow-m3-1 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {isInstalling ? 'Installing…' : 'Install App'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
