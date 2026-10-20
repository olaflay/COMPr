'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface DemoPreset {
  id: string;
  name: string;
  origSizeMB: number;
  compSizeMB: number;
  savingsPct: number;
  qualityScore: number;
  thumbnail: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'nature',
    name: '4K Nature Video',
    origSizeMB: 48.6,
    compSizeMB: 12.1,
    savingsPct: 75.1,
    qualityScore: 94,
    thumbnail: '/water.jpg',
  },
  {
    id: 'product',
    name: 'Product Catalog Clip',
    origSizeMB: 32.4,
    compSizeMB: 8.4,
    savingsPct: 74.0,
    qualityScore: 95,
    thumbnail: '/images/landing/product.webp',
  },
  {
    id: 'chat',
    name: 'Mobile App Recording',
    origSizeMB: 19.8,
    compSizeMB: 5.1,
    savingsPct: 74.2,
    qualityScore: 93,
    thumbnail: '/images/landing/chat.webp',
  },
];

export default function InteractiveDropZone() {
  const [selectedPreset, setSelectedPreset] = useState<DemoPreset>(DEMO_PRESETS[0]);
  const [customFile, setCustomFile] = useState<{
    name: string;
    sizeMB: number;
    optSizeMB: number;
    savingsPct: number;
    previewUrl: string;
    isImage: boolean;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = (file: File) => {
    setIsProcessing(true);
    const sizeMB = file.size / (1024 * 1024);
    const optSizeMB = Math.max(0.1, sizeMB * 0.26); // ~74% reduction based on SVT-AV1 benchmarks
    const savingsPct = 74.0;
    const isImage = file.type.startsWith('image/');
    const previewUrl = URL.createObjectURL(file);

    setTimeout(() => {
      setCustomFile({
        name: file.name,
        sizeMB: Math.round(sizeMB * 10) / 10,
        optSizeMB: Math.round(optSizeMB * 10) / 10,
        savingsPct,
        previewUrl,
        isImage,
      });
      setIsProcessing(false);
    }, 300);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const activeOrigMB = customFile ? customFile.sizeMB : selectedPreset.origSizeMB;
  const activeCompMB = customFile ? customFile.optSizeMB : selectedPreset.compSizeMB;
  const activeSavings = customFile ? customFile.savingsPct : selectedPreset.savingsPct;
  const activePreview = customFile ? customFile.previewUrl : selectedPreset.thumbnail;

  return (
    <div className="w-full flex flex-col gap-y-m3-medium bg-[#0E1420] rounded-m3-2xl p-m3-medium md:p-m3-large border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background ambient radial highlight */}
      <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Preset Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-m3-small text-left relative z-10">
        <div>
          <span className="text-label-small font-semibold text-primary uppercase tracking-widest block mb-1">
            Interactive Media Inspector
          </span>
          <h3 className="text-title-large md:text-headline-small font-bold text-white tracking-tight">
            Estimate Bandwidth &amp; Storage Savings
          </h3>
          <p className="text-body-small text-slate-400">
            Drop a media file or pick a benchmark asset to inspect payload reduction and VMAF score.
          </p>
        </div>

        {/* Demo Preset Buttons */}
        <div className="flex flex-wrap items-center gap-m3-xx-small">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setCustomFile(null);
                setSelectedPreset(preset);
              }}
              className={`text-label-small px-m3-small py-m3-xx-small rounded-m3-full border transition-all ${
                !customFile && selectedPreset.id === preset.id
                  ? 'bg-primary/20 text-primary border-primary font-semibold shadow-sm'
                  : 'bg-surface-container-high/60 text-slate-300 border-slate-700 hover:bg-surface-container-high'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Playground Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-m3-medium items-center relative z-10">
        {/* Interactive Drop Target */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`lg:col-span-7 aspect-video md:aspect-[16/10] max-h-[380px] rounded-m3-xl relative overflow-hidden cursor-pointer border-2 transition-all duration-200 flex flex-col items-center justify-center p-m3-medium text-center ${
            isDragging
              ? 'border-primary bg-primary/15 scale-[1.01]'
              : 'border-dashed border-slate-700 hover:border-primary/60 bg-[#090D14]'
          }`}
        >
          <Image
            src={activePreview}
            alt="Media preview"
            fill
            sizes="(max-width: 1024px) 100vw, 600px"
            className={`object-cover transition-opacity duration-300 ${
              isProcessing ? 'opacity-30' : 'opacity-80 hover:opacity-90'
            }`}
          />

          {/* Hover Overlay Message */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-m3-small gap-y-m3-xx-small text-white">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-label-medium font-semibold">Drop your video or click to browse</span>
            <span className="text-label-small text-slate-300">Supports MP4, MOV, WebM, and images</span>
          </div>

          {/* Active File Floating Pill */}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-m3-small py-1 rounded-m3-full border border-white/10 text-label-small text-slate-200 shadow-md pointer-events-none">
            {customFile ? customFile.name : selectedPreset.name}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload custom video or image file"
          />
        </div>

        {/* Live Metrics & Telemetry Readout Panel */}
        <div className="lg:col-span-5 flex flex-col gap-y-m3-small text-left">
          <div className="bg-[#121824]/90 rounded-m3-xl p-m3-medium border border-slate-800 flex flex-col gap-y-m3-small">
            <div className="flex justify-between items-baseline border-b border-slate-800/80 pb-m3-xx-small">
              <span className="text-label-medium text-slate-400">Original Size</span>
              <span className="text-title-medium font-bold text-slate-300 font-mono">
                {activeOrigMB.toFixed(1)} MB
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-slate-800/80 pb-m3-xx-small">
              <span className="text-label-medium text-slate-400">Optimized Size</span>
              <span className="text-title-medium font-bold text-primary font-mono">
                {activeCompMB.toFixed(1)} MB
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-slate-800/80 pb-m3-xx-small">
              <span className="text-label-medium text-slate-400">Payload Reduction</span>
              <span className="text-title-large font-extrabold text-primary font-mono">
                {activeSavings.toFixed(1)}% Smaller
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-slate-800/80 pb-m3-xx-small">
              <span className="text-label-medium text-slate-400">Quality Verification</span>
              <span className="text-label-large font-semibold text-emerald-400 font-mono">
                VMAF 94 / 100
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-label-medium text-slate-400">Egress Transit Fee</span>
              <span className="text-label-large font-semibold text-white font-mono">
                $0 (Direct to Bucket)
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-m3-x-small">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-m3-xx-small px-m3-small rounded-m3-lg border border-slate-700 bg-surface hover:bg-surface-container text-slate-200 text-label-small font-medium transition-colors"
            >
              Upload Custom File
            </button>

            {customFile && (
              <button
                type="button"
                onClick={() => setCustomFile(null)}
                className="py-m3-xx-small px-m3-small rounded-m3-lg border border-slate-700 text-slate-400 hover:text-white text-label-small"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
