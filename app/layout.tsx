import type { Metadata, Viewport } from 'next';
import { Roboto } from 'next/font/google';
import { BASE_URL, buildMetadata, organizationSchema, softwareApplicationSchema } from '../lib/seo';
import './globals.css';
import { PostHogProvider } from './providers';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  ...buildMetadata(),
  other: {
    'google-translate': 'notranslate',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={roboto.variable}>
      <head>
        <meta name="description" content="Pre-optimize your photos and videos to stay sharp and clear after sending them on WhatsApp. No account required." />
        <link rel="alternate" hrefLang="pcm" href={BASE_URL} />
        <link rel="alternate" hrefLang="en" href={BASE_URL} />
        <link rel="alternate" hrefLang="x-default" href={BASE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema(), softwareApplicationSchema()]),
          }}
        />
      </head>
      <body className="m3-surface min-h-screen min-h-[100dvh] w-full flex flex-col antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <div id="main-content" className="flex-1 flex flex-col w-full">
          <PostHogProvider>{children}</PostHogProvider>
        </div>
      </body>
    </html>
  );
}
