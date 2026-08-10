import type { Metadata } from 'next';
import SiteHeader from '../../../components/marketing/SiteHeader';
import SiteFooter from '../../../components/marketing/SiteFooter';
import ContactForm from '../../../components/marketing/ContactForm';

export const metadata: Metadata = {
  title: 'About | COMPr',
  description: 'Learn how COMPr dey help you send sharper photos and videos for WhatsApp.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-on-background px-m3-large md:px-m3-xxx-large pt-m3-medium md:pt-m3-x-large pb-m3-xxx-large md:pb-m3-6xl">
      <div className="max-w-[1120px] mx-auto">
        <SiteHeader />

        <div className="max-w-2xl mx-auto flex flex-col gap-m3-xxx-large md:gap-m3-6xl py-m3-xxxx-large md:py-m3-6xl">
          <div className="flex flex-col gap-m3-medium">
            <h1 className="text-display-small text-on-surface leading-tight tracking-tight">
              About COMPr
            </h1>
            <p className="text-body-large text-on-surface-variant leading-relaxed">
              COMPr helps your photos and videos look sharper on WhatsApp by preparing them to survive WhatsApp&apos;s own compression. We do not bypass or disable WhatsApp&apos;s processing. We optimize your files so they still look great after WhatsApp applies its compression.
            </p>
          </div>

          <div className="flex flex-col gap-m3-medium">
            <h2 className="text-headline-small text-on-surface">How e dey work</h2>
            <p className="text-body-large text-on-surface-variant leading-relaxed">
              WhatsApp applies its own compression to every photo and video you send. That is WhatsApp&apos;s built-in behavior, and no tool can turn it off. COMPr pre-optimizes your media so that when WhatsApp applies its compression, the result still looks sharp.
            </p>
          </div>

          <div className="flex flex-col gap-m3-medium">
            <h2 className="text-headline-small text-on-surface">Privacy first</h2>
            <div className="flex flex-col gap-m3-small">
              <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-medium">
                <h3 className="text-title-medium text-primary mb-m3-x-small">Auto-deletion</h3>
                <p className="text-body-medium text-on-surface leading-relaxed">
                  Every file you upload is automatically deleted within 24 hours. We do not store your media long term.
                </p>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-medium">
                <h3 className="text-title-medium text-primary mb-m3-x-small">We never post for you</h3>
                <p className="text-body-medium text-on-surface leading-relaxed">
                  COMPr never posts to WhatsApp on your behalf. You download the optimized file and send it yourself, just like any other file.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-m3-medium">
            <h2 className="text-headline-small text-on-surface">Built for real use</h2>
            <p className="text-body-large text-on-surface-variant leading-relaxed">
              Whether you are a small business owner sharing product photos, a creator posting status updates, or someone who wants family videos to look their best, COMPr is designed to be simple and reliable.
            </p>
          </div>

          <div className="flex flex-col gap-m3-medium">
            <h2 className="text-headline-small text-on-surface">Talk to us</h2>
            <p className="text-body-medium text-on-surface-variant leading-relaxed">
              Have questions or feedback? Send us a message and we will reply to the email you provide.
            </p>
            <ContactForm />
          </div>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
