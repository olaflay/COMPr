'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence, type Variants, type Transition } from 'motion/react';
import SiteHeader from '../../components/marketing/SiteHeader';
import SiteFooter from '../../components/marketing/SiteFooter';
import ComparisonSlider from '../../components/marketing/ComparisonSlider';
import InteractiveDropZone from '../../components/marketing/InteractiveDropZone';
import CodePreview from '../../components/marketing/CodePreview';
import CostCalculator from '../../components/marketing/CostCalculator';

const smoothTransition: Transition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1] as const,
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export default function MarketingClient() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does Vecteus reduce our cloud bills?',
      a: 'Vecteus automatically shrinks incoming videos by up to 75% before they are stored. Smaller files mean you pay significantly less for cloud storage and user streaming bandwidth every month.',
    },
    {
      q: 'Does picture quality get worse when files shrink?',
      a: 'No. Every transcode is validated by an automated perceptual quality gate (VMAF >= 90.0) before saving. Fine edges, texture details, and color fidelity are preserved.',
    },
    {
      q: 'Do user video files pass through your application servers?',
      a: 'No. Files upload directly from user devices into your own Amazon S3 or Cloudflare storage bucket using secure direct links. Your servers never get bogged down by heavy video uploads.',
    },
    {
      q: 'How fast can we integrate Vecteus into our app?',
      a: 'Most teams get up and running in under 15 minutes using our 3-line TypeScript SDK or simple REST API calls.',
    },
    {
      q: 'Which cloud storage providers do you support?',
      a: 'Vecteus connects directly with AWS S3, Cloudflare R2, Google Cloud Storage, or any S3-compatible cloud storage bucket.',
    },
  ];

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col justify-between bg-[#0B0F17] text-slate-100 pt-m3-x-small pb-m3-medium px-m3-medium md:pt-m3-small md:pb-m3-large md:px-m3-large">
      <SiteHeader />

      <div className="flex-1 flex flex-col items-center justify-start max-w-[1080px] mx-auto w-full px-m3-small pt-m3-large md:pt-m3-xx-large pb-m3-large md:pb-m3-xx-large gap-y-m3-xx-large">
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col items-center text-center gap-y-m3-medium w-full"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-m3-xx-small bg-primary/10 border border-primary/25 px-m3-small py-m3-xxx-small rounded-m3-full text-label-small md:text-label-medium text-primary font-medium tracking-wide"
          >
            <span className="w-2 h-2 rounded-full bg-primary" />
            Headless Media Ingestion | Direct S3 &amp; Cloudflare R2 Proxy
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] font-extrabold text-white tracking-tight leading-[1.15] max-w-[900px]"
          >
            Cut video storage and streaming bills by up to{' '}
            <span className="text-primary underline decoration-primary/40 underline-offset-8">75%</span> without losing picture quality.
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-body-large text-slate-300 max-w-[720px] leading-relaxed"
          >
            Vecteus connects directly to your cloud storage. Video payloads shrink by up to 75% on ingest, cutting storage and egress bills while guaranteeing broadcast-grade perceptual fidelity.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center gap-m3-small mt-m3-xx-small"
          >
            <Link
              href="/dashboard"
              className="bg-primary hover:bg-[#188c43] text-white transition-all duration-200 py-m3-x-small px-m3-large rounded-m3-full text-label-large font-semibold shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-[0.98] min-w-[200px] text-center"
            >
              Start Building Free
            </Link>
            <Link
              href="/how-it-works"
              className="bg-surface-container-high/60 hover:bg-surface-container-high text-slate-200 transition-all duration-200 py-m3-x-small px-m3-large rounded-m3-full text-label-large font-medium border border-outline-variant/40 hover:border-slate-500 min-w-[180px] text-center"
            >
              How It Works &rarr;
            </Link>
          </motion.div>

          {/* Key Metric Highlights Strip */}
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-3 gap-m3-small w-full mt-m3-small pt-m3-small border-t border-slate-800"
          >
            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-center sm:items-start p-m3-small rounded-m3-lg bg-[#121824]/60 border border-slate-800/80"
            >
              <span className="text-headline-small font-extrabold text-primary font-mono">75% Smaller</span>
              <span className="text-body-small text-slate-400">Average bandwidth and storage reduction</span>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-center sm:items-start p-m3-small rounded-m3-lg bg-[#121824]/60 border border-slate-800/80"
            >
              <span className="text-headline-small font-extrabold text-white font-mono">VMAF &gt;= 90.0</span>
              <span className="text-body-small text-slate-400">Closed-loop Netflix perceptual quality gate</span>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-center sm:items-start p-m3-small rounded-m3-lg bg-[#121824]/60 border border-slate-800/80"
            >
              <span className="text-headline-small font-extrabold text-white font-mono">$0 Transit Fees</span>
              <span className="text-body-small text-slate-400">Direct uploads straight to your cloud bucket</span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Section 1: Live Interactive Browser Drop Playground */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={smoothTransition}
          className="w-full"
          aria-label="Interactive video test playground"
        >
          <InteractiveDropZone />
        </motion.section>

        {/* Section 2: Interactive Comparison Slider */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={smoothTransition}
          className="w-full flex flex-col gap-y-m3-small"
          aria-label="Interactive quality comparison"
        >
          <div className="flex flex-col items-start gap-y-m3-xxx-small text-left">
            <h2 className="text-headline-small md:text-headline-medium text-white font-bold tracking-tight">
              See the Difference: Crisp Visuals at 1/4 the File Size
            </h2>
            <p className="text-body-medium text-slate-400 max-w-[680px]">
              Drag the interactive slider below to compare the original video against the optimized version. Notice how edges, colors, and textures stay completely intact.
            </p>
          </div>

          <ComparisonSlider
            originalImage="/water.jpg"
            compressedImage="/water.jpg"
            originalLabel="Original Video"
            compressedLabel="Vecteus Optimized"
            originalSize="50.0 MB"
            compressedSize="12.5 MB"
            qualityScore={94}
          />
        </motion.section>

        {/* Section 3: How It Works in 3 Simple Steps */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={smoothTransition}
          className="w-full flex flex-col gap-y-m3-medium"
          aria-label="How Vecteus works"
        >
          <div className="flex flex-col items-center text-center gap-y-m3-xxx-small">
            <h2 className="text-headline-small md:text-headline-medium text-white font-bold tracking-tight">
              How It Works: Simple, Direct, and Cloud-Native
            </h2>
            <p className="text-body-medium text-slate-400 max-w-[640px]">
              Zero extra server complexity. Your app stays fast and your user files never get trapped on middleman servers.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-m3-medium w-full"
          >
            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-start text-left p-m3-medium rounded-m3-xl bg-[#121824]/80 border border-slate-800 hover:border-primary/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-title-medium mb-m3-small font-mono">
                1
              </div>
              <h3 className="text-title-medium font-bold text-white mb-m3-xx-small">
                Direct Cloud Upload
              </h3>
              <p className="text-body-small text-slate-400 leading-relaxed">
                Your users upload video files straight to your Amazon S3 or Cloudflare storage bucket using secure temporary links. Your servers never handle heavy video bytes.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-start text-left p-m3-medium rounded-m3-xl bg-[#121824]/80 border border-slate-800 hover:border-primary/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-title-medium mb-m3-small font-mono">
                2
              </div>
              <h3 className="text-title-medium font-bold text-white mb-m3-xx-small">
                Perceptual Quality Gate
              </h3>
              <p className="text-body-small text-slate-400 leading-relaxed">
                Vecteus transcodes media using SVT-AV1 rate control and validates output with automated VMAF quality checks (score &gt;= 90.0) before saving.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-start text-left p-m3-medium rounded-m3-xl bg-[#121824]/80 border border-slate-800 hover:border-primary/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-title-medium mb-m3-small font-mono">
                3
              </div>
              <h3 className="text-title-medium font-bold text-white mb-m3-xx-small">
                Instant Notification
              </h3>
              <p className="text-body-small text-slate-400 leading-relaxed">
                The smaller video lands right inside your cloud bucket, and Vecteus sends your app an instant signed alert with exact file size and savings data.
              </p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Section 4: Interactive Live Code Preview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={smoothTransition}
          className="w-full flex flex-col gap-y-m3-small"
          aria-label="Developer code example"
        >
          <div className="flex flex-col items-start gap-y-m3-xxx-small text-left">
            <h2 className="text-headline-small md:text-headline-medium text-white font-bold tracking-tight">
              Developer-First: Up and Running in 3 Lines of Code
            </h2>
            <p className="text-body-medium text-slate-400 max-w-[680px]">
              Works with TypeScript, Node.js, Python, or standard REST calls. Integrate in minutes with zero infrastructure maintenance.
            </p>
          </div>

          <CodePreview />
        </motion.section>

        {/* Section 5: Cloud Cost Savings Calculator */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={smoothTransition}
          className="w-full flex flex-col gap-y-m3-small"
          aria-label="Cost savings calculator"
        >
          <CostCalculator />
        </motion.section>

        {/* Section 6: Plain-Language FAQ Accordion */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={smoothTransition}
          className="w-full flex flex-col gap-y-m3-medium"
          aria-label="Frequently asked questions"
        >
          <div className="flex flex-col items-center text-center gap-y-m3-xxx-small">
            <h2 className="text-headline-small md:text-headline-medium text-white font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-body-medium text-slate-400 max-w-[600px]">
              Everything you need to know about reducing video storage and bandwidth costs.
            </p>
          </div>

          <div className="flex flex-col gap-y-m3-xx-small w-full">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-m3-xl border border-slate-800 bg-[#121824]/60 overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-m3-small md:p-m3-medium text-left font-semibold text-white hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    aria-expanded={isOpen}
                  >
                    <span className="text-title-small md:text-title-medium pr-m3-small">{faq.q}</span>
                    <span
                      className={`text-slate-400 transition-transform duration-200 text-title-medium ${
                        isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                      aria-hidden="true"
                    >
                      &#9662;
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
                        className="overflow-hidden"
                      >
                        <div className="px-m3-small md:px-m3-medium pb-m3-medium text-body-medium text-slate-300 leading-relaxed border-t border-slate-800/60 pt-m3-small">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Section 7: Bottom Call to Action Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={smoothTransition}
          className="w-full rounded-m3-2xl p-m3-large md:p-m3-x-large bg-gradient-to-br from-[#121824] to-[#0D1520] border border-primary/30 flex flex-col items-center text-center gap-y-m3-small shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <h2 className="text-headline-medium md:text-headline-large font-bold text-white tracking-tight max-w-[650px] relative z-10">
            Ready to Cut Your Cloud Video Bills?
          </h2>
          <p className="text-body-large text-slate-300 max-w-[560px] relative z-10">
            Get your developer API key in seconds and start shrinking media without losing picture clarity.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-m3-small mt-m3-x-small relative z-10">
            <Link
              href="/dashboard"
              className="bg-primary hover:bg-[#188c43] text-white transition-all duration-200 py-m3-x-small px-m3-large rounded-m3-full text-label-large font-semibold shadow-lg hover:shadow-primary/30 active:scale-[0.98] min-w-[200px] text-center"
            >
              Get Free API Key
            </Link>
            <Link
              href="/how-it-works"
              className="bg-transparent hover:bg-white/5 text-slate-200 transition-colors py-m3-x-small px-m3-large rounded-m3-full text-label-large font-medium border border-slate-700 min-w-[180px] text-center"
            >
              Read Documentation
            </Link>
          </div>
        </motion.section>
      </div>

      <SiteFooter />
    </main>
  );
}