import MarketingClient from './marketing-client';
import { buildMetadata, faqSchema } from '../../lib/seo';

export const metadata = buildMetadata({
  path: '/',
});

const FAQS = [
  {
    question: 'Does NoBlur bypass WhatsApp compression?',
    answer:
      'No. WhatsApp compresses every file you send. NoBlur pre-optimizes your media so it survives that compression with maximum details intact.',
  },
  {
    question: 'How is NoBlur different from other WhatsApp compressors?',
    answer:
      'Most tools only handle Status. NoBlur tunes separately for Status, Chat, and product photos, and shows you a before-and-after comparison so you can see exactly how much sharper your file is before you send.',
  },
  {
    question: 'Is my media secure?',
    answer:
      'Yes. Every file you upload is automatically and permanently deleted from our servers within 24 hours.',
  },
  {
    question: 'Do I need to sign up?',
    answer:
      'No. You can start optimizing photos and videos immediately without creating an account or sharing personal info.',
  },
  {
    question: 'Is NoBlur free to use?',
    answer:
      'Yes, you get 5 free optimizations every day, plus 3 more if you share NoBlur to WhatsApp. A ₦2,500/month Premium plan for unlimited use is coming soon.',
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