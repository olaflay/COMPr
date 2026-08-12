import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../../../components/marketing/SiteHeader';
import SiteFooter from '../../../components/marketing/SiteFooter';

export const metadata: Metadata = {
  title: 'How It Works | NoBlur',
  description: 'Learn how NoBlur dey optimize your photos and videos for WhatsApp, up to 90% smaller with no visible quality loss.',
};

const STEPS = [
  {
    number: '1',
    title: 'Upload your file',
    description: 'Pick a video or photo from your phone or computer. Drag and drop or tap to select.',
  },
  {
    number: '2',
    title: 'Pick a preset',
    description: 'Choose Status, Chat, or Custom. Each preset is tuned for how WhatsApp handles that type of media.',
  },
  {
    number: '3',
    title: 'We optimize it',
    description: 'NoBlur analyzes your file and prepares it to survive WhatsApp compression, up to 90% smaller with no visible quality loss. Takes about 15 to 30 seconds.',
  },
  {
    number: '4',
    title: 'Download and send',
    description: 'Compare before and after, then download the optimized file. Send it on WhatsApp like any other file.',
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-background text-on-background px-m3-large md:px-m3-xxx-large pt-m3-medium md:pt-m3-x-large pb-m3-xxx-large md:pb-m3-6xl">
      <div className="max-w-[1120px] w-full mx-auto flex-1 flex flex-col justify-between">
        <SiteHeader />

        <div className="max-w-2xl mx-auto flex flex-col gap-m3-xxx-large md:gap-m3-6xl py-m3-xxxx-large md:py-m3-6xl">
          <div className="text-center flex flex-col gap-m3-small">
            <h1 className="text-display-small text-on-surface leading-tight tracking-tight">
              How NoBlur dey work
            </h1>
            <p className="text-body-large text-on-surface-variant leading-relaxed max-w-md mx-auto">
              Four simple steps to sharper media on WhatsApp.
            </p>
          </div>

          <div className="flex flex-col gap-m3-large">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-m3-medium items-start">
                <div className="w-10 h-10 rounded-m3-full bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-title-medium shrink-0 select-none">
                  {step.number}
                </div>
                <div className="flex flex-col gap-m3-xx-small pt-m3-xx-small">
                  <h3 className="text-title-medium text-on-surface">{step.title}</h3>
                  <p className="text-body-medium text-on-surface-variant leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large text-center flex flex-col gap-m3-medium">
            <h2 className="text-title-large text-on-surface">Ready to try it?</h2>
            <p className="text-body-medium text-on-surface-variant leading-relaxed">
              Your first optimization is free. No account needed.
            </p>
            <Link
              href="/dashboard"
              className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-small px-m3-x-large rounded-m3-full text-title-small shadow-m3-1 transition-all duration-m3-medium-1 inline-block self-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Start Now
            </Link>
          </div>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
