import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../../../components/marketing/SiteHeader';
import SiteFooter from '../../../components/marketing/SiteFooter';
import { buildMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'How It Works',
  description:
    'Learn how Vecteus automates zero-egress media ingestion and perceptual transcoding with closed-loop VMAF verification.',
  path: '/how-it-works',
});

const STEPS = [
  {
    number: '1',
    title: 'Direct Storage Ingest',
    description:
      'Your application requests a presigned upload URL from Vecteus. The client uploads media directly to S3 or Cloudflare R2, bypassing your application servers entirely.',
  },
  {
    number: '2',
    title: 'Stream Probing and Rate Selection',
    description:
      'Vecteus inspects container structure, resolution, and stream dynamics to compute the optimal rate-control envelope without exceeding container resource limits.',
  },
  {
    number: '3',
    title: 'Perceptual Transcode and Quality Gate',
    description:
      'The engine encodes video via SVT-AV1 and measures visual quality using Netflix VMAF. If an encode falls below 90.0, the pipeline steps down CRF and retries automatically.',
  },
  {
    number: '4',
    title: 'Destination Write and Signed Webhook',
    description:
      'The compressed artifact lands directly in your destination bucket, and Vecteus fires an HMAC-SHA256 signed webhook notification with exact size reduction metrics.',
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-background text-on-background px-m3-medium md:px-m3-large pt-m3-small md:pt-m3-medium pb-m3-large md:pb-m3-x-large">
      <div className="max-w-[1080px] w-full mx-auto flex-1 flex flex-col justify-between">
        <SiteHeader />

        <div className="max-w-2xl mx-auto flex flex-col gap-m3-large md:gap-m3-x-large py-m3-large md:py-m3-x-large w-full">
          <div className="text-center flex flex-col gap-m3-xx-small">
            <h1 className="text-headline-medium text-on-surface font-bold leading-tight tracking-tight">
              How Vecteus Works
            </h1>
            <p className="text-body-medium text-on-surface-variant leading-relaxed max-w-md mx-auto">
              Four steps from client upload to verified, zero-egress optimized media.
            </p>
          </div>

          <div className="flex flex-col gap-m3-medium">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-m3-small items-start">
                <div className="w-8 h-8 rounded-m3-full bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-label-large shrink-0 select-none">
                  {step.number}
                </div>
                <div className="flex flex-col gap-m3-xxx-small pt-m3-xxx-small">
                  <h3 className="text-title-small text-on-surface font-semibold">{step.title}</h3>
                  <p className="text-body-small text-on-surface-variant leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-medium text-center flex flex-col gap-m3-small">
            <h2 className="text-title-medium text-on-surface font-semibold">Ready to integrate?</h2>
            <p className="text-body-small text-on-surface-variant leading-relaxed">
              Get an API key and integrate with our 3-line TypeScript SDK or REST endpoints.
            </p>
            <Link
              href="/dashboard"
              className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-x-small px-m3-large rounded-m3-full text-label-large font-medium shadow-m3-1 transition-all duration-m3-medium-1 inline-block self-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Get Started Free
            </Link>
          </div>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
