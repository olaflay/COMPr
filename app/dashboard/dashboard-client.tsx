'use client';

import { useState, useEffect, useRef, ChangeEvent, useCallback, DragEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BeforeAfterSlider from '../../components/BeforeAfterSlider.tsx';
import WhatsAppStatusPreview from '../../components/WhatsAppStatusPreview.tsx';
import WhatsAppDemoStrip from '../../components/WhatsAppDemoStrip.tsx';
import ProcessingHistory from '../../components/ProcessingHistory';
import Toast from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { validateFile, type ValidationError } from '../../lib/file-validation';
import { buildUpsellCopy } from '../../lib/growth-ux';
import { predictOutputSize, type SizePrediction } from '../../lib/size-predictor';
import { addToHistory } from '../../lib/job-history';
import { buildWhatsAppShareUrl, buildWhatsAppStatusShareUrl } from '../../lib/whatsapp-share';
import { trackEvent } from '../providers';

interface UsageState {
  jobsUsedToday: number;
  jobsRemainingToday: number;
  isPremium: boolean;
  isFirstJobToday: boolean;
  shareBonusAvailable?: boolean;
}

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

export default function DashboardPageClient() {
  const [fingerprint, setFingerprint] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<'STATUS' | 'CHAT' | 'CUSTOM'>('STATUS');
  const [customSizeMB, setCustomSizeMB] = useState<number>(8);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeJob, setActiveJob] = useState<JobState | null>(null);
  const [sourceFileUrl, setSourceFileUrl] = useState<string>('');
  const [uploadedFileKey, setUploadedFileKey] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showUpsell, setShowUpsell] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [usageLoading, setUsageLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [sizePrediction, setSizePrediction] = useState<SizePrediction | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let fp = localStorage.getItem('compr_fingerprint');
    if (!fp) {
      fp = 'fp_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('compr_fingerprint', fp);
    }
    setFingerprint(fp);
    fetchUsage(fp);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setSourceFileUrl('');
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setSourceFileUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const fetchUsage = async (fp: string) => {
    setUsageLoading(true);
    try {
      const res = await fetch(`/api/v1/usage?fingerprint=${fp}`);
      const data = await res.json() as UsageState;
      setUsage(data);
    } catch (e) {
      console.error('Failed to fetch usage', e);
    } finally {
      setUsageLoading(false);
    }
  };

  // Compute size prediction when file or preset changes
  useEffect(() => {
    if (selectedFile) {
      const prediction = predictOutputSize(
        selectedFile.size,
        videoDuration,
        selectedFile.type,
        preset,
        preset === 'CUSTOM' ? customSizeMB : undefined,
      );
      setSizePrediction(prediction);
    } else {
      setSizePrediction(null);
    }
  }, [selectedFile, preset, customSizeMB, videoDuration]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const errors = validateFile(file);
      setValidationErrors(errors);
      if (errors.length === 0) {
        setSelectedFile(file);
        trackEvent('file_selected', { file_type: file.type, file_size_bytes: file.size });
        if (file.type.startsWith('video/')) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            setVideoDuration(video.duration);
            URL.revokeObjectURL(video.src);
          };
          video.src = URL.createObjectURL(file);
        } else {
          setVideoDuration(null);
        }
      }
    }
  };

  const handleFileDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (dt.files && dt.files.length > 0) {
      const file = dt.files[0];
      const errors = validateFile(file);
      setValidationErrors(errors);
      if (errors.length === 0) {
        setSelectedFile(file);
        trackEvent('upload_started', { file_type: file.type, file_size_bytes: file.size });
        if (file.type.startsWith('video/')) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            setVideoDuration(video.duration);
            URL.revokeObjectURL(video.src);
          };
          video.src = URL.createObjectURL(file);
        } else {
          setVideoDuration(null);
        }
      }
    }
  }, []);

  // Focus trap for upsell modal
  useEffect(() => {
    if (!showUpsell || !modalRef.current) return;
    const modal = modalRef.current;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUpsell(false);
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
  }, [showUpsell]);

  const triggerUpload = async () => {
    if (!selectedFile || !fingerprint) return;
    setIsUploading(true);
    setUploadProgress(0);
    trackEvent('upload_started', { preset, file_type: selectedFile.type, file_size_bytes: selectedFile.size });

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalParts = Math.ceil(selectedFile.size / CHUNK_SIZE);
    const checkpointKey = `upload_cp:${selectedFile.name}:${selectedFile.size}`;

    try {
      let uploadIdToUse = '';
      let fileKeyToUse = '';
      let completedParts: Array<{ ETag: string; PartNumber: number }> = [];

      // Check for an existing upload checkpoint in localStorage to resume
      const checkpoint = localStorage.getItem(checkpointKey);
      if (checkpoint) {
        try {
          const cpData = JSON.parse(checkpoint);
          uploadIdToUse = cpData.uploadId;
          fileKeyToUse = cpData.fileKey;
          completedParts = cpData.completedParts || [];
        } catch (e) {
          console.warn('Failed to parse upload checkpoint', e);
        }
      }

      // Initiate a new multipart upload if none was found
      if (!uploadIdToUse) {
        const startRes = await fetch('/api/v1/uploads/multipart/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            sizeBytes: selectedFile.size,
          }),
        });
        const startData = await startRes.json() as any;
        uploadIdToUse = startData.uploadId;
        fileKeyToUse = startData.fileKey;

        localStorage.setItem(
          checkpointKey,
          JSON.stringify({
            uploadId: uploadIdToUse,
            fileKey: fileKeyToUse,
            completedParts: [],
          })
        );
      }

      setUploadedFileKey(fileKeyToUse);

      // Upload parts sequentially
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        const isDone = completedParts.some((p) => p.PartNumber === partNumber);
        if (isDone) {
          setUploadProgress(Math.round((partNumber / totalParts) * 100));
          continue;
        }

        const startByte = (partNumber - 1) * CHUNK_SIZE;
        const endByte = Math.min(selectedFile.size, partNumber * CHUNK_SIZE);
        const chunk = selectedFile.slice(startByte, endByte);

        let uploadSuccess = false;
        let etag = '';
        let attempts = 0;

        // Auto-retry up to 5 times per chunk to survive slow/unstable networks
        while (!uploadSuccess && attempts < 5) {
          attempts++;
          try {
            const presignPartRes = await fetch('/api/v1/uploads/multipart/presign-part', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileKey: fileKeyToUse,
                uploadId: uploadIdToUse,
                partNumber,
              }),
            });
            const presignData = await presignPartRes.json() as any;
            const partUploadUrl = presignData.uploadPartUrl;

            const uploadRes = await fetch(partUploadUrl, {
              method: 'PUT',
              body: chunk,
            });

            if (uploadRes.ok) {
              etag = (uploadRes.headers.get('ETag') || '').replace(/"/g, '');
              uploadSuccess = true;
            } else {
              throw new Error(`Upload failed with status ${uploadRes.status}`);
            }
          } catch (err) {
            console.warn(`Part ${partNumber} attempt ${attempts} failed:`, err);
            if (attempts >= 5) throw err;
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s backoff
          }
        }

        completedParts.push({ ETag: etag, PartNumber: partNumber });
        localStorage.setItem(
          checkpointKey,
          JSON.stringify({
            uploadId: uploadIdToUse,
            fileKey: fileKeyToUse,
            completedParts,
          })
        );

        setUploadProgress(Math.round((partNumber / totalParts) * 100));
      }

      // Complete multipart upload
      const completeRes = await fetch('/api/v1/uploads/multipart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey: fileKeyToUse,
          uploadId: uploadIdToUse,
          parts: completedParts,
        }),
      });

      if (!completeRes.ok) {
        throw new Error('Failed to complete multipart upload');
      }

      localStorage.removeItem(checkpointKey);
      setUploadProgress(100);
      setIsUploading(false);

      // Create optimization job
      const jobRes = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey: fileKeyToUse,
          preset,
          targetSizeMB: preset === 'CUSTOM' ? customSizeMB : undefined,
          fingerprint,
        }),
      });
      const jobData = await jobRes.json() as any;

      if (jobRes.status === 429) {
        trackEvent('quota_exceeded', { preset });
        setShowUpsell(true);
        return;
      }

      trackEvent('job_created', { job_id: jobData.jobId, preset });
      startPollingJob(jobData.jobId);
    } catch (e) {
      console.error('Upload flow failed', e);
      setToast({ message: 'Upload failed. Please check your network and try again.', type: 'error' });
      setIsUploading(false);
    }
  };

  const handlePrioritizeDetail = async () => {
    if (!uploadedFileKey || !fingerprint || !activeJob) return;

    setIsUploading(false);
    setUploadProgress(0);
    setActiveJob(null);

    try {
      const jobRes = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey: uploadedFileKey,
          preset,
          targetSizeMB: preset === 'CUSTOM' ? customSizeMB : undefined,
          prioritizeDetail: true,
          fingerprint,
        }),
      });
      const jobData = await jobRes.json() as any;

      if (jobRes.status === 429) {
        trackEvent('quota_exceeded', { preset, source: 'prioritize_detail' });
        setShowUpsell(true);
        return;
      }

      trackEvent('job_created', { job_id: jobData.jobId, preset, source: 'prioritize_detail' });
      startPollingJob(jobData.jobId);
    } catch (e) {
      console.error('Failed to run prioritize detail job', e);
      setToast({ message: 'Failed to re-optimize. Please try again.', type: 'error' });
    }
  };

  const startPollingJob = (jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/jobs/${jobId}?fingerprint=${fingerprint}`);
        const data = (await res.json()) as JobState;
        setActiveJob(data);

        if (data.status === 'DONE' || data.status === 'FAILED') {
          clearInterval(pollIntervalRef.current);
          trackEvent('job_completed', { job_id: jobId, status: data.status, resolution_dropped: data.resolutionDropped });
          fetchUsage(fingerprint);

          if (data.status === 'DONE' && selectedFile && data.outputs.length > 0) {
            addToHistory({
              jobId,
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              preset,
              inputSizeBytes: selectedFile.size,
              outputSizeBytes: data.outputs[0].sizeBytes,
              downloadUrl: data.outputs[0].downloadUrl,
              createdAt: Date.now(),
              status: 'DONE',
            });
          }
        }
      } catch (e) {
        console.error('Job polling error', e);
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 3000);
  };

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

  const resetToUpload = useCallback(() => {
    setActiveJob(null);
    setSelectedFile(null);
    setUploadedFileKey('');
    setValidationErrors([]);
    setFeedbackGiven(false);
    setVideoDuration(null);
    setSizePrediction(null);
  }, []);

  const claimShareBonus = async () => {
    if (!fingerprint) return;
    trackEvent('share_bonus_clicked');
    window.open(buildWhatsAppShareUrl(), '_blank', 'noopener,noreferrer');
    try {
      const res = await fetch('/api/v1/usage/share-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      });
      const data = await res.json() as { granted?: number; jobsRemainingToday?: number };
      if (res.ok && (data.granted ?? 0) > 0) {
        setToast({ message: 'Nice one! You got +3 compressions today.', type: 'success' });
        setShowUpsell(false);
        fetchUsage(fingerprint);
      }
    } catch (e) {
      console.error('Share bonus claim failed', e);
    }
  };

  const upsell = buildUpsellCopy({
    jobsBlockedThisMonth: usage ? Math.max(0, 5 - usage.jobsRemainingToday) : 0,
    premiumPriceLabel: '₦2,500/month',
  });

  return (
    <main className="min-h-screen bg-background text-on-background p-m3-medium md:p-m3-x-large">
      <a href="#upload-section" className="skip-to-content">
        Skip to upload
      </a>

      <div className="max-w-xl mx-auto flex flex-col gap-m3-large">
        {/* Header */}
        <header className="flex justify-between items-center pb-m3-medium border-b border-outline-variant">
          <Link href="/" className="flex items-center gap-m3-x-small hover:opacity-85 transition-opacity duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Image
              src="/favicon.svg"
              alt="COMPr logo"
              width={28}
              height={28}
              className="rounded-m3-md select-none"
            />
            <span className="text-title-medium">COMPr</span>
          </Link>
          <div className="text-right" aria-live="polite">
            {usageLoading ? (
              <div className="skeleton h-4 w-32" />
            ) : usage && (
              <>
            <div className="text-body-small text-on-surface-variant">Daily quota</div>
                <div className={`text-label-large ${usage.jobsRemainingToday === 0 ? 'text-error' : ''}`}>
                  {usage.jobsRemainingToday} of 5 left today
                </div>
              </>
            )}
          </div>
        </header>

        {/* Upload Card Skeleton - shown while usage loads on first visit */}
        {!activeJob && usageLoading && (
          <section className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large shadow-m3-1 flex flex-col gap-m3-large">
            <div className="skeleton h-6 w-40 rounded-m3-sm" />
            <div className="skeleton h-32 w-full rounded-m3-md" />
            <div className="flex gap-m3-x-small">
              <div className="skeleton h-10 flex-1 rounded-m3-full" />
              <div className="skeleton h-10 flex-1 rounded-m3-full" />
              <div className="skeleton h-10 flex-1 rounded-m3-full" />
            </div>
            <div className="skeleton h-12 w-full rounded-m3-full" />
          </section>
        )}

        {/* Quota Exhausted Empty State */}
        {!activeJob && usage && usage.jobsRemainingToday === 0 && !usage.isPremium && (
          <section className="bg-surface-container-low border border-outline-variant rounded-m3-lg shadow-m3-1">
            <EmptyState
              icon="📊"
              title="You've used today's free optimizations"
              description="Come back tomorrow for 5 more, or upgrade to unlock unlimited access."
              action={
                <button
                  onClick={() => { setShowUpsell(true); trackEvent('upsell_shown', { source: 'quota_empty' }); }}
                  className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] py-m3-small px-m3-x-large rounded-m3-full text-title-small shadow-m3-1 hover:shadow-m3-2 transition-all duration-m3-short-2"
                >
                  See Premium Plans
                </button>
              }
              secondaryAction={
                <div className="flex flex-col items-center gap-m3-xx-small w-full">
                  <button
                    onClick={claimShareBonus}
                    className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline rounded-m3-full py-m3-small px-m3-x-large text-title-small flex items-center justify-center gap-m3-x-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] transition-all duration-m3-short-2"
                  >
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Share COMPr to WhatsApp
                  </button>
                  <p className="text-label-small text-on-surface-variant">Get +3 compressions today, free</p>
                </div>
              }
            />
          </section>
        )}

        {/* Upload Card Area */}
        {!activeJob && !usageLoading && !(usage && usage.jobsRemainingToday === 0 && !usage.isPremium) && (
          <section
            id="upload-section"
            className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large shadow-m3-1 flex flex-col gap-m3-large"
          >
            <h2 className="text-title-large text-on-surface">Choose a file to optimize</h2>

            {/* WhatsApp Demo: before/after preview strip */}
            <WhatsAppDemoStrip />

            {/* Drag & Drop File Box + Optimize CTA: stacked tight on mobile, side-by-side on desktop */}
            <div className="flex flex-col md:flex-row md:items-stretch gap-m3-x-small">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleFileDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                className={`relative flex-1 border-2 border-dashed rounded-m3-md p-m3-x-large text-center cursor-pointer transition-all duration-m3-short-2 ${isDragging ? 'drop-zone-active border-primary scale-[1.01] select-none' : 'border-outline hover:border-primary focus-within:border-primary'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Choose a video or image file to optimize"
                />

                {selectedFile && sourceFileUrl ? (
                  <div className="flex flex-col items-center gap-m3-x-small">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setVideoDuration(null); setValidationErrors([]); }}
                      aria-label="Remove selected file"
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant hover:bg-error hover:text-on-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors duration-m3-short-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="w-20 h-20 rounded-m3-md overflow-hidden bg-surface-container-highest shadow-m3-1 flex items-center justify-center shrink-0">
                      {selectedFile.type.startsWith('video/') ? (
                        <video src={sourceFileUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        <Image src={sourceFileUrl} alt="" width={80} height={80} unoptimized className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="text-body-large text-primary font-medium break-all leading-snug max-w-full px-m3-small">
                      {selectedFile.name}
                    </div>
                    <div className="text-label-small text-on-surface-variant">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      {selectedFile.type.startsWith('video/') && videoDuration ? ` · ${Math.round(videoDuration)}s` : ''}
                      {' · tap to change'}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-display-medium mb-m3-x-small" aria-hidden="true">{isDragging ? '📥' : '📁'}</div>
                    <div className="text-body-large text-on-surface-variant">
                      {isDragging ? 'Drop your file here' : 'Tap to select or drag a file here'}
                    </div>
                    <div className="text-label-small text-on-surface-variant mt-m3-xx-small">
                      Videos and photos up to 100MB
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => { if (!selectedFile) { fileInputRef.current?.click(); } else { triggerUpload(); } }}
                disabled={isUploading}
                className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:bg-surface-container-highest disabled:text-on-surface-variant py-m3-small rounded-b-m3-full md:rounded-b-none md:rounded-r-m3-full text-title-small md:text-title-large md:font-semibold transition-all duration-m3-short-2 shadow-m3-1 hover:shadow-m3-2 disabled:shadow-none disabled:scale-100 flex items-center justify-center w-full md:w-48 md:shrink-0 md:min-h-[44px]"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-m3-x-small">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {uploadProgress}%
                  </span>
                ) : selectedFile ? 'Optimize' : 'Choose file'}
              </button>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div role="alert" className="flex flex-col gap-m3-x-small">
                {validationErrors.map((err, i) => (
                  <div key={i} className="bg-error-container text-on-error-container text-body-small rounded-m3-sm px-m3-medium py-m3-x-small">
                    {err.message}
                  </div>
                ))}
              </div>
            )}

            {/* Preset Selector */}
            <div className="flex flex-col gap-m3-x-small">
              <label className="text-label-medium text-on-surface-variant">Choose WhatsApp preset</label>
              <div
                className="flex w-full rounded-m3-full overflow-hidden border border-outline divide-x divide-outline shadow-m3-0"
                role="radiogroup"
                aria-label="WhatsApp preset selection"
              >
                {(['STATUS', 'CHAT', 'CUSTOM'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={preset === type}
                    onClick={() => setPreset(type)}
                    className={`flex-1 py-m3-x-small text-label-large text-center transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] ${
                      preset === type
                        ? 'bg-primary-container text-on-primary-container font-semibold'
                        : 'bg-surface hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {type === 'STATUS' ? 'Status' : type === 'CHAT' ? 'Chat' : 'Custom'}
                  </button>
                ))}
              </div>
              <p className="text-label-small text-on-surface-variant px-m3-xx-small" aria-live="polite">
                {preset === 'STATUS' && 'Vertical, up to 30 seconds — sized to post straight to your Status'}
                {preset === 'CHAT' && 'Fits WhatsApp’s 16MB chat limit without losing sharpness'}
                {preset === 'CUSTOM' && 'Pick your own target size below'}
              </p>

              {preset === 'CUSTOM' && (
                <div className="mt-m3-small flex flex-col gap-m3-xx-small p-m3-small bg-surface-container rounded-m3-sm border border-outline-variant">
                  <label className="text-label-small text-on-surface-variant flex justify-between">
                    <span>Target output size</span>
                    <span className="font-bold">{customSizeMB} MB</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={customSizeMB}
                    onChange={(e) => setCustomSizeMB(parseInt(e.target.value))}
                    className="w-full h-2 bg-outline-variant rounded-m3-sm appearance-none cursor-pointer accent-primary"
                    aria-label={`Target output size: ${customSizeMB} megabytes`}
                  />
                  <div className="text-label-small text-on-surface-variant mt-m3-xx-small leading-normal">
                    WhatsApp compresses chat files above 16MB automatically. Targeting below 16MB preserves your pre-optimized settings.
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Status Timer Preview */}
            {preset === 'STATUS' && selectedFile && selectedFile.type.startsWith('video/') && videoDuration !== null && (
              <div className="bg-surface-container rounded-m3-md p-m3-medium border border-outline-variant">
                <WhatsAppStatusPreview videoFile={selectedFile} durationSec={videoDuration} />
              </div>
            )}

            {/* Size Prediction */}
            {selectedFile && sizePrediction && (
              <div className="bg-surface-container rounded-m3-md p-m3-medium border border-outline-variant flex flex-col gap-m3-x-small">
                <div className="flex items-center justify-between">
                  <span className="text-label-medium text-on-surface-variant">Estimated output</span>
                  <span className="text-title-medium text-primary">{sizePrediction.estimatedSizeLabel}</span>
                </div>
                <div className="flex items-center gap-m3-x-small">
                  <div className="flex-1 bg-outline-variant rounded-m3-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-m3-full transition-all duration-m3-medium-1"
                      style={{ width: `${Math.max(5, 100 - sizePrediction.reductionPercent)}%` }}
                    />
                  </div>
                  <span className="text-label-small text-on-surface-variant shrink-0">
                    {sizePrediction.reductionPercent}% smaller
                  </span>
                </div>
                <p className="text-body-small text-on-surface-variant leading-relaxed">
                  {sizePrediction.qualityNote}
                </p>
              </div>
            )}

            {/* 3-Point Proof: why COMPr, tied to WhatsApp outcomes */}
            <ul className="flex flex-col gap-m3-x-small border-t border-outline-variant pt-m3-medium list-none m-0">
              <li className="flex items-center gap-m3-x-small">
                <svg className="w-4 h-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                </svg>
                <span className="text-body-small text-on-surface">Stays sharp even after WhatsApp compresses it</span>
              </li>
              <li className="flex items-center gap-m3-x-small">
                <svg className="w-4 h-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                </svg>
                <span className="text-body-small text-on-surface">Up to 90% smaller, so it sends fast</span>
              </li>
              <li className="flex items-center gap-m3-x-small">
                <svg className="w-4 h-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                </svg>
                <span className="text-body-small text-on-surface">Share straight to any chat or status</span>
              </li>
            </ul>

            {/* Required trust signals per PRD §12 */}
            <div className="text-label-small text-on-surface-variant space-y-1">
              <p className="text-center">🔒 Files deleted automatically after 24 hours</p>
              <p className="text-center">📱 We never post to WhatsApp for you</p>
            </div>
          </section>
        )}

        {/* Processing History */}
        {!activeJob && !usageLoading && <ProcessingHistory />}

        {/* Processing Job Progress UI */}
        {activeJob && activeJob.status !== 'DONE' && activeJob.status !== 'FAILED' && (
          <section className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large shadow-m3-1 flex flex-col gap-m3-large text-center" aria-live="polite">
            <div className="flex flex-col items-center gap-m3-small">
              {sourceFileUrl && selectedFile && (
                <div className="relative w-16 h-16 rounded-m3-md overflow-hidden bg-surface-container-highest shadow-m3-1">
                  {selectedFile.type.startsWith('video/') ? (
                    <video src={sourceFileUrl} className="w-full h-full object-cover opacity-60" muted playsInline preload="metadata" />
                  ) : (
                    <Image src={sourceFileUrl} alt="" width={64} height={64} unoptimized className="w-full h-full object-cover opacity-60" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <svg className="w-6 h-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                </div>
              )}
              <h3 className="text-title-large text-on-surface">Optimizing your media</h3>
            </div>

            <div className="flex flex-col gap-m3-x-small">
              <div className="flex justify-between items-center text-label-medium text-on-surface-variant">
                <span>{getStageLabel(activeJob.stage)}</span>
                <span>{activeJob.progressPercent}%</span>
              </div>
              <div
                className="w-full bg-outline-variant rounded-m3-full h-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={activeJob.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Optimization progress: ${activeJob.progressPercent}%`}
              >
                <div
                  className="bg-primary h-full transition-all duration-m3-medium-2 ease-m3-standard"
                  style={{ width: `${activeJob.progressPercent}%` }}
                />
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

        {/* DONE / Results Comparison View */}
        {activeJob && activeJob.status === 'DONE' && (
          <section className="flex flex-col gap-m3-large" aria-live="polite">
            {selectedFile && activeJob.outputs.length > 0 && (
              <BeforeAfterSlider
                sourceFrameUrl={sourceFileUrl}
                outputFrameUrl={activeJob.outputs[0].downloadUrl}
                sizeBefore={selectedFile.size}
                sizeAfter={activeJob.outputs[0].sizeBytes}
              />
            )}

            {activeJob.resolutionDropped && !activeJob.prioritizeDetail && (
              <div className="bg-surface-container border border-primary/30 rounded-m3-md p-m3-medium flex flex-col gap-m3-small text-left">
                <div className="text-body-medium text-on-surface leading-normal">
                  We adjusted the screen size to keep motion smooth. If fine detail (like text or textures) matters more, try Fine Detail mode.
                </div>
                <button
                  onClick={handlePrioritizeDetail}
                  className="bg-primary-container text-on-primary-container hover:opacity-90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-label-large py-m3-x-small px-m3-medium rounded-m3-full transition-all duration-m3-short-2 text-center font-medium shadow-m3-1 hover:shadow-m3-2"
                >
                  Switch to Fine Detail
                </button>
              </div>
            )}

            <div className="flex flex-col gap-m3-small">
              {/* Primary CTA: Send to WhatsApp (deep link) */}
              <a
                href={buildWhatsAppShareUrl(activeJob.outputs[0]?.downloadUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('share_to_whatsapp_clicked', { job_id: activeJob.jobId, destination: 'chat' })}
                className="w-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] py-m3-small rounded-m3-full text-title-small text-center block shadow-m3-1 hover:shadow-m3-2 transition-all duration-m3-short-2"
              >
                Send to WhatsApp
              </a>

              {/* Secondary: Send to Status (deep link) */}
              <a
                href={buildWhatsAppStatusShareUrl(activeJob.outputs[0]?.downloadUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('share_to_whatsapp_clicked', { job_id: activeJob.jobId, destination: 'status' })}
                className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] py-m3-small rounded-m3-full text-label-large text-center block border border-outline transition-all duration-m3-short-2"
              >
                Send to WhatsApp Status
              </a>

              {/* Secondary: Download to device */}
              {activeJob.outputs.map((out, idx) => (
                <a
                  key={idx}
                  href={out.downloadUrl}
                  download={`compr_output_${activeJob.jobId}${idx > 0 ? `_part${idx}` : ''}.mp4`}
                  onClick={() => trackEvent('download_clicked', { job_id: activeJob.jobId, output_index: idx, size_bytes: out.sizeBytes })}
                  className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] py-m3-small rounded-m3-full text-label-large text-center block border border-outline transition-all duration-m3-short-2"
                >
                  Download to device {activeJob.outputs.length > 1 ? `(Part ${idx + 1})` : ''}
                </a>
              ))}

              {/* Feedback Prompt */}
              {!feedbackGiven && (
                <div className="bg-surface-container rounded-m3-md p-m3-medium text-center flex flex-col gap-m3-x-small" role="group" aria-label="Feedback">
                  <p className="text-body-medium text-on-surface">How does the result look?</p>
                  <div className="flex justify-center gap-m3-small">
                    <button
                      onClick={() => { setFeedbackGiven(true); trackEvent('feedback_given', { value: 'positive', job_id: activeJob.jobId }); setToast({ message: 'Thank you for your feedback!', type: 'success' }); }}
                      className="bg-primary-container text-on-primary-container hover:bg-primary/20 text-label-large py-m3-x-small px-m3-large rounded-m3-full border border-primary transition-all duration-m3-short-2"
                    >
                      Looks great 👍
                    </button>
                    <button
                      onClick={() => { setFeedbackGiven(true); trackEvent('feedback_given', { value: 'negative', job_id: activeJob.jobId }); setToast({ message: 'Thank you for your feedback!', type: 'info' }); }}
                      className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-label-large py-m3-x-small px-m3-large rounded-m3-full border border-outline transition-all duration-m3-short-2"
                    >
                      Could be better
                    </button>
                  </div>
                </div>
              )}

              {/* Tertiary: Go back to upload */}
              <button
                onClick={resetToUpload}
                className="w-full text-label-large text-on-surface-variant hover:text-on-surface py-m3-x-small rounded-m3-full font-medium transition-colors"
              >
                Optimize another file
              </button>
            </div>
          </section>
        )}

        {/* Failed Job view */}
        {activeJob && activeJob.status === 'FAILED' && (
          <section className="bg-surface-container-low border border-error rounded-m3-lg p-m3-large shadow-m3-1 flex flex-col gap-m3-medium text-center" role="alert">
            <div className="text-display-medium" aria-hidden="true">❌</div>
            <h3 className="text-title-large text-error">Something went wrong</h3>
            <p className="text-body-medium text-on-surface leading-relaxed">
              {activeJob.errorMessage || 'We could not optimize this file. This can happen with unusual formats or very short clips.'}
            </p>
            <p className="text-body-small text-on-surface-variant">
              Try uploading the file again, or use a different file.
            </p>
            <button
              onClick={resetToUpload}
              className="mt-m3-x-small bg-surface-container hover:bg-surface-container-high text-on-surface py-m3-x-small rounded-m3-full text-label-large transition-colors border border-outline"
            >
              Try Again
            </button>
          </section>
        )}
      </div>

      {/* Upsell Modal */}
      {showUpsell && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-m3-large backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Upgrade to Premium"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpsell(false); }}
        >
          <div ref={modalRef} className="bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-x-large max-w-md w-full shadow-m3-4 flex flex-col gap-m3-large animate-fade-in">
            <div className="flex flex-col gap-m3-small text-center">
              <h2 className="text-headline-medium text-on-surface">You&apos;ve hit the daily limit</h2>
              <p className="text-body-medium text-on-surface-variant leading-relaxed">{upsell.anchorLine}</p>
              <p className="text-body-large text-primary">{upsell.priceLine}</p>
            </div>
            <div className="flex flex-col gap-m3-small">
              <button
                onClick={() => { setShowUpsell(false); trackEvent('upsell_cta_clicked', { source: 'modal' }); }}
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
                onClick={claimShareBonus}
                className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline py-m3-small rounded-m3-full text-title-small flex items-center justify-center gap-m3-x-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] transition-all duration-m3-short-2"
              >
                <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Share COMPr to WhatsApp
              </button>
              <p className="text-label-small text-on-surface-variant text-center">Get +3 compressions today, free</p>
              <button
                onClick={() => { setShowUpsell(false); trackEvent('upsell_dismissed'); }}
                className="w-full text-label-large text-on-surface-variant font-medium py-m3-x-small hover:text-on-surface transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </main>
  );
}
