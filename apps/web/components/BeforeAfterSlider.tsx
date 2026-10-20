/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, MouseEvent, TouchEvent, KeyboardEvent, useCallback, useEffect } from 'react';

interface BeforeAfterSliderProps {
  sourceFrameUrl: string;  // Image URL, or source video blob URL for video jobs
  outputFrameUrl: string;  // Image URL, or output MP4 URL for video jobs
  sizeBefore: number;
  sizeAfter: number;
  isVideo?: boolean;       // If true, render <video> and pin both to the same still frame
  onViewed?: () => void;   // Fired once when the comparison enters the viewport
}

// Both videos are seeked to the same representative timestamp and paused so the
// split slider compares matching frames instead of two live, unsynced streams
// (no audio, no CPU-heavy dual playback).
const VIDEO_SYNC_SEEK_SEC = 0.5;

export default function BeforeAfterSlider({
  sourceFrameUrl,
  outputFrameUrl,
  sizeBefore,
  sizeAfter,
  isVideo,
  onViewed,
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [outputLoaded, setOutputLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const outputVideoRef = useRef<HTMLVideoElement>(null);
  const viewedRef = useRef(false);

  const imagesLoaded = sourceLoaded && outputLoaded;

  // Park a video on its still frame: wait for the first frame, seek to the
  // sync timestamp, and stay paused.
  const handleVideoLoadedData = (el: HTMLVideoElement | null) => {
    if (!el) return;
    el.currentTime = VIDEO_SYNC_SEEK_SEC;
    el.pause();
  };

  // Fire the canonical analytics event once, when the comparison actually
  // scrolls into view (PRD §28 / PRODUCT-GAPS-AND-MICRO-SPEC Feature 5).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (viewedRef.current) return;
        if (entries.some((e) => e.isIntersecting)) {
          viewedRef.current = true;
          onViewed?.();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onViewed]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = 2;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let position = (x / rect.width) * 100;
    if (position < 0) position = 0;
    if (position > 100) position = 100;
    setSliderPosition(position);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - step));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    }
  };

  const savingsPct = sizeBefore > 0 ? Math.round(((sizeBefore - sizeAfter) / sizeBefore) * 100) : 0;

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg shadow-m3-1 p-m3-medium max-w-2xl mx-auto flex flex-col gap-m3-medium">
      {/* Visual Header */}
      <div className="flex justify-between items-center text-on-surface">
        <h4 className="text-title-medium text-primary">Quality Comparison</h4>
        <span className="text-label-large bg-primary-container text-on-primary-container px-m3-x-small py-m3-xxx-small rounded-m3-full">
          -{savingsPct}% size
        </span>
      </div>

      {/* Slider Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="relative overflow-hidden w-full aspect-video rounded-m3-md cursor-ew-resize select-none border border-outline"
      >
        {/* Loading skeleton while frames load */}
        {!imagesLoaded && (
          <div className="absolute inset-0 skeleton" aria-label="Loading comparison images" />
        )}

        {/* Output frame (Background) — for video jobs, both sides are parked on the same timestamp */}
        {isVideo ? (
          <video
            ref={outputVideoRef}
            src={outputFrameUrl}
            muted
            playsInline
            preload="auto"
            onLoadedData={() => handleVideoLoadedData(outputVideoRef.current)}
            onSeeked={() => setOutputLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-m3-medium-2 ${outputLoaded ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          />
        ) : (
          <img
            src={outputFrameUrl}
            alt="Optimized Output"
            onLoad={() => setOutputLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-m3-medium-2 ${outputLoaded ? 'opacity-100' : 'opacity-0'}`}
            draggable={false}
          />
        )}
        <div className="absolute right-m3-medium bottom-m3-medium bg-inverse-surface text-inverse-on-surface text-label-small px-m3-x-small py-m3-xxx-small rounded-m3-sm shadow-m3-1 z-10 opacity-75">
          Optimized
        </div>

        {/* Source frame (Foreground, clipped) */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          {isVideo ? (
            <video
              ref={sourceVideoRef}
              src={sourceFrameUrl}
              muted
              playsInline
              preload="auto"
              onLoadedData={() => handleVideoLoadedData(sourceVideoRef.current)}
              onSeeked={() => setSourceLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-m3-medium-2 ${sourceLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ width: containerRef.current?.getBoundingClientRect().width || '100%', maxWidth: 'none' }}
              aria-hidden="true"
            />
          ) : (
            <img
              src={sourceFrameUrl}
              alt="Original Source"
              onLoad={() => setSourceLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-m3-medium-2 ${sourceLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ width: containerRef.current?.getBoundingClientRect().width || '100%', maxWidth: 'none' }}
              draggable={false}
            />
          )}
          <div className="absolute left-m3-medium bottom-m3-medium bg-inverse-surface text-inverse-on-surface text-label-small px-m3-x-small py-m3-xxx-small rounded-m3-sm shadow-m3-1 z-10 opacity-75">
            Original
          </div>
        </div>

        {/* Slider bar line with keyboard-accessible handle */}
        <div
          className="absolute inset-y-0 w-1 bg-primary z-20"
          style={{ left: `${sliderPosition}%` }}
        >
          <div
            role="slider"
            tabIndex={0}
            aria-label="Drag to compare original and optimized quality"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPosition)}
            aria-valuetext={`Showing ${Math.round(sliderPosition)}% original, ${Math.round(100 - sliderPosition)}% optimized`}
            onKeyDown={handleKeyDown}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-m3-full bg-primary text-on-primary shadow-m3-2 flex items-center justify-center border-2 border-on-primary cursor-ew-resize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-2 focus-visible:ring-on-primary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M8 9l-4 4 4 4m8-8l4 4-4 4"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Metadata metrics */}
      <div className="grid grid-cols-2 gap-m3-medium border-t border-outline-variant pt-m3-small text-center">
        <div>
          <div className="text-label-small text-on-surface-variant uppercase tracking-wider">Before</div>
          <div className="text-title-medium text-on-surface">{formatSize(sizeBefore)}</div>
        </div>
        <div>
          <div className="text-label-small text-on-surface-variant uppercase tracking-wider">After</div>
          <div className="text-title-medium text-primary">{formatSize(sizeAfter)}</div>
        </div>
      </div>
    </div>
  );
}