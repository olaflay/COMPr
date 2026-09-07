'use client';

import { useRef, useEffect, useState } from 'react';

interface WhatsAppStatusPreviewProps {
  videoFile: File;
  durationSec: number;
}

const STATUS_MAX_DURATION_SEC = 30;

export default function WhatsAppStatusPreview({ videoFile, durationSec }: WhatsAppStatusPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const [trimmedDuration] = useState(() =>
    Math.min(durationSec, STATUS_MAX_DURATION_SEC)
  );
  const isTrimmed = durationSec > STATUS_MAX_DURATION_SEC;

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const t = video.currentTime;

      if (isTrimmed && t >= STATUS_MAX_DURATION_SEC) {
        video.pause();
        video.currentTime = 0;
        setIsPlaying(false);
        if (progressRef.current) progressRef.current.style.width = '0%';
        if (timeTextRef.current) timeTextRef.current.textContent = formatTime(0);
      } else {
        if (progressRef.current) {
          const progressPercent = (t / trimmedDuration) * 100;
          progressRef.current.style.width = `${progressPercent}%`;
        }
        if (timeTextRef.current) {
          timeTextRef.current.textContent = formatTime(t);
        }
      }
    };

    const handleEnded = () => setIsPlaying(false);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isTrimmed, trimmedDuration]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      if (isTrimmed && video.currentTime >= STATUS_MAX_DURATION_SEC) {
        video.currentTime = 0;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-m3-small">
      <div className="text-label-medium text-on-surface-variant font-medium">
        Preview wey e go look for WhatsApp Status
      </div>

      {/* Phone Frame Mockup */}
      <div className="relative w-[200px] h-[356px] bg-black rounded-m3-lg overflow-hidden shadow-m3-3 border-2 border-outline-variant">
        {/* Status bar top */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-m3-small pt-m3-x-small pb-m3-xx-small bg-gradient-to-b from-black/60 to-transparent">
          <span className="text-label-small text-white/80 font-medium">9:41</span>
          <div className="flex gap-m3-xx-small">
            <div className="w-3 h-2 rounded-m3-xs bg-white/60" />
            <div className="w-3 h-2 rounded-m3-xs bg-white/60" />
          </div>
        </div>

        {/* Video Area */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop={!isTrimmed}
          playsInline
          preload="metadata"
          onClick={togglePlay}
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePlay(); } }}
            className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
            aria-label="Play preview"
          >
            <div className="w-12 h-12 rounded-m3-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6 text-white ml-m3-xxx-small" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}

        {/* Bottom Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent pt-m3-x-large pb-m3-small px-m3-small">
          {/* Progress dots (WhatsApp-style segments) */}
          <div className="w-full h-0.5 bg-white/30 rounded-m3-full mb-m3-x-small overflow-hidden">
            <div
              ref={progressRef}
              className="h-full bg-white rounded-m3-full transition-all duration-m3-short-1"
              style={{ width: `0%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span ref={timeTextRef} className="text-label-small text-white/90 font-medium tabular-nums">
              {formatTime(0)}
            </span>
            <span className="text-label-small text-white/60">
              / {formatTime(trimmedDuration)}
            </span>
          </div>
        </div>

        {/* Trimmed indicator */}
        {isTrimmed && (
          <div className="absolute top-m3-x-large left-0 right-0 z-10 flex justify-center">
            <div className="bg-black/60 backdrop-blur-sm text-white text-caption font-bold px-m3-x-small py-m3-xxx-small rounded-m3-full">
              Trimmed to {STATUS_MAX_DURATION_SEC}s
            </div>
          </div>
        )}
      </div>

      {/* Info text */}
      <div className="text-center max-w-[220px]">
        {isTrimmed ? (
          <p className="text-body-small text-on-surface-variant leading-relaxed">
            Your video dey {formatTime(durationSec)}. WhatsApp Status go trim am to {formatTime(STATUS_MAX_DURATION_SEC)}. This na how e go look after trim.
          </p>
        ) : (
          <p className="text-body-small text-on-surface-variant leading-relaxed">
            Your video dey {formatTime(durationSec)}. E fit perfectly for WhatsApp Status ({STATUS_MAX_DURATION_SEC}s limit).
          </p>
        )}
      </div>
    </div>
  );
}
