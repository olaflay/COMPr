'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { trackEvent } from '../providers';
import { apiFetch } from '../../lib/api-client';

export default function OnboardingPageClient() {
  const [step, setStep] = useState(1);
  const [primaryUse, setPrimaryUse] = useState('');
  const [priority, setPriority] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
 
  useEffect(() => {
    // Focus the step header on change so screen readers announce the new step content
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    let fp = localStorage.getItem('compr_fingerprint');
    if (!fp) {
      fp = 'fp_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('compr_fingerprint', fp);
    }
    setFingerprint(fp);
  }, []);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleSkip = () => {
    trackEvent('onboarding_skipped', { step });
    router.push('/dashboard');
  };

  const submitPreferences = async (selectedPriority: string) => {
    // Fire the canonical onboarding_answered event
    trackEvent('onboarding_answered', {
      primary_use: primaryUse || undefined,
      priority: selectedPriority,
    });

    try {
      await apiFetch('/api/v1/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          primary_use: primaryUse || undefined,
          priority: selectedPriority || undefined,
        }),
      });
    } catch (e) {
      console.error('Failed to submit onboarding preferences', e);
    }
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between items-center bg-background text-on-background p-m3-large">
      <header className="w-full max-w-lg flex justify-between items-center pt-m3-x-small">
        <Link href="/" className="text-label-large text-on-surface-variant hover:text-on-surface font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          &larr; Home
        </Link>
        <button
          onClick={handleSkip}
          className="text-label-large text-primary hover:text-primary-container font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Skip
        </button>
      </header>

      {/* Progress indicator (3 steps) */}
      <div className="w-full max-w-lg mt-m3-x-small" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label={`Onboarding step ${step} of 3`}>
        <div className="flex gap-m3-x-small">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-m3-full transition-colors duration-m3-medium-1 ${s <= step ? 'bg-primary' : 'bg-outline-variant'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-md flex flex-col justify-center gap-m3-large my-m3-medium" aria-live="polite">
        {step === 1 && (
          <div className="flex flex-col gap-m3-large text-center items-center">
            {/* Onboarding Illustration */}
            <div className="relative w-full aspect-[2/1] max-w-[320px] rounded-m3-md overflow-hidden border border-outline-variant/40 bg-surface-container">
              <Image
                src="/onboarding-illustration.png"
                alt="Media optimization side-by-side comparison"
                fill
                priority
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-m3-medium">
              <h1 ref={headingRef} tabIndex={-1} className="focus:outline-none text-headline-large text-on-surface leading-tight">
                Welcome to <span className="text-primary">NoBlur</span>
              </h1>
              <p className="text-body-large text-on-surface-variant leading-relaxed">
                Send sharper photos and videos on WhatsApp. We optimize your media so it survives compression and stays clear.
              </p>
            </div>

            {/* Trust Signals / Privacy Guarantee */}
            <div className="bg-surface-container border border-outline-variant/60 p-m3-medium rounded-m3-lg flex flex-col gap-m3-xx-small text-left w-full">
              <h4 className="text-title-medium text-primary font-semibold">Privacy Guarantee</h4>
              <p className="text-body-medium text-on-surface">
                <strong>Auto-deletion:</strong> Files are deleted automatically within 24 hours.
              </p>
              <p className="text-body-medium text-on-surface">
                <strong>No auto-posting:</strong> We never post to WhatsApp for you.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-m3-large">
            <h2 ref={headingRef} tabIndex={-1} className="focus:outline-none text-headline-small text-on-surface text-center">
              Wetin you dey mostly share for WhatsApp?
            </h2>
            <div className="flex flex-col gap-m3-small" role="radiogroup" aria-label="Primary use">
              {[
                { value: 'products', label: 'Product photos and videos for customers' },
                { value: 'status', label: 'Status updates' },
                { value: 'personal', label: 'Personal videos and memories' },
              ].map((option) => (
                <button
                  key={option.value}
                  role="radio"
                  aria-checked={primaryUse === option.value}
                  onClick={() => {
                    setPrimaryUse(option.value);
                    setStep(3); // Auto-advance to step 3!
                  }}
                  className={`w-full text-left p-m3-medium rounded-m3-md border text-body-large transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${primaryUse === option.value
                      ? 'border-primary bg-primary-container text-on-primary-container font-semibold'
                      : 'border-outline-variant hover:bg-surface-container-low text-on-surface'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-m3-large">
            <h2 ref={headingRef} tabIndex={-1} className="focus:outline-none text-headline-small text-on-surface text-center">
              Wetin dey matter most when you dey send media?
            </h2>
            <div className="flex flex-col gap-m3-small" role="radiogroup" aria-label="Priority">
              {[
                { value: 'quality', label: 'To dey look as sharp as possible' },
                { value: 'speed', label: 'To send am quickly' },
                { value: 'size', label: 'To keep the file small' },
              ].map((option) => (
                <button
                  key={option.value}
                  role="radio"
                  aria-checked={priority === option.value}
                  onClick={() => {
                    setPriority(option.value);
                    submitPreferences(option.value); // Auto-submit and finish!
                  }}
                  className={`w-full text-left p-m3-medium rounded-m3-md border text-body-large transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${priority === option.value
                      ? 'border-primary bg-primary-container text-on-primary-container font-semibold'
                      : 'border-outline-variant hover:bg-surface-container-low text-on-surface'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="w-full max-w-lg flex justify-between items-center pb-m3-x-large pt-m3-medium">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="text-label-large text-on-surface-variant font-medium hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {step === 1 && (
          <button
            onClick={handleNext}
            className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-m3-large py-m3-x-small rounded-m3-full text-label-large shadow-m3-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Get Started
          </button>
        )}
      </footer>
    </main>
  );
}

