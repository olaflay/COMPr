'use client';

import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="w-full max-w-[1120px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-m3-medium text-body-small text-on-surface-variant border-t border-outline-variant pt-m3-xx-large md:pt-m3-xxxx-large select-none">
      <div>
        <span>&copy; {new Date().getFullYear()} NoBlur</span>
        <span aria-hidden="true"> · </span>
        <span>Files deleted automatically within 24 hours</span>
      </div>
      <nav className="flex items-center gap-m3-medium" aria-label="Footer navigation">
        <Link href="/about" className="hover:text-primary transition-colors duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          About
        </Link>
        <Link href="/how-it-works" className="hover:text-primary transition-colors duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          How it works
        </Link>
        <Link href="/pricing" className="hover:text-primary transition-colors duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Pricing
        </Link>
      </nav>
    </footer>
  );
}
