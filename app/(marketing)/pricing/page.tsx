import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../../../components/marketing/SiteHeader';
import SiteFooter from '../../../components/marketing/SiteFooter';

export const metadata: Metadata = {
  title: 'Pricing | NoBlur',
  description: 'NoBlur pricing: 5 free optimizations daily, up to 90% smaller files. Premium (₦2,500/month, unlimited use) is coming soon.',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-background text-on-background px-m3-large md:px-m3-xxx-large pt-m3-medium md:pt-m3-x-large pb-m3-xxx-large md:pb-m3-6xl">
      <div className="max-w-[1120px] w-full mx-auto flex-1 flex flex-col justify-between">
        <SiteHeader />

        <div className="max-w-2xl mx-auto flex flex-col gap-m3-xxx-large md:gap-m3-6xl py-m3-xxxx-large md:py-m3-6xl">
          <div className="text-center flex flex-col gap-m3-small">
            <h1 className="text-display-small text-on-surface leading-tight tracking-tight">
              Simple, honest pricing
            </h1>
            <p className="text-body-large text-on-surface-variant leading-relaxed max-w-md mx-auto">
              Start for free. Upgrade when you need more.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-m3-large">
            <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large flex flex-col gap-m3-medium">
              <div>
                <h2 className="text-title-large text-on-surface">Free</h2>
                <p className="text-body-medium text-on-surface-variant mt-m3-xx-small">For everyday use</p>
              </div>
              <div className="text-headline-large text-primary"><span className="font-mono">&#8358;0</span></div>
              <ul className="flex flex-col gap-m3-small text-body-medium text-on-surface">
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>5 optimizations per day, +3 more when you share to WhatsApp</span>
                </li>
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>Up to 90% smaller files, still sharp</span>
                </li>
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>Status and Chat presets</span>
                </li>
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>Before and after comparison</span>
                </li>
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>No account required</span>
                </li>
              </ul>
              <Link
                href="/dashboard"
                className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-x-small px-m3-large rounded-m3-full text-label-large shadow-m3-1 transition-all duration-m3-medium-1 text-center block mt-m3-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Get Started Free
              </Link>
            </div>

            <div className="bg-surface-container-low border-2 border-primary rounded-m3-lg p-m3-large flex flex-col gap-m3-medium relative">
              <div className="absolute -top-m3-small right-m3-medium bg-primary text-on-primary text-label-small font-bold px-m3-small py-m3-xx-small rounded-m3-full">
                Coming Soon
              </div>
              <div>
                <h2 className="text-title-large text-on-surface">Premium</h2>
                <p className="text-body-medium text-on-surface-variant mt-m3-xx-small">For heavy users and businesses</p>
              </div>
              <div className="text-headline-large text-primary"><span className="font-mono">&#8358;2,500</span><span className="text-body-medium text-on-surface-variant font-normal">/month</span></div>
              <ul className="flex flex-col gap-m3-small text-body-medium text-on-surface">
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>Unlimited optimizations</span>
                </li>
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>All presets including Custom</span>
                </li>
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>Priority processing</span>
                </li>
                <li className="flex items-start gap-m3-x-small">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-m3-xxx-small" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                  <span>Batch uploads</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-body-small text-on-surface-variant text-center">
            No card required for Free. Files are auto-deleted within 24 hours either way.
          </p>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
