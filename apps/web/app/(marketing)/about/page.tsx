import type { Metadata } from 'next';
import SiteHeader from '../../../components/marketing/SiteHeader';
import SiteFooter from '../../../components/marketing/SiteFooter';
import ContactForm from '../../../components/marketing/ContactForm';
import { buildMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description:
    'Learn about Vecteus: headless zero-egress media ingestion and perceptual transcoding proxy for modern engineering teams.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-background text-on-background px-m3-medium md:px-m3-large pt-m3-small md:pt-m3-medium pb-m3-large md:pb-m3-x-large">
      <div className="max-w-[1080px] w-full mx-auto flex-1 flex flex-col justify-between">
        <SiteHeader />

        <div className="max-w-2xl mx-auto flex flex-col gap-m3-large md:gap-m3-x-large py-m3-large md:py-m3-x-large w-full">
          <div className="flex flex-col gap-m3-small">
            <h1 className="text-headline-medium text-on-surface font-bold leading-tight tracking-tight">
              About Vecteus
            </h1>
            <p className="text-body-medium text-on-surface-variant leading-relaxed">
              Video and visual media make up more than 80% of consumer internet traffic, driving massive cloud storage and egress fees for growing applications. Vecteus is a headless media ingestion proxy that automatically shrinks video payloads by up to 75% on upload, using closed-loop perceptual VMAF validation to ensure picture quality never degrades.
            </p>
          </div>

          <div className="flex flex-col gap-m3-small">
            <h2 className="text-title-large text-on-surface font-semibold">Zero-Egress Direct Storage</h2>
            <p className="text-body-medium text-on-surface-variant leading-relaxed">
              Your media stays inside your infrastructure. Vecteus generates secure direct upload presigned URLs so user files flow straight to your Amazon S3, Cloudflare R2, or compatible object store. Your web application servers never proxy bulky media bytes or suffer bandwidth bottlenecks.
            </p>
          </div>

          <div className="flex flex-col gap-m3-small">
            <h2 className="text-title-large text-on-surface font-semibold">Closed-Loop Quality Gate</h2>
            <p className="text-body-medium text-on-surface-variant leading-relaxed">
              Compression without quality validation produces unsightly artifacts. Vecteus uses SVT-AV1 rate control and measures every transcode against industry-standard Netflix VMAF metrics (quality floor &gt;= 90.0). If an encode does not meet the perceptual quality threshold, our engine automatically adjusts rate parameters before publishing.
            </p>
          </div>

          <div className="flex flex-col gap-m3-small">
            <h2 className="text-title-large text-on-surface font-semibold">Data Privacy and Retention</h2>
            <div className="flex flex-col gap-m3-small">
              <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-small">
                <h3 className="text-title-small text-primary font-semibold mb-m3-xx-small">Automatic Purging</h3>
                <p className="text-body-small text-on-surface leading-relaxed">
                  Staging files are purged immediately upon job completion or within 24 hours. We never retain customer media long term.
                </p>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-small">
                <h3 className="text-title-small text-primary font-semibold mb-m3-xx-small">Customer Storage Ownership</h3>
                <p className="text-body-small text-on-surface leading-relaxed">
                  Optimized files land directly into your own storage destination buckets. Vecteus never sells, shares, or trains models on user content.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-m3-small">
            <h2 className="text-title-large text-on-surface font-semibold">Talk to us</h2>
            <p className="text-body-small text-on-surface-variant leading-relaxed">
              Have questions, technical requirements, or custom storage integration needs? Send us a message and our engineering team will reply directly.
            </p>
            <ContactForm />
          </div>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
