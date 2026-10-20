'use client';

import BeforeAfterSlider from '../../../components/BeforeAfterSlider';
import { buildWhatsAppShareUrl, buildWhatsAppStatusShareUrl } from '../../../lib/whatsapp-share';
import { apiUrl } from '../../../lib/api-client';
import { trackEvent } from '../../providers';
import type { JobState } from '../hooks/useJobPolling';

interface DashboardResultViewProps {
  activeJob: JobState;
  selectedFile: File | null;
  sourceFileUrl: string;
  feedbackGiven: boolean;
  onFeedback: (positive: boolean) => void;
  onPrioritizeDetail: () => void;
  onReset: () => void;
}

export default function DashboardResultView({
  activeJob,
  selectedFile,
  sourceFileUrl,
  feedbackGiven,
  onFeedback,
  onPrioritizeDetail,
  onReset,
}: DashboardResultViewProps) {
  const primaryOutput = activeJob.outputs[0];

  return (
    <section className="flex flex-col gap-m3-large" aria-live="polite">
      {selectedFile && primaryOutput && (
        <BeforeAfterSlider
          sourceFrameUrl={sourceFileUrl}
          outputFrameUrl={apiUrl(primaryOutput.downloadPath)}
          sizeBefore={selectedFile.size}
          sizeAfter={primaryOutput.sizeBytes}
        />
      )}

      {activeJob.resolutionDropped && !activeJob.prioritizeDetail && (
        <div className="bg-surface-container border border-primary/30 rounded-m3-md p-m3-medium flex flex-col gap-m3-small text-left">
          <div className="text-body-medium text-on-surface leading-normal">
            We adjusted the screen size to keep motion smooth. If fine detail (like text or textures) matters more, try Fine Detail mode.
          </div>
          <button
            onClick={onPrioritizeDetail}
            className="bg-primary-container text-on-primary-container hover:opacity-90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-label-large py-m3-x-small px-m3-medium rounded-m3-full transition-all duration-m3-short-2 text-center font-medium shadow-m3-1 hover:shadow-m3-2"
          >
            Switch to Fine Detail
          </button>
        </div>
      )}

      <div className="flex flex-col gap-m3-small">
        {/* Primary CTA: Send to WhatsApp (deep link) */}
        {primaryOutput && (
          <a
            href={buildWhatsAppShareUrl(apiUrl(primaryOutput.downloadPath))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent('share_to_whatsapp_clicked', {
                job_id: activeJob.jobId,
                destination: 'chat',
              })
            }
            className="w-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] py-m3-small rounded-m3-full text-title-small text-center block shadow-m3-1 hover:shadow-m3-2 transition-all duration-m3-short-2"
          >
            Send to WhatsApp
          </a>
        )}

        {/* Secondary: Send to Status (deep link) */}
        {primaryOutput && (
          <a
            href={buildWhatsAppStatusShareUrl(apiUrl(primaryOutput.downloadPath))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent('share_to_whatsapp_clicked', {
                job_id: activeJob.jobId,
                destination: 'status',
              })
            }
            className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] py-m3-small rounded-m3-full text-label-large text-center block border border-outline transition-all duration-m3-short-2"
          >
            Send to WhatsApp Status
          </a>
        )}

        {/* Secondary: Download to device */}
        {activeJob.outputs.map((out, idx) => (
          <a
            key={idx}
            href={apiUrl(out.downloadPath)}
            download={`vecteus_output_${activeJob.jobId}${idx > 0 ? `_part${idx}` : ''}.mp4`}
            onClick={() =>
              trackEvent('download_clicked', {
                job_id: activeJob.jobId,
                output_index: idx,
                size_bytes: out.sizeBytes,
              })
            }
            className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] py-m3-small rounded-m3-full text-label-large text-center block border border-outline transition-all duration-m3-short-2"
          >
            Download to device {activeJob.outputs.length > 1 ? `(Part ${idx + 1})` : ''}
          </a>
        ))}

        {/* Feedback Prompt */}
        {!feedbackGiven && (
          <div
            className="bg-surface-container rounded-m3-md p-m3-medium text-center flex flex-col gap-m3-x-small"
            role="group"
            aria-label="Feedback"
          >
            <p className="text-body-medium text-on-surface">How does the result look?</p>
            <div className="flex justify-center gap-m3-small">
              <button
                onClick={() => onFeedback(true)}
                className="bg-primary-container text-on-primary-container hover:bg-primary/20 text-label-large py-m3-x-small px-m3-large rounded-m3-full border border-primary transition-all duration-m3-short-2"
              >
                Looks great
              </button>
              <button
                onClick={() => onFeedback(false)}
                className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-label-large py-m3-x-small px-m3-large rounded-m3-full border border-outline transition-all duration-m3-short-2"
              >
                Could be better
              </button>
            </div>
          </div>
        )}

        {/* Tertiary: Go back to upload */}
        <button
          onClick={onReset}
          className="w-full text-label-large text-on-surface-variant hover:text-on-surface py-m3-x-small rounded-m3-full font-medium transition-colors"
        >
          Optimize another file
        </button>
      </div>
    </section>
  );
}
