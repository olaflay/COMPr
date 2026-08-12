'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Toast from '../../../components/ui/Toast';
import { buildWhatsAppShareUrl, buildWhatsAppStatusShareUrl } from '../../../lib/whatsapp-share';
import { apiFetch } from '../../../lib/api-client';

interface JobState {
  jobId: string;
  status: 'QUEUED' | 'ANALYZING' | 'ENCODING' | 'VERIFYING' | 'DONE' | 'FAILED';
  stage: string;
  progressPercent: number;
  stepsRemaining: number;
  outputs: Array<{ segmentIndex: number | null; downloadUrl: string; sizeBytes: number }>;
  errorMessage?: string;
  resolutionDropped?: boolean;
  prioritizeDetail?: boolean;
  queuePosition?: number;
}

export default function JobPageClient({ jobId }: { jobId: string }) {
  const [activeJob, setActiveJob] = useState<JobState | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    const fp = localStorage.getItem('compr_fingerprint');

    if (!fp) {
      setLoading(false);
      setErrorStatus(403);
      return;
    }

    const fetchJob = async () => {
      try {
        const res = await apiFetch(`/api/v1/jobs/${jobId}?fingerprint=${fp}`);
        if (!res.ok) {
          setErrorStatus(res.status);
          setLoading(false);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          return;
        }
        const data = (await res.json()) as JobState;
        setActiveJob(data);
        setLoading(false);

        if (data.status === 'DONE' || data.status === 'FAILED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (e) {
        console.error('Failed to fetch job', e);
        setLoading(false);
      }
    };

    fetchJob();
    pollIntervalRef.current = setInterval(fetchJob, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [jobId]);

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'queued':
        return activeJob?.queuePosition
          ? `In the queue (position #${activeJob.queuePosition})...`
          : 'In the queue, almost there...';
      case 'analyzing': return 'Analyzing your file...';
      case 'encoding': return 'Making it sharper...';
      case 'verifying': return 'Checking quality...';
      case 'done': return 'All done!';
      default: return 'Working on it...';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen min-h-[100dvh] w-full flex-1 bg-background text-on-background p-m3-large flex flex-col justify-center items-center">
        <div className="skeleton h-32 w-full max-w-md rounded-m3-lg" />
      </main>
    );
  }

  if (errorStatus === 403) {
    return (
      <main className="min-h-screen min-h-[100dvh] w-full flex-1 bg-background text-on-background p-m3-large flex flex-col justify-center items-center text-center">
        <div className="max-w-md flex flex-col gap-m3-medium items-center">
          <div className="select-none text-primary" aria-hidden="true">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-headline-large text-on-surface">Access Denied</h1>
          <p className="text-body-large text-on-surface-variant leading-relaxed">
            For your privacy, job downloads and progress are tied to the browser session that uploaded the file.
          </p>
          <Link
            href="/dashboard"
            className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-small px-m3-x-large rounded-m3-full text-title-small shadow-m3-1 self-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (errorStatus === 404 || !activeJob) {
    return (
      <main className="min-h-screen min-h-[100dvh] w-full flex-1 bg-background text-on-background p-m3-large flex flex-col justify-center items-center text-center">
        <div className="max-w-md flex flex-col gap-m3-medium items-center">
          <div className="select-none text-on-surface-variant" aria-hidden="true">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h1 className="text-headline-large text-on-surface">Job Not Found</h1>
          <p className="text-body-large text-on-surface-variant leading-relaxed">
            This job does not exist or has expired. Optimizations are deleted automatically after 24 hours.
          </p>
          <Link
            href="/dashboard"
            className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-small px-m3-x-large rounded-m3-full text-title-small shadow-m3-1 self-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isFailed = activeJob.status === 'FAILED';
  const isDone = activeJob.status === 'DONE';

  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col bg-background text-on-background p-m3-medium md:p-m3-x-large">
      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col gap-m3-large">
        <header className="flex justify-between items-center pb-m3-medium border-b border-outline-variant">
          <Link href="/dashboard" className="flex items-center gap-m3-x-small hover:opacity-85 transition-opacity duration-m3-short-2">
            <Image src="/favicon.svg" alt="NoBlur logo" width={28} height={28} className="rounded-m3-md select-none" />
            <span className="text-title-medium">NoBlur</span>
          </Link>
          <div className="text-label-medium text-on-surface-variant font-mono">
            Job: {jobId.substring(0, 8)}
          </div>
        </header>

        {/* Polling progress state */}
        {!isDone && !isFailed && (
          <section className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large shadow-m3-1 flex flex-col gap-m3-large text-center">
            <h2 className="text-title-large text-on-surface">Optimizing your media</h2>
            <div className="flex flex-col gap-m3-x-small">
              <div className="flex justify-between items-center text-label-medium text-on-surface-variant">
                <span>{getStageLabel(activeJob.stage)}</span>
                <span>{activeJob.progressPercent}%</span>
              </div>
              <div className="w-full bg-outline-variant rounded-m3-full h-3 overflow-hidden" role="progressbar" aria-valuenow={activeJob.progressPercent} aria-valuemin={0} aria-valuemax={100}>
                <div className="bg-primary h-full transition-all duration-m3-medium-2 ease-m3-standard" style={{ width: `${activeJob.progressPercent}%` }} />
              </div>
              <div className="text-label-small text-on-surface-variant text-right">
                {activeJob.stepsRemaining} step{activeJob.stepsRemaining === 1 ? '' : 's'} remaining
              </div>
            </div>
            <div className="text-label-small text-on-surface-variant border-t border-outline-variant pt-m3-small">
              Usually takes 15 to 30 seconds. Files are deleted automatically after 24 hours.
            </div>
          </section>
        )}

        {/* Failed state */}
        {isFailed && (
          <section className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large shadow-m3-1 flex flex-col gap-m3-medium text-center items-center">
            <div className="select-none text-error" aria-hidden="true">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="text-title-large text-on-surface">Optimization failed</h2>
            <p className="text-body-medium text-error leading-relaxed">
              {activeJob.errorMessage || 'An error occurred during processing.'}
            </p>
            <Link
              href="/dashboard"
              className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-small px-m3-x-large rounded-m3-full text-title-small shadow-m3-1 self-center"
            >
              Try another file
            </Link>
          </section>
        )}

        {/* Success Results comparison state */}
        {isDone && activeJob.outputs.length > 0 && (
          <section className="flex flex-col gap-m3-large">
            <div className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large shadow-m3-1 text-center flex flex-col items-center gap-m3-small">
              <div className="select-none text-primary" aria-hidden="true">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="text-title-large text-on-surface">File ready!</h2>
              <p className="text-body-medium text-on-surface-variant mt-m3-xx-small">
                Your pre-optimized file is ready for download and sharing.
              </p>
            </div>

            <div className="flex flex-col gap-m3-small">
              {/* Download / Share buttons */}
              <a
                href={buildWhatsAppShareUrl(activeJob.outputs[0]?.downloadUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-small rounded-m3-full text-title-small text-center block shadow-m3-1 hover:shadow-m3-2 transition-all duration-m3-short-2"
              >
                Send to WhatsApp
              </a>

              <a
                href={buildWhatsAppStatusShareUrl(activeJob.outputs[0]?.downloadUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface py-m3-small rounded-m3-full text-label-large text-center block border border-outline transition-all duration-m3-short-2"
              >
                Send to WhatsApp Status
              </a>

              {activeJob.outputs.map((out, idx) => (
                <a
                  key={idx}
                  href={out.downloadUrl}
                  download={`compr_output_${activeJob.jobId}${idx > 0 ? `_part${idx}` : ''}.mp4`}
                  className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface py-m3-small rounded-m3-full text-label-large text-center block border border-outline transition-all duration-m3-short-2"
                >
                  Download to device {activeJob.outputs.length > 1 ? `(Part ${idx + 1})` : ''}
                </a>
              ))}

              <Link
                href="/dashboard"
                className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-m3-small rounded-m3-full text-label-large text-center block border border-outline transition-all duration-m3-short-2"
              >
                Optimize another file
              </Link>
            </div>
          </section>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </main>
  );
}
