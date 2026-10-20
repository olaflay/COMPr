'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { trackEvent } from '../../providers';

export interface JobState {
  jobId: string;
  status: 'QUEUED' | 'ANALYZING' | 'ENCODING' | 'VERIFYING' | 'DONE' | 'FAILED';
  stage: string;
  progressPercent: number;
  stepsRemaining: number;
  outputs: Array<{ id: string; segmentIndex: number | null; downloadPath: string; sizeBytes: number }>;
  errorMessage?: string;
  resolutionDropped?: boolean;
  prioritizeDetail?: boolean;
  queuePosition?: number;
}

export function useJobPolling() {
  const [activeJob, setActiveJob] = useState<JobState | null>(null);
  const pollIntervalRef = useRef<any>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPollingJob = useCallback((
    jobId: string,
    fingerprint: string,
    onJobDone?: (job: JobState) => void
  ) => {
    stopPolling();

    const poll = async () => {
      try {
        const res = await apiFetch(`/api/v1/jobs/${jobId}?fingerprint=${fingerprint}`);
        const data = (await res.json()) as JobState;
        setActiveJob(data);

        if (data.status === 'DONE' || data.status === 'FAILED') {
          stopPolling();
          trackEvent('job_completed', {
            job_id: jobId,
            status: data.status,
            resolution_dropped: data.resolutionDropped,
          });
          onJobDone?.(data);
        }
      } catch (err) {
        console.error('Job polling error', err);
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 3000);
  }, [stopPolling]);

  return {
    activeJob,
    setActiveJob,
    startPollingJob,
    stopPolling,
  };
}
