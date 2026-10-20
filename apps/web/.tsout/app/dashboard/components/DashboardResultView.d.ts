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
export default function DashboardResultView({ activeJob, selectedFile, sourceFileUrl, feedbackGiven, onFeedback, onPrioritizeDetail, onReset, }: DashboardResultViewProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=DashboardResultView.d.ts.map