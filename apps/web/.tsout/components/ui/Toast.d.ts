interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onDismiss: () => void;
    duration?: number;
    /** Optional action button (e.g. "Try Again") shown on error toasts so
     *  failures always offer a recovery path instead of a dead end. */
    actionLabel?: string;
    onAction?: () => void;
    /** Optional second action button (e.g. Yes/No feedback prompts). */
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
}
export default function Toast({ message, type, onDismiss, duration, actionLabel, onAction, secondaryActionLabel, onSecondaryAction }: ToastProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Toast.d.ts.map