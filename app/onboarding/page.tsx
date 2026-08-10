import OnboardingPageClient from './onboarding-client';
import { buildMetadata } from '../../lib/seo';
import { Suspense } from 'react';

export const metadata = buildMetadata({
  title: 'Welcome',
  path: '/onboarding',
});



function OnboardingSkeleton() {
  return (
    <main className="min-h-screen flex flex-col justify-between items-center bg-background text-on-background p-m3-large">
      <header className="w-full max-w-lg flex justify-between items-center pt-m3-x-small">
        <div className="skeleton h-5 w-16 rounded-m3-sm animate-pulse" />
        <div className="skeleton h-5 w-12 rounded-m3-sm animate-pulse" />
      </header>

      {/* Progress indicator skeleton */}
      <div className="w-full max-w-lg mt-m3-x-small">
        <div className="flex gap-m3-x-small">
          {[1, 2, 3].map((s) => (
            <div key={s} className="skeleton h-1 flex-1 rounded-m3-full" />
          ))}
        </div>
      </div>

      {/* Body card skeleton */}
      <div className="flex-1 w-full max-w-md flex flex-col justify-center gap-m3-large items-center w-full">
        {/* Image placeholder */}
        <div className="skeleton w-full aspect-[2/1] max-w-[320px] rounded-m3-md animate-pulse" />

        <div className="flex flex-col gap-m3-medium items-center text-center w-full">
          <div className="skeleton h-10 w-3/4 rounded-m3-md animate-pulse" />
          <div className="skeleton h-4 w-full rounded-m3-sm animate-pulse" style={{ animationDelay: '0.05s' }} />
          <div className="skeleton h-4 w-5/6 rounded-m3-sm animate-pulse" style={{ animationDelay: '0.1s' }} />
        </div>

        {/* Trust Signals skeleton */}
        <div className="bg-surface-container border border-outline-variant/60 p-m3-medium rounded-m3-lg flex flex-col gap-m3-xx-small text-left w-full mt-m3-medium">
          <div className="skeleton h-5 w-32 rounded-m3-sm animate-pulse" />
          <div className="skeleton h-4 w-full rounded-m3-sm animate-pulse mt-m3-small" style={{ animationDelay: '0.05s' }} />
          <div className="skeleton h-4 w-5/6 rounded-m3-sm animate-pulse" style={{ animationDelay: '0.1s' }} />
        </div>
      </div>

      {/* Bottom button skeleton */}
      <div className="w-full max-w-lg flex justify-between items-center pb-m3-x-large pt-m3-medium">
        <div className="skeleton h-5 w-10 rounded-m3-sm animate-pulse" />
        <div className="skeleton h-10 w-24 rounded-m3-full animate-pulse" />
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingPageClient />
    </Suspense>
  );
}
