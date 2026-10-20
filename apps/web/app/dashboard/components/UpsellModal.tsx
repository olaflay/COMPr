'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '../../providers';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimBonus: () => void;
  upsell: {
    anchorLine: string;
    priceLine: string;
    ctaLabel: string;
  };
}

export default function UpsellModal({
  isOpen,
  onClose,
  onClaimBonus,
  upsell,
}: UpsellModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const modal = modalRef.current;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const trap = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-m3-large backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Premium"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-x-large max-w-md w-full shadow-m3-4 flex flex-col gap-m3-large animate-fade-in"
      >
        <div className="flex flex-col gap-m3-small text-center">
          <h2 className="text-headline-medium text-on-surface">You don hit today limit</h2>
          <p className="text-body-medium text-on-surface-variant leading-relaxed">{upsell.anchorLine}</p>
          <p className="text-body-large text-primary">{upsell.priceLine}</p>
        </div>
        <div className="flex flex-col gap-m3-small">
          <button
            onClick={() => {
              onClose();
              trackEvent('upsell_cta_clicked', { source: 'modal' });
            }}
            className="w-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-small rounded-m3-full text-title-small shadow-m3-1 transition-all duration-m3-medium-1"
          >
            {upsell.ctaLabel}
          </button>
          <div className="flex items-center gap-m3-small" aria-hidden="true">
            <div className="flex-1 h-px bg-outline-variant" />
            <span className="text-label-small text-on-surface-variant">or</span>
            <div className="flex-1 h-px bg-outline-variant" />
          </div>
          <button
            onClick={onClaimBonus}
            className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline py-m3-small rounded-m3-full text-title-small flex items-center justify-center gap-m3-x-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] transition-all duration-m3-short-2"
          >
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share Vecteus to WhatsApp
          </button>
          <p className="text-label-small text-on-surface-variant text-center">Get +3 compressions today, free</p>
          <button
            onClick={() => {
              onClose();
              trackEvent('upsell_dismissed');
            }}
            className="w-full text-label-large text-on-surface-variant font-medium py-m3-x-small hover:text-on-surface transition-colors"
          >
            No wahala, maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
