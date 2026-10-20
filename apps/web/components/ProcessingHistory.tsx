'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiUrl } from '../lib/api-client';
import {
  getHistory,
  removeFromHistory,
  clearHistory,
  formatBytes,
  reductionPercent,
  timeAgo,
  type HistoryEntry,
} from '../lib/job-history';
import { trackEvent } from '../app/providers';
import EmptyState from './ui/EmptyState';

export default function ProcessingHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setEntries(getHistory());
  }, []);

  const handleReDownload = (entry: HistoryEntry) => {
    trackEvent('download_clicked', { job_id: entry.jobId, preset: entry.preset });
    window.open(apiUrl(entry.downloadPath), '_blank');
  };

  const handleRemove = (jobId: string) => {
    removeFromHistory(jobId);
    setEntries(getHistory());
    trackEvent('history_entry_removed', { job_id: jobId });
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearHistory();
    setEntries([]);
    setConfirmClear(false);
    trackEvent('history_cleared');
  };

  const displayEntries = expanded ? entries : entries.slice(0, 3);

  // Empty state: show a helpful nudge instead of nothing
  if (entries.length === 0) {
    return (
      <section className="bg-surface-container-low border border-outline-variant rounded-m3-lg shadow-m3-1">
        <EmptyState
          icon={
            <svg className="w-12 h-12 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          title="No recent files"
          description="Files you optimize will show up here so you can re-download them later."
          action={
            <Link
              href="#upload-section"
              className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container py-m3-x-small px-m3-large rounded-m3-full text-label-large shadow-m3-1 transition-all duration-m3-short-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Optimize a file
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-m3-lg shadow-m3-1">
      <div className="flex items-center justify-between p-m3-medium border-b border-outline-variant">
        <h3 className="text-title-medium text-on-surface">Recent files</h3>
        {confirmClear ? (
          <div className="flex items-center gap-m3-x-small">
            <span className="text-label-small text-on-surface-variant">Clear all?</span>
            <button
              onClick={handleClearAll}
              className="text-label-small text-error hover:text-on-error-container font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="text-label-small text-on-surface-variant hover:text-on-surface transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleClearAll}
            className="text-label-small text-on-surface-variant hover:text-error transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col">
        {displayEntries.map((entry) => (
          <div
            key={entry.jobId}
            className="flex items-center gap-m3-small p-m3-medium border-b border-outline-variant last:border-b-0 hover:bg-surface-container/50 transition-colors"
          >
            {/* File type icon */}
            <div className="w-10 h-10 rounded-m3-sm bg-primary-container text-on-primary-container flex items-center justify-center text-label-small font-bold shrink-0 select-none">
              {entry.fileType.startsWith('video/') ? 'MP4' : 'IMG'}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="text-body-medium text-on-surface font-medium truncate">
                {entry.fileName}
              </div>
              <div className="flex items-center gap-m3-x-small text-label-small text-on-surface-variant">
                <span>{formatBytes(entry.inputSizeBytes)}</span>
                <span aria-hidden="true">&rarr;</span>
                <span className="text-primary font-medium">{formatBytes(entry.outputSizeBytes)}</span>
                {entry.status === 'DONE' && (
                  <span className="text-primary">
                    ({reductionPercent(entry.inputSizeBytes, entry.outputSizeBytes)}% smaller)
                  </span>
                )}
              </div>
            </div>

            {/* Time + actions */}
            <div className="flex items-center gap-m3-x-small shrink-0">
              <span className="text-label-small text-on-surface-variant hidden sm:inline">
                {timeAgo(entry.createdAt)}
              </span>
              {entry.status === 'DONE' && (
                <button
                  onClick={() => handleReDownload(entry)}
                  className="p-m3-x-small rounded-m3-full hover:bg-surface-container-high transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label={`Re-download ${entry.fileName}`}
                >
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => handleRemove(entry.jobId)}
                className="p-m3-x-small rounded-m3-full hover:bg-surface-container-high transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label={`Remove ${entry.fileName} from history`}
              >
                <svg className="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {entries.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-m3-small text-label-large text-primary hover:text-primary-container transition-colors border-t border-outline-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {expanded ? 'Show less' : `Show ${entries.length - 3} more`}
        </button>
      )}
    </section>
  );
}
