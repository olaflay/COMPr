import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../../../components/marketing/SiteHeader';
import SiteFooter from '../../../components/marketing/SiteFooter';
import { buildMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Pricing',
  description:
    'Simple developer-friendly pricing for media ingestion and perceptual transcoding. Free tier includes 100 encodes/month.',
  path: '/pricing',
});

export default function PricingPage() {
  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-background text-on-background px-m3-medium md:px-m3-large pt-m3-small md:pt-m3-medium pb-m3-large md:pb-m3-x-large">
      <div className="max-w-[1080px] w-full mx-auto flex-1 flex flex-col justify-between">
        <SiteHeader />

        <div className="max-w-4xl mx-auto flex flex-col gap-m3-large md:gap-m3-x-large py-m3-large md:py-m3-x-large w-full">
          <div className="text-center flex flex-col gap-m3-xx-small">
            <h1 className="text-headline-medium text-on-surface font-bold leading-tight tracking-tight">
              Developer-First Pricing
            </h1>
            <p className="text-body-medium text-on-surface-variant leading-relaxed max-w-lg mx-auto">
              Start building for free. Scale transparently as your video traffic grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-m3-medium">
            {/* Free Developer Tier */}
            <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-medium flex flex-col gap-m3-small justify-between">
              <div className="flex flex-col gap-m3-small">
                <div>
                  <h2 className="text-title-medium text-on-surface font-semibold">Developer</h2>
                  <p className="text-body-small text-on-surface-variant mt-m3-xxx-small">For testing and side projects</p>
                </div>
                <div className="text-headline-medium text-primary font-bold">
                  <span className="font-mono">$0</span>
                  <span className="text-body-small text-on-surface-variant font-normal"> / month</span>
                </div>
                <ul className="flex flex-col gap-m3-xx-small text-body-small text-on-surface">
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>100 free video jobs per month</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Direct S3 &amp; Cloudflare R2 presigning</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Automated VMAF &gt;= 90.0 quality gate</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>HMAC-SHA256 signed webhooks</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-xx-small px-m3-medium rounded-m3-full text-label-medium shadow-m3-1 transition-all duration-m3-medium-1 text-center block mt-m3-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Start Free
              </Link>
            </div>

            {/* Growth Tier */}
            <div className="bg-surface-container-low border-2 border-primary rounded-m3-lg p-m3-medium flex flex-col gap-m3-small justify-between relative shadow-lg">
              <div className="absolute -top-m3-x-small right-m3-medium bg-primary text-on-primary text-label-small font-bold px-m3-x-small py-0.5 rounded-m3-full">
                Popular
              </div>
              <div className="flex flex-col gap-m3-small">
                <div>
                  <h2 className="text-title-medium text-on-surface font-semibold">Growth</h2>
                  <p className="text-body-small text-on-surface-variant mt-m3-xxx-small">For production apps and SaaS</p>
                </div>
                <div className="text-headline-medium text-primary font-bold">
                  <span className="font-mono">$0.015</span>
                  <span className="text-body-small text-on-surface-variant font-normal"> / transcode min</span>
                </div>
                <ul className="flex flex-col gap-m3-xx-small text-body-small text-on-surface">
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Unlimited monthly volume</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Multi-bucket destination routing</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Custom target VMAF score configuration</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Priority concurrent worker queue</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="bg-primary hover:bg-[#188c43] text-white py-m3-xx-small px-m3-medium rounded-m3-full text-label-medium shadow-md transition-all text-center block mt-m3-small"
              >
                Upgrade to Growth
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-medium flex flex-col gap-m3-small justify-between">
              <div className="flex flex-col gap-m3-small">
                <div>
                  <h2 className="text-title-medium text-on-surface font-semibold">Enterprise</h2>
                  <p className="text-body-small text-on-surface-variant mt-m3-xxx-small">Custom volume and self-hosted</p>
                </div>
                <div className="text-headline-medium text-white font-bold">
                  <span className="font-mono">Custom</span>
                </div>
                <ul className="flex flex-col gap-m3-xx-small text-body-small text-on-surface">
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Volume discounts and custom commitments</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Self-hosted worker containers (cgroup sandboxed)</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>99.95% uptime SLA with dedicated support</span>
                  </li>
                  <li className="flex items-start gap-m3-x-small">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                    <span>VPC peering and private link options</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/about#talk-to-us"
                className="bg-surface-container hover:bg-surface-container-high text-on-surface py-m3-xx-small px-m3-medium rounded-m3-full text-label-medium border border-outline-variant text-center block mt-m3-small transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>

          <p className="text-body-small text-on-surface-variant text-center">
            Zero egress fees: all media uploads and downloads route client-to-storage directly. Staging files purged within 24 hours.
          </p>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
