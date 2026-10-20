export interface JobState {
    jobId: string;
    status: 'QUEUED' | 'ANALYZING' | 'ENCODING' | 'VERIFYING' | 'DONE' | 'FAILED';
    stage: string;
    progressPercent: number;
    stepsRemaining: number;
    outputs: Array<{
        id: string;
        segmentIndex: number | null;
        downloadPath: string;
        sizeBytes: number;
    }>;
    errorMessage?: string;
    resolutionDropped?: boolean;
    prioritizeDetail?: boolean;
    queuePosition?: number;
}
export declare function useJobPolling(): {
    activeJob: JobState | null;
    setActiveJob: import("react").Dispatch<import("react").SetStateAction<JobState | null>>;
    startPollingJob: (jobId: string, fingerprint: string, onJobDone?: (job: JobState) => void) => void;
    stopPolling: () => void;
};
//# sourceMappingURL=useJobPolling.d.ts.map