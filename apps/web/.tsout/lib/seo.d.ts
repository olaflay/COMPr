/**
 * Metadata + structured data builder for Next.js App Router.
 * PRD 37: Every marketing page is server-rendered with unique title,
 * description, canonical URL, Open Graph, and Twitter Card tags.
 */
export declare const SITE_NAME = "Vecteus";
export declare const BASE_URL: string;
export declare const DEFAULT_DESCRIPTION = "Pre-optimize and transcode media with automated VMAF quality | up to 80% smaller, zero egress, developer-first.";
export interface MetadataInput {
    title?: string;
    description?: string;
    path?: string;
    ogImage?: string;
    includeManifest?: boolean;
}
export interface PageMetadata {
    title: string;
    description: string;
    alternates: {
        canonical: string;
    };
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
    robots: {
        index: boolean;
        follow: boolean;
    };
    icons: {
        icon: string;
        shortcut: string;
        apple?: string;
    };
    manifest?: string;
}
export declare function buildMetadata({ title, description, path, ogImage, includeManifest, }?: MetadataInput): PageMetadata;
export interface SchemaOrg {
    '@context': string;
    '@type': string;
    [key: string]: unknown;
}
/** PRD 37: FAQPage structured data for the marketing FAQ section. */
export interface FaqPair {
    question: string;
    answer: string;
}
export declare function faqSchema(faqs: FaqPair[]): SchemaOrg;
/** PRD 37: Organization structured data, rendered once in root layout. */
export declare function organizationSchema(): SchemaOrg;
/** PRD 37: SoftwareApplication schema, accurately describing free/paid model. */
export declare function softwareApplicationSchema(): SchemaOrg;
//# sourceMappingURL=seo.d.ts.map