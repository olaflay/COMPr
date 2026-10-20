'use client';

import { useState, useEffect, useRef } from 'react';

// Custom hook for physics-interpolated animated numbers
function useAnimatedNumber(target: number): number {
  const [current, setCurrent] = useState(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      setCurrent((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 1) {
          return target;
        }
        return Math.round(prev + diff * 0.2);
      });
      frameRef.current = requestAnimationFrame(update);
    };

    frameRef.current = requestAnimationFrame(update);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return current;
}

export default function CostCalculator() {
  const [volumeTB, setVolumeTB] = useState<number>(10);
  const [provider, setProvider] = useState<'aws' | 'r2'>('aws');

  // Pricing constants (standard industry public rates in USD)
  // AWS S3: ~$0.023 per GB/mo storage + ~$0.09 per GB egress download
  // Cloudflare R2: ~$0.015 per GB/mo storage + $0 per GB egress
  // Average measured file size reduction: 72%
  const volumeGB = volumeTB * 1000;
  const reductionFactor = 0.72; // 72% reduction

  // Assuming average monthly downloads equals 2x the stored volume
  const monthlyDownloadsGB = volumeGB * 2;

  let originalStorageCost = 0;
  let originalEgressCost = 0;

  if (provider === 'aws') {
    originalStorageCost = volumeGB * 0.023;
    originalEgressCost = monthlyDownloadsGB * 0.09;
  } else {
    originalStorageCost = volumeGB * 0.015;
    originalEgressCost = 0;
  }

  const targetOriginalTotal = Math.round(originalStorageCost + originalEgressCost);

  // With Vecteus: 72% fewer gigabytes stored and 72% less bandwidth downloaded
  const optimizedStorageCost = originalStorageCost * (1 - reductionFactor);
  const optimizedEgressCost = originalEgressCost * (1 - reductionFactor);
  const targetOptimizedTotal = Math.round(optimizedStorageCost + optimizedEgressCost);

  const targetMonthlySavings = targetOriginalTotal - targetOptimizedTotal;
  const targetAnnualSavings = targetMonthlySavings * 12;

  // Animated tickers
  const animatedOriginal = useAnimatedNumber(targetOriginalTotal);
  const animatedOptimized = useAnimatedNumber(targetOptimizedTotal);
  const animatedMonthlySavings = useAnimatedNumber(targetMonthlySavings);
  const animatedAnnualSavings = useAnimatedNumber(targetAnnualSavings);

  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse move spotlight effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full flex flex-col gap-y-m3-medium ambient-glow-card p-m3-medium md:p-m3-large border border-slate-800 shadow-2xl relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col gap-y-m3-xxx-small text-left relative z-10">
        <span className="text-label-small font-semibold text-primary uppercase tracking-widest block mb-1">
          Cloud Economics
        </span>
        <h3 className="text-title-large md:text-headline-small text-white font-bold tracking-tight">
          Calculate Your Monthly Cloud Savings
        </h3>
        <p className="text-body-medium text-slate-400">
          See how much your storage and download bills drop when video files shrink by 72%.
        </p>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-m3-medium items-center relative z-10">
        {/* Slider */}
        <div className="flex flex-col gap-y-m3-x-small bg-[#121824]/60 p-m3-small rounded-m3-xl border border-slate-800">
          <div className="flex justify-between items-center">
            <label htmlFor="volume-range" className="text-label-medium text-slate-300 font-medium">
              Monthly Video Uploads
            </label>
            <span className="text-title-medium font-bold text-primary font-mono">
              {volumeTB} TB / month
            </span>
          </div>

          <input
            id="volume-range"
            type="range"
            min={1}
            max={100}
            step={1}
            value={volumeTB}
            onChange={(e) => setVolumeTB(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Monthly video upload volume in terabytes"
          />

          <div className="flex justify-between text-label-small text-slate-500 font-mono">
            <span>1 TB</span>
            <span>25 TB</span>
            <span>50 TB</span>
            <span>100 TB</span>
          </div>
        </div>

        {/* Provider Toggle */}
        <div className="flex flex-col gap-y-m3-x-small bg-[#121824]/60 p-m3-small rounded-m3-xl border border-slate-800">
          <span className="text-label-medium text-slate-300 font-medium">
            Storage Provider
          </span>
          <div className="grid grid-cols-2 gap-m3-xx-small" role="radiogroup" aria-label="Storage provider selection">
            <button
              type="button"
              role="radio"
              aria-checked={provider === 'aws'}
              onClick={() => setProvider('aws')}
              className={`py-m3-xx-small px-m3-small rounded-m3-lg border text-label-medium transition-all ${
                provider === 'aws'
                  ? 'bg-primary/20 text-primary border-primary font-semibold shadow-sm'
                  : 'bg-surface text-slate-400 border-slate-700 hover:bg-surface-container'
              }`}
            >
              Amazon S3
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={provider === 'r2'}
              onClick={() => setProvider('r2')}
              className={`py-m3-xx-small px-m3-small rounded-m3-lg border text-label-medium transition-all ${
                provider === 'r2'
                  ? 'bg-primary/20 text-primary border-primary font-semibold shadow-sm'
                  : 'bg-surface text-slate-400 border-slate-700 hover:bg-surface-container'
              }`}
            >
              Cloudflare R2
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary Card with Rolling Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-m3-small bg-[#101622] p-m3-medium rounded-m3-xl border border-slate-800/80 items-center text-center sm:text-left relative z-10">
        <div>
          <span className="text-label-small text-slate-400 block mb-1">Typical Cloud Bill</span>
          <span className="text-headline-small font-bold text-slate-400 font-mono tabular-nums">
            ${animatedOriginal.toLocaleString()}
            <span className="text-label-small font-normal text-slate-500"> /mo</span>
          </span>
        </div>

        <div>
          <span className="text-label-small text-slate-400 block mb-1">With Vecteus</span>
          <span className="text-headline-small font-bold text-slate-200 font-mono tabular-nums">
            ${animatedOptimized.toLocaleString()}
            <span className="text-label-small font-normal text-slate-500"> /mo</span>
          </span>
        </div>

        <div className="bg-primary/10 border border-primary/30 p-m3-small rounded-m3-lg text-center shadow-inner">
          <span className="text-label-small text-primary font-semibold uppercase tracking-wider block mb-1">
            Your Monthly Savings
          </span>
          <span className="text-headline-medium font-extrabold text-primary font-mono block tabular-nums">
            ${animatedMonthlySavings.toLocaleString()}
          </span>
          <span className="text-label-small text-slate-400 block mt-1">
            ~${animatedAnnualSavings.toLocaleString()} saved each year
          </span>
        </div>
      </div>
    </div>
  );
}
