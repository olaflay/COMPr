/**
 * Metadata + structured data builder for Next.js App Router.
 * PRD 37: Every marketing page is server-rendered with unique title,
 * description, canonical URL, Open Graph, and Twitter Card tags.
 */

export const SITE_NAME = 'NoBlur';
export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://noblur.app';
export const DEFAULT_DESCRIPTION =
  'Pre-optimize photos and videos so they stay sharp after WhatsApp compresses them | up to 90% smaller, 5 free daily, no account needed.';

export interface MetadataInput {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
}

export interface PageMetadata {
  title: string;
  description: string;
  alternates: { canonical: string };
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    images: string[];
    locale: string;
    type: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    images: string[];
  };
  robots: { index: boolean; follow: boolean };
  icons: {
    icon: string;
    shortcut: string;
    apple?: string;
  };
  manifest: string;
}

export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  ogImage = '/og-default.jpg',
}: MetadataInput = {}): PageMetadata {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} | WhatsApp-ready photos and videos`;
  const url = `${BASE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [`${BASE_URL}${ogImage}`],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [`${BASE_URL}${ogImage}`],
    },
    robots: { index: true, follow: true },
    icons: {
      icon: '/favicon.svg',
      shortcut: '/favicon.ico',
      apple: '/favicon.svg',
    },
    manifest: '/manifest.json',
  };
}

export interface SchemaOrg {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

/** PRD 37: Organization structured data, rendered once in root layout. */
export function organizationSchema(): SchemaOrg {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.svg`,
    description: DEFAULT_DESCRIPTION,
  };
}

/** PRD 37: SoftwareApplication schema, accurately describing free/paid model. */
export function softwareApplicationSchema(): SchemaOrg {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'NGN',
      description: 'Free tier with a daily usage limit; paid tier removes the daily cap.',
    },
  };
}
