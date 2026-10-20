import MarketingClient from './marketing-client';
import { buildMetadata, faqSchema } from '../../lib/seo';

export const metadata = buildMetadata({
  path: '/',
});

const FAQS = [
  {
    question: 'How does Vecteus reduce our cloud bills?',
    answer:
      'Vecteus automatically shrinks incoming videos by up to 75% before they are stored. Smaller files mean you pay significantly less for cloud storage and user streaming bandwidth every month.',
  },
  {
    question: 'Does picture quality get worse when files shrink?',
    answer:
      'No. Every transcode is validated by an automated perceptual quality gate (VMAF >= 90.0) before saving. Fine edges, texture details, and color fidelity are preserved.',
  },
  {
    question: 'Do user video files pass through your application servers?',
    answer:
      'No. Files upload directly from user devices into your own Amazon S3 or Cloudflare storage bucket using secure direct links. Your servers never get bogged down by heavy video uploads.',
  },
  {
    question: 'How fast can we integrate Vecteus into our app?',
    answer:
      'Most teams get up and running in under 15 minutes using our 3-line TypeScript SDK or simple REST API calls.',
  },
  {
    question: 'Which cloud storage providers do you support?',
    answer:
      'Vecteus connects directly with AWS S3, Cloudflare R2, Google Cloud Storage, or any S3-compatible cloud storage bucket.',
  },
];

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }}
      />
      <MarketingClient />
    </>
  );
}