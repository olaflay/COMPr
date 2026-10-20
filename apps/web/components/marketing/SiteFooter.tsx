'use client';

import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="w-full max-w-[1080px] mx-auto flex flex-col items-center border-t border-outline-variant pt-m3-large md:pt-m3-x-large pb-0 overflow-hidden select-none relative">
      <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-m3-medium text-body-small text-on-surface-variant z-10">
        <div>
          <span>&copy; {new Date().getFullYear()} Vecteus</span>
          <span aria-hidden="true"> · </span>
          <span>Files deleted automatically within 24 hours</span>
        </div>
        <nav className="flex items-center gap-m3-medium" aria-label="Footer navigation">
          <Link
            href="/about"
            className="hover:text-primary transition-colors duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            About
          </Link>
          <Link
            href="/how-it-works"
            className="hover:text-primary transition-colors duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            className="hover:text-primary transition-colors duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Pricing
          </Link>
        </nav>
      </div>

      {/* Subtle brand watermark: 3/4 height visible, bottom 1/4 cropped */}
      <div
        aria-hidden="true"
        className="w-full flex justify-center pointer-events-none select-none overflow-hidden mt-m3-small md:mt-m3-medium"
      >
        <span className="text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[9.5rem] font-extrabold tracking-tighter leading-none text-outline-variant/35 dark:text-outline-variant/20 translate-y-[25%] block">
          Vecteus
        </span>
      </div>
    </footer>
  );
}
