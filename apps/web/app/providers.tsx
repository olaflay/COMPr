'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

// Lazy-load the install modal so it never blocks first paint. It self-hidden
// until the browser fires `beforeinstallprompt`.
const InstallPromptModal = dynamic(() => import('../components/InstallPromptModal'), {
  ssr: false,
  loading: () => null,
});

let posthogInstance: any = null;

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY || !posthogInstance) return;
    let url = window.location.origin + pathname;
    if (searchParams.toString()) {
      url = url + `?${searchParams.toString()}`;
    }
    posthogInstance.capture('$pageview', { '$current_url': url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    const initPostHog = async () => {
      try {
        const phModule = await import('posthog-js');
        const ph = phModule.default || phModule;
        ph.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          capture_pageview: false,
          capture_pageleave: true,
          autocapture: true,
          persistence: 'localStorage+cookie',
          person_profiles: 'identified_only',
        });
        posthogInstance = ph;

        // Capture initial pageview after init
        let url = window.location.origin + window.location.pathname;
        ph.capture('$pageview', { '$current_url': url });
      } catch (err) {
        console.warn('PostHog deferred init failed:', err);
      }
    };

    const initSentry = async () => {
      const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
      const isDummyDsn = !dsn || dsn === 'https://dummy-dsn@sentry.io/12345';
      if (!isDummyDsn) {
        try {
          const Sentry = await import('@sentry/nextjs');
          Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',
            tracesSampleRate: 0.1,
          });
        } catch (err) {
          console.warn('Sentry deferred init failed:', err);
        }
      }
    };

    // Defer initialization slightly to let the first paint complete
    const posthogTimer = setTimeout(initPostHog, 500);
    const sentryTimer = setTimeout(initSentry, 800);

    const handleUnload = () => {
      if (posthogInstance) {
        posthogInstance.capture('$pageleave');
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    // Register the service worker so the browser's PWA install criteria are
    // met and `beforeinstallprompt` fires (see public/sw.js).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('Service worker registration failed:', err));
    }

    return () => {
      clearTimeout(posthogTimer);
      clearTimeout(sentryTimer);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <InstallPromptModal onInstalled={() => trackEvent('pwa_installed')} />
      {children}
    </>
  );
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (POSTHOG_KEY && posthogInstance) {
    posthogInstance.capture(event, properties);
  }
}

export function identifyUser(distinctId: string, properties?: Record<string, unknown>) {
  if (POSTHOG_KEY && posthogInstance) {
    posthogInstance.identify(distinctId, properties);
  }
}

export function resetUser() {
  if (POSTHOG_KEY && posthogInstance) {
    posthogInstance.reset();
  }
}
