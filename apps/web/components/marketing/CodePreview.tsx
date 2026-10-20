'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type CodeTab = 'sdk' | 'curl' | 'webhook';

interface CodeSnippet {
  title: string;
  badge: string;
  code: string;
  language: string;
  explanation: string;
}

const SNIPPETS: Record<CodeTab, CodeSnippet> = {
  sdk: {
    title: 'TypeScript SDK',
    badge: '3 lines of code',
    language: 'typescript',
    explanation: 'Upload video directly from client to storage with automated VMAF quality protection.',
    code: `import { VecteusClient } from '@vecteus/sdk';

const vecteus = new VecteusClient({ apiKey: 'vct_live_...' });

// Users upload directly to storage; Vecteus optimizes and verifies VMAF
const result = await vecteus.ingest.upload(fileBuffer, {
  filename: 'user_recording.mp4',
  mimeType: 'video/mp4',
  sizeBytes: fileBuffer.byteLength,
});

console.log('Transcode complete:', result.jobId, 'Savings:', result.savingsPercent);`,
  },
  curl: {
    title: 'Direct API',
    badge: 'HTTP request',
    language: 'bash',
    explanation: 'Simple REST endpoints that work with any language or backend framework.',
    code: `# Step 1: Request a direct upload link
curl -X POST https://api.vecteus.io/v1/ingest/presign \\
  -H "X-Vecteus-Key: vct_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"filename": "promo.mp4", "mimeType": "video/mp4", "sizeBytes": 52428800}'

# Step 2: Upload file directly to storage
curl -X PUT "<upload_url>" --upload-file promo.mp4

# Step 3: Tell Vecteus upload is complete
curl -X POST https://api.vecteus.io/v1/ingest/complete \\
  -H "X-Vecteus-Key: vct_live_..." \\
  -d '{"jobId": "job_94827"}'`,
  },
  webhook: {
    title: 'Instant Webhook',
    badge: 'JSON notification',
    language: 'json',
    explanation: 'Get an instant cryptographically signed alert the moment your file is ready.',
    code: `{
  "event": "job.completed",
  "jobId": "job_94827",
  "source": {
    "sizeBytes": 52428800,
    "durationSec": 45.2
  },
  "output": {
    "sizeBytes": 13107200,
    "savingsPercent": 75.0,
    "vmafScore": 94.2,
    "destinationUri": "s3://your-bucket/videos/promo_opt.mp4"
  },
  "completedAt": "2026-10-19T11:20:00Z"
}`,
  },
};

export default function CodePreview() {
  const [activeTab, setActiveTab] = useState<CodeTab>('sdk');
  const [copied, setCopied] = useState(false);

  const current = SNIPPETS[activeTab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const containerRef = useRef<HTMLDivElement>(null);

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
      className="w-full flex flex-col rounded-m3-xl overflow-hidden ambient-glow-card shadow-2xl relative"
    >
      {/* Top Tab Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-outline-variant/40 px-m3-small py-m3-xx-small bg-surface-container-lowest/80 backdrop-blur-md">
        <div className="flex items-center gap-m3-xx-small" role="tablist" aria-label="Code examples">
          {(['sdk', 'curl', 'webhook'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab)}
                className={`relative text-label-medium px-m3-small py-m3-xx-small rounded-m3-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  isActive ? 'text-primary font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCodeTab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-primary/15 border border-primary/30 rounded-m3-full"
                  />
                )}
                <span className="relative z-10">{SNIPPETS[tab].title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-m3-small">
          <span className="text-label-small text-slate-400 hidden sm:inline">
            {current.badge}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-m3-xxx-small text-label-small text-slate-300 hover:text-primary transition-colors px-m3-xx-small py-m3-xxx-small rounded-m3-sm border border-slate-700 hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-primary font-medium">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Description Strip */}
      <div className="px-m3-small py-m3-xx-small bg-[#10141D] border-b border-slate-800 text-body-small text-slate-400">
        {current.explanation}
      </div>

      {/* Code Display Area */}
      <div className="p-m3-small md:p-m3-medium overflow-x-auto text-[0.85rem] md:text-[0.9rem] font-mono leading-relaxed text-slate-200">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <pre tabIndex={0} className="focus-visible:outline-none">
              <code>{current.code}</code>
            </pre>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
