'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SiteHeader from '../../components/marketing/SiteHeader';
import SiteFooter from '../../components/marketing/SiteFooter';
import MediaMessageDemo, { type WhatsAppMode } from '../../components/marketing/MediaMessageDemo';

const MODE_SUB_COPY: Record<WhatsAppMode, string> = {
  Status: 'Tuned for Status, so your video keeps more detail when WhatsApp compresses am.',
  Chat: 'Tuned for Chat, so your photos and videos keep detail when you send am.',
  Product: 'Tuned for product photos, so dem stay sharp for your buyers.',
};

const CTA_LABEL: Record<WhatsAppMode, string> = {
  Status: 'Optimise a Status video',
  Chat: 'Optimise for Chat',
  Product: 'Optimise product photos',
};

const PRESET_BY_MODE: Record<WhatsAppMode, string> = {
  Status: 'STATUS',
  Chat: 'CHAT',
  Product: 'CUSTOM',
};

export default function MarketingClient() {
  const router = useRouter();
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [whatsappMode, setWhatsappMode] = useState<WhatsAppMode>('Status');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isHeroDragging, setIsHeroDragging] = useState(false);

  const handleHeroFile = (file: File) => {
    if (typeof window !== 'undefined') {
      (window as any).__stagedNoBlurFile = file;
    }
    router.push(`/dashboard?preset=${PRESET_BY_MODE[whatsappMode]}`);
  };

  const handleHeroFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleHeroFile(e.target.files[0]);
    }
  };

  const handleHeroDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHeroDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleHeroFile(e.dataTransfer.files[0]);
    }
  };

  const faqs = [
    {
      q: 'Does NoBlur bypass WhatsApp compression?',
      a: 'No. WhatsApp compresses every file you send. NoBlur pre-optimizes your media so it survives that compression with maximum details intact.',
    },
    {
      q: 'How is NoBlur different from other WhatsApp compressors?',
      a: 'Most tools only handle Status. NoBlur tunes separately for Status, Chat, and product photos, and shows you a before-and-after comparison so you can see exactly how much sharper your file is before you send.',
    },
    {
      q: 'Is my media secure?',
      a: 'Yes. Every file you upload is automatically and permanently deleted from our servers within 24 hours.',
    },
    {
      q: 'Do I need to sign up?',
      a: 'No. You can start optimizing photos and videos immediately without creating an account or sharing personal info.',
    },
    {
      q: 'Is NoBlur free to use?',
      a: 'Yes, you get 5 free optimizations every day, plus 3 more if you share NoBlur to WhatsApp. A ₦2,500/month Premium plan for unlimited use is coming soon.',
    },
  ];

  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-background text-on-background pt-m3-medium pb-m3-large px-m3-large md:pt-m3-x-large md:pb-m3-xxx-large md:px-m3-xxx-large">
      <SiteHeader />

      <div className="flex-1 flex flex-col items-center justify-start max-w-[1120px] mx-auto w-full px-m3-medium pt-m3-xxx-large md:pt-m3-6xl pb-m3-xxx-large md:pb-m3-7xl">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-m3-x-large md:gap-m3-xx-large items-center w-full">
          <div className="flex flex-col items-start text-left gap-y-m3-medium">
            <div className="flex flex-col items-start gap-y-m3-x-small message-reveal" style={{ animationDelay: '0.02s' }}>
              <p className="text-label-large text-on-surface-variant">Where you dey post am?</p>
              <div
                className="flex flex-wrap gap-m3-x-small"
                role="radiogroup"
                aria-label="WhatsApp destination selection"
              >
                {(['Status', 'Chat', 'Product'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={whatsappMode === mode}
                    onClick={() => setWhatsappMode(mode)}
                    className={`flex items-center gap-m3-xx-small py-m3-x-small px-m3-medium rounded-m3-full border transition-all duration-m3-medium-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] ${whatsappMode === mode
                      ? 'bg-primary-container text-on-primary-container border-primary-container font-semibold shadow-m3-1'
                      : 'bg-surface text-on-surface border-outline hover:bg-surface-container-high'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <h1 className="hero-display-text text-on-surface leading-tight message-reveal" style={{ animationDelay: '0.06s' }}>
              WhatsApp dey reduce quality?
              <br />
              <span className="text-primary">NoBlur</span> make it <span className="text-primary">sharp</span>.
            </h1>

            <p key={whatsappMode} className="text-body-large text-on-surface-variant leading-relaxed animate-fade-in message-reveal" style={{ animationDelay: '0.1s' }}>
              {MODE_SUB_COPY[whatsappMode]}
            </p>

            <div
              onDrop={handleHeroDrop}
              onDragOver={(e) => { e.preventDefault(); setIsHeroDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsHeroDragging(true); }}
              onDragLeave={() => setIsHeroDragging(false)}
              className={`flex flex-col items-start gap-m3-small w-full mt-m3-x-small message-reveal rounded-m3-lg p-m3-x-small transition-all duration-m3-short-2 ${
                isHeroDragging ? 'border-2 border-dashed border-primary bg-primary-container/10' : ''
              }`}
              style={{ animationDelay: '0.14s' }}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-m3-small w-full">
                <button
                  type="button"
                  onClick={() => heroFileInputRef.current?.click()}
                  className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container transition-all duration-m3-medium-1 ease-m3-standard py-m3-small px-m3-x-large rounded-m3-full text-title-medium shadow-m3-1 hover:shadow-m3-2 hover:-translate-y-[2px] min-w-[200px] text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] active:shadow-m3-0 flex items-center justify-center gap-m3-x-small cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Select photo or video</span>
                </button>
                <Link
                  href={`/dashboard?preset=${PRESET_BY_MODE[whatsappMode]}`}
                  className="text-on-surface hover:text-primary transition-colors py-m3-small px-m3-medium text-center text-label-large underline-offset-4 hover:underline"
                >
                  {CTA_LABEL[whatsappMode]} &rarr;
                </Link>
              </div>

              <input
                ref={heroFileInputRef}
                type="file"
                accept="video/*,image/*"
                onChange={handleHeroFileSelect}
                className="hidden"
                aria-label="Select a photo or video to optimize"
              />

              <span className="text-label-small text-on-surface-variant">
                {isHeroDragging ? 'Drop your file here to optimize' : 'Free to use: no account required. Drag and drop supported.'}
              </span>
            </div>
          </div>

          {/* Signature: the media-message seam */}
          <div className="message-reveal" style={{ animationDelay: '0.1s' }}>
            <MediaMessageDemo mode={whatsappMode} />
          </div>
        </div>

        {/* Trust Signal Strip */}
        <div className="w-full flex flex-wrap justify-center items-center gap-x-m3-x-large gap-y-m3-small py-m3-medium border-y border-outline-variant/40 mt-m3-xxx-large md:mt-m3-6xl">
          <div className="flex items-center gap-m3-x-small text-body-small text-on-surface-variant">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Files deleted within 24 hours</span>
          </div>
          <div className="flex items-center gap-m3-x-small text-body-small text-on-surface-variant">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
            </svg>
            <span><span className="font-mono font-semibold text-on-surface">5</span> free files every day</span>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="w-full flex flex-col items-center gap-y-m3-x-large mt-m3-xxx-large md:mt-m3-6xl">
          <div className="text-center flex flex-col gap-y-m3-x-small">
            <h2 className="text-headline-medium text-on-surface font-bold">Three steps. That is it.</h2>
            <p className="text-body-large text-on-surface-variant">No complicated settings. No sign-up needed.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-m3-large w-full relative">
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-outline-variant z-0" aria-hidden="true" />

            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                ),
                title: 'Upload your media',
                text: 'Drop a photo or video. No sign-up. Works instantly.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                ),
                title: 'NoBlur prepares it',
                text: 'Pre-optimized to look sharp after WhatsApp compresses it.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                ),
                title: 'Download and send',
                text: 'Get your file. Send it on WhatsApp. Stays sharp.',
              },
            ].map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center gap-y-m3-medium relative z-10">
                <div className="w-16 h-16 rounded-m3-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-m3-1">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    {step.icon}
                  </svg>
                </div>
                <div className="flex flex-col gap-y-m3-xx-small">
                  <span className="text-label-small text-primary font-semibold uppercase tracking-wide">
                    Step {i + 1}
                  </span>
                  <h3 className="text-title-medium text-on-surface font-semibold">{step.title}</h3>
                  <p className="text-body-small text-on-surface-variant leading-relaxed">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core Features Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-m3-large text-left mt-m3-xxx-large md:mt-m3-6xl">
          <div className="bg-surface-container-low border border-outline-variant p-m3-large rounded-m3-lg flex flex-col gap-y-m3-medium shadow-m3-1 hover:shadow-m3-2 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-m3-medium-1">
            <div className="text-primary w-8 h-8 flex items-center justify-center" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-title-large text-on-surface font-semibold">Tuned for WhatsApp</h3>
            <p className="text-body-medium text-on-surface-variant leading-relaxed">
              Built for WhatsApp&apos;s own limits on Status, Chat, and product photos, not just one surface.
            </p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-m3-large rounded-m3-lg flex flex-col gap-y-m3-medium shadow-m3-1 hover:shadow-m3-2 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-m3-medium-1">
            <div className="text-primary w-8 h-8 flex items-center justify-center" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-title-large text-on-surface font-semibold">Smart presets</h3>
            <p className="text-body-medium text-on-surface-variant leading-relaxed">
              Status, Chat, or Custom. Each one adjusts the file to hit the right size and stay sharp.
            </p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-m3-large rounded-m3-lg flex flex-col gap-y-m3-medium shadow-m3-1 hover:shadow-m3-2 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-m3-medium-1">
            <div className="text-primary w-8 h-8 flex items-center justify-center" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-title-large text-on-surface font-semibold">Privacy first</h3>
            <p className="text-body-medium text-on-surface-variant leading-relaxed">
              Every file you upload is automatically and permanently deleted from our servers within 24 hours.
            </p>
          </div>
        </div>

        {/* Bottom CTA Section */}
        <div className="w-full bg-primary rounded-m3-xl px-m3-large py-m3-xx-large flex flex-col items-center text-center gap-y-m3-medium shadow-m3-2 mt-m3-xxx-large md:mt-m3-6xl">
          <h2 className="text-headline-large text-on-primary font-bold leading-tight max-w-lg">
            Ready to send sharp media on WhatsApp?
          </h2>
          <p className="text-body-large text-on-primary/80 max-w-sm">
            Keep your media sharp. Free to use. No account. 5 files daily.
          </p>
          <Link
            href="/dashboard"
            className="bg-on-primary text-primary hover:bg-on-primary/90 transition-all duration-m3-medium-1 ease-m3-standard py-m3-small px-m3-x-large rounded-m3-full text-title-medium shadow-m3-2 hover:shadow-m3-3 hover:-translate-y-[2px] active:scale-[0.98] active:shadow-m3-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary mt-m3-x-small"
          >
            Get Started Free
          </Link>
        </div>

        {/* FAQs Section */}
        <div className="w-full flex flex-col gap-y-m3-large text-left mt-m3-xxx-large md:mt-m3-6xl">
          <div className="flex flex-col gap-m3-x-small w-full max-w-2xl mx-auto">
            <h2 className="text-headline-small text-on-surface font-bold">Frequently Asked Questions</h2>
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={index} className="border border-outline-variant rounded-m3-md overflow-hidden bg-surface-container-low shadow-m3-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    className="w-full flex justify-between items-center p-m3-medium text-title-medium font-medium text-on-surface hover:bg-surface-container-high transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                  >
                    <span>{faq.q}</span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-m3-medium-1 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className={`transition-all duration-m3-medium-1 ease-m3-standard overflow-hidden ${isOpen ? 'max-h-[200px] border-t border-outline-variant' : 'max-h-0'}`}
                  >
                    <p className="p-m3-medium text-body-medium text-on-surface-variant leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
