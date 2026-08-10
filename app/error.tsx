'use client';

import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-m3-large text-center gap-m3-large">
      <div className="text-display-medium" aria-hidden="true">⚠️</div>
      <h1 className="text-headline-large text-on-surface">Something went wrong</h1>
      <p className="text-body-large text-on-surface-variant max-w-md leading-relaxed">
        An unexpected error occurred. Your files are safe.
      </p>
      <div className="flex flex-col sm:flex-row gap-m3-small mt-m3-x-small">
        <button
          onClick={reset}
          className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-small px-m3-x-large rounded-m3-full text-title-small shadow-m3-1 transition-all duration-m3-medium-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="bg-surface-container hover:bg-surface-container-high text-on-surface py-m3-small px-m3-x-large rounded-m3-full text-title-small transition-all duration-m3-medium-1 border border-outline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Go to Home
        </Link>
      </div>
    </main>
  );
}

