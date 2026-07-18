import type { Metadata } from 'next';
import { buildMetadata, organizationSchema, softwareApplicationSchema } from '../lib/seo';
import './globals.css';

export const metadata: Metadata = buildMetadata();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema(), softwareApplicationSchema()]),
          }}
        />
      </head>
      <body className="m3-surface min-h-screen antialiased">{children}</body>
    </html>
  );
}
