'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

interface ComparisonSliderProps {
  originalImage?: string;
  compressedImage?: string;
  originalLabel?: string;
  compressedLabel?: string;
  originalSize?: string;
  compressedSize?: string;
  qualityScore?: number;
}

export default function ComparisonSlider({
  originalImage = '/water.jpg',
  compressedImage = '/water.jpg',
  originalLabel = 'Original Video',
  compressedLabel = 'Vecteus Optimized',
  originalSize = '50.0 MB',
  compressedSize = '12.5 MB',
  qualityScore = 94,
}: ComparisonSliderProps) {
  // Target position is what the pointer dictates (0 - 100)
  const targetPosRef = useRef(50);
  // Current position is animated smoothly with spring damping
  const [sliderPos, setSliderPos] = useState(50);
  const currentPosRef = useRef(50);

  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const lastMidpointCrossRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Spring physics animation loop for silky 60fps / 120fps motion
  const animateSpring = useCallback(() => {
    const stiffness = 0.18;
    const diff = targetPosRef.current - currentPosRef.current;

    if (Math.abs(diff) > 0.05) {
      currentPosRef.current += diff * stiffness;
      setSliderPos(currentPosRef.current);

      // Midpoint gentle haptic tick
      const isPastMid = currentPosRef.current > 50;
      if (isPastMid !== lastMidpointCrossRef.current) {
        lastMidpointCrossRef.current = isPastMid;
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(8);
          } catch {}
        }
      }

      animationFrameRef.current = requestAnimationFrame(animateSpring);
    } else {
      currentPosRef.current = targetPosRef.current;
      setSliderPos(targetPosRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const triggerAnimation = useCallback(() => {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(animateSpring);
    }
  }, [animateSpring]);

  const updateFromPointer = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    targetPosRef.current = percent;
    triggerAnimation();
  }, [triggerAnimation]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsPointerDown(true);
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown) return;
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsPointerDown(false);
    if (e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let delta = 0;
    if (e.key === 'ArrowLeft') delta = -5;
    if (e.key === 'ArrowRight') delta = 5;
    if (e.key === 'Home') delta = -targetPosRef.current;
    if (e.key === 'End') delta = 100 - targetPosRef.current;

    if (delta !== 0) {
      e.preventDefault();
      targetPosRef.current = Math.max(0, Math.min(100, targetPosRef.current + delta));
      triggerAnimation();
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col gap-y-m3-small">
      {/* Top Telemetry & Quality Bar */}
      <div className="flex flex-wrap items-center justify-between gap-m3-small bg-[#121824]/90 backdrop-blur-md p-m3-small rounded-m3-xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-m3-small">
          <div className="flex items-center gap-m3-xx-small bg-primary/15 text-primary border border-primary/30 px-m3-small py-m3-xxx-small rounded-m3-full text-label-medium font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-primary" />
            VMAF Score: {qualityScore} / 100
          </div>
          <span className="text-body-small text-slate-300 hidden sm:inline">
            Netflix perceptual quality floor (target &gt;= 90.0)
          </span>
        </div>

        <div className="flex items-center gap-m3-xx-small">
          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            className={`text-label-small px-m3-small py-m3-xxx-small rounded-m3-full border transition-all ${
              isZoomed
                ? 'bg-primary text-on-primary border-primary shadow-sm'
                : 'bg-surface text-slate-300 border-outline-variant hover:bg-surface-container'
            }`}
            aria-pressed={isZoomed}
          >
            {isZoomed ? 'Zoom: 2x Active' : 'Inspect 2x Details'}
          </button>
        </div>
      </div>

      {/* Main Interactive Comparison Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Interactive before and after comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(sliderPos)}
        className="relative w-full aspect-video md:aspect-[16/9] max-h-[520px] rounded-m3-2xl overflow-hidden cursor-ew-resize select-none border border-slate-800 shadow-2xl bg-[#0B0F17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary touch-none"
      >
        {/* Right Layer: Vecteus Optimized */}
        <div className="absolute inset-0 w-full h-full">
          <div
            className={`w-full h-full relative transition-transform duration-200 ${
              isZoomed ? 'scale-150 origin-center' : 'scale-100'
            }`}
          >
            <Image
              src={compressedImage}
              alt={compressedLabel}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1080px"
              className="object-cover"
            />
          </div>

          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-white text-label-small px-m3-small py-m3-xxx-small rounded-m3-full border border-white/10 shadow-sm pointer-events-none">
            <span className="font-semibold text-primary">{compressedLabel}</span> ({compressedSize})
          </div>
        </div>

        {/* Left Layer: Original Source Clip */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden will-change-[width]"
          style={{ width: `${sliderPos}%` }}
        >
          <div
            className={`absolute inset-0 w-full h-full transition-transform duration-200 ${
              isZoomed ? 'scale-150 origin-center' : 'scale-100'
            }`}
            style={{ width: containerRef.current?.offsetWidth || '100%' }}
          >
            <Image
              src={originalImage}
              alt={originalLabel}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1080px"
              className="object-cover"
            />
          </div>

          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-white text-label-small px-m3-small py-m3-xxx-small rounded-m3-full border border-white/10 shadow-sm pointer-events-none">
            <span className="font-semibold text-slate-300">{originalLabel}</span> ({originalSize})
          </div>
        </div>

        {/* Divider Handle with Hardware Accelerated Translate */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_16px_rgba(255,255,255,0.85)] pointer-events-none will-change-[transform]"
          style={{
            transform: `translate3d(calc(${sliderPos} * (100% / 100) - 0.5px), 0, 0)`,
            left: 0,
            width: '1px',
            transformOrigin: 'left',
          }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center border-2 border-primary transition-transform hover:scale-110 active:scale-95">
            <svg
              className="w-4 h-4 text-slate-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M8 9l-3 3 3 3m8-6l3 3-3 3"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Visual Footnote */}
      <div className="flex flex-wrap items-center justify-between text-body-small text-slate-400 px-m3-x-small">
        <span>Slide horizontally to inspect fine edges and picture clarity</span>
        <span className="text-primary font-medium">75% smaller file size with zero visible degradation</span>
      </div>
    </div>
  );
}
