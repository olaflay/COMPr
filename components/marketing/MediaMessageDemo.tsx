'use client';

/* eslint-disable @next/next/no-img-element */
import {
  useCallback,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';

export type WhatsAppMode = 'Status' | 'Chat' | 'Product';

interface MediaMessageDemoProps {
  mode: WhatsAppMode;
}

const MODE_CONTEXT: Record<WhatsAppMode, string> = {
  Status: 'For Status: e go stay sharp after upload.',
  Chat: 'For chat: e go stay sharp after send.',
  Product: 'For your catalog: e go stay sharp for customers.',
};

export default function MediaMessageDemo({ mode }: MediaMessageDemoProps) {
  const [sliderPos, setSliderPos] = useState(42);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let pos = (x / rect.width) * 100;
    if (pos < 0) pos = 0;
    if (pos > 100) pos = 100;
    setSliderPos(pos);
  }, []);

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => handleMove(e.clientX);
  const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) handleMove(e.touches[0].clientX);
  };

  const handleSliderKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSliderPos((prev) => Math.max(0, prev - step));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSliderPos((prev) => Math.min(100, prev + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPos(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPos(100);
    }
  };

  return (
    <div className="w-full flex flex-col items-end gap-m3-x-small text-left">
      <div className="relative w-full bg-surface-container-low border border-outline-variant rounded-m3-xl rounded-br-m3-sm p-m3-medium shadow-m3-1 flex flex-col gap-m3-x-small">
        <div className="w-m3-small h-m3-small rotate-45 absolute bottom-0 translate-y-1/2 right-m3-medium bg-surface-container-low border-r border-b border-outline-variant" aria-hidden="true" />

        <div className="flex justify-between items-center gap-m3-x-small">
          <span className="text-label-medium text-primary font-semibold uppercase tracking-wide">
            NoBlur send
          </span>
          <span className="text-label-small text-on-surface-variant">
            <span className="font-mono">8.2 MB</span>
            <span aria-hidden="true"> &rarr; </span>
            <span className="font-mono text-primary font-semibold">380 KB</span>
          </span>
        </div>

        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="relative overflow-hidden w-full aspect-video rounded-m3-md border border-outline select-none cursor-ew-resize bg-surface-container"
        >
          <img
            src="/water.jpg"
            alt="Water detail preview, sharp after NoBlur optimization"
            className="absolute inset-0 w-full h-full object-cover select-none"
            draggable={false}
          />
          <div className="absolute right-m3-medium bottom-m3-medium bg-inverse-surface text-inverse-on-surface text-label-small px-m3-x-small py-m3-xxx-small rounded-m3-sm shadow-m3-1 z-10 opacity-75">
            NoBlur send
          </div>

          <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
            <img
              src="/water.jpg"
              alt="Water detail preview, blurred by normal WhatsApp compression"
              className="absolute inset-0 w-full h-full object-cover select-none blur-[3px] contrast-[0.95]"
              style={{ width: containerRef.current?.getBoundingClientRect().width || '100%', maxWidth: 'none' }}
              draggable={false}
            />
            <div className="absolute left-m3-medium bottom-m3-medium bg-inverse-surface text-inverse-on-surface text-label-small px-m3-x-small py-m3-xxx-small rounded-m3-sm shadow-m3-1 z-10 opacity-75">
              WhatsApp send
            </div>
          </div>

          <div className="absolute inset-y-0 w-1 bg-primary z-20" style={{ left: `${sliderPos}%` }}>
            <div
              role="slider"
              tabIndex={0}
              aria-label="Drag to compare WhatsApp send versus NoBlur send"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliderPos)}
              aria-valuetext={`Showing ${Math.round(sliderPos)}% normal WhatsApp send, ${Math.round(100 - sliderPos)}% NoBlur send`}
              onKeyDown={handleSliderKeyDown}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-m3-full bg-primary text-on-primary shadow-m3-2 flex items-center justify-center border-2 border-on-primary cursor-ew-resize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l-4 4 4 4m8-8l4 4-4 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-m3-x-small text-label-small text-on-surface-variant">
          <span className="text-label-medium text-primary" aria-hidden="true">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.3 15.5l-3.2-3.2 1.2-1.2 2 2 5.3-5.3 1.2 1.2-6.5 6.5z" />
              <path d="M17.5 15.6l-1.2 1.2-2.3-2.3 1.2-1.2 2.3 2.3z" />
            </svg>
          </span>
          <span className="font-medium text-on-surface-variant">Delivered sharp</span>
          <span className="font-mono ml-auto">now</span>
        </div>
      </div>

      <p key={mode} className="text-label-medium text-on-surface-variant animate-fade-in">
        {MODE_CONTEXT[mode]}
      </p>
    </div>
  );
}
