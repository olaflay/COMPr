'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/pricing', label: 'Pricing' },
] as const;

export default function SiteHeader() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    document.addEventListener('keydown', handleEscape);

    // Focus trap implementation for dialog accessibility
    const drawerElement = document.querySelector('[role="dialog"]');
    let handleTab: ((e: KeyboardEvent) => void) | null = null;
    
    if (drawerElement) {
      const focusableElements = drawerElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      firstElement?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (handleTab) {
        document.removeEventListener('keydown', handleTab);
      }
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const linkClass = (isActive: boolean) =>
    `text-label-large px-m3-medium py-m3-x-small rounded-m3-full transition-all duration-m3-short-2 ease-m3-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97] ${
      isActive
        ? 'text-primary bg-primary-container/20 hover:bg-primary-container/30'
        : 'text-on-surface-variant hover:text-primary hover:bg-primary-container/10'
    }`;

  return (
    <header className="flex md:grid md:grid-cols-3 justify-between items-center w-full max-w-[1120px] mx-auto py-m3-medium px-m3-x-small md:px-0">
      <Link
        href="/"
        aria-label="NoBlur home"
        className="flex items-center gap-m3-x-small hover:opacity-85 transition-opacity duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary justify-self-start p-m3-xx-small rounded-m3-sm"
      >
        <Image
          src="/favicon.svg"
          alt=""
          width={32}
          height={32}
          className="rounded-m3-md select-none"
        />
        <span className="text-title-large tracking-tight select-none">NoBlur</span>
      </Link>

      <nav className="hidden md:flex justify-center items-center gap-m3-x-small justify-self-center" aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={linkClass(pathname === link.href)}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="justify-self-end flex items-center gap-m3-x-small">
        <Link
          href="/dashboard"
          className="hidden md:inline-block bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-m3-medium-1 ease-m3-standard px-m3-medium py-m3-x-small rounded-m3-full text-label-large shadow-m3-1 hover:-translate-y-0.5 active:scale-[0.97] active:shadow-m3-0"
        >
          Get Started
        </Link>

        <button
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open menu"
          className="md:hidden p-m3-x-small rounded-m3-full hover:bg-surface-variant/50 transition-all duration-m3-short-2 ease-m3-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.93]"
        >
          <svg
            className="w-6 h-6 text-on-surface"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {isDrawerOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="fixed inset-0 z-50 bg-background text-on-background flex flex-col justify-between p-m3-large animate-fade-in md:hidden"
          >
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-m3-x-small select-none">
                <Image
                  src="/favicon.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-m3-md"
                />
                <span className="text-title-large tracking-tight">NoBlur</span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close menu"
                className="p-m3-x-small rounded-m3-full hover:bg-surface-variant/50 transition-all duration-m3-short-2 ease-m3-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.93]"
              >
                <svg
                  className="w-6 h-6 text-on-surface"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-y-m3-large w-full max-w-xs mx-auto">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`text-headline-medium w-full text-center py-m3-small rounded-m3-full transition-all duration-m3-short-2 ease-m3-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97] ${
                    pathname === link.href
                      ? 'text-primary bg-primary-container/20'
                      : 'text-on-surface-variant hover:text-primary hover:bg-primary-container/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="w-full mt-m3-medium">
                <Link
                  href="/dashboard"
                  onClick={() => setIsDrawerOpen(false)}
                  className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-m3-medium-1 ease-m3-standard py-m3-medium rounded-m3-full text-title-medium shadow-m3-1 active:scale-[0.97] active:shadow-m3-0 block text-center w-full"
                >
                  Get Started
                </Link>
              </div>
            </div>

            <div className="h-m3-xxx-large w-full invisible" aria-hidden="true" />
          </div>,
          document.body
        )}
    </header>
  );
}
