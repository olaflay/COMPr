import { ChangeEvent, DragEvent } from 'react';
import { type ValidationError } from '../../../lib/file-validation';
export declare function useFileUpload(): {
    selectedFile: File | null;
    sourceFileUrl: string;
    videoDuration: number | null;
    validationErrors: ValidationError[];
    isUploading: boolean;
    uploadProgress: number;
    uploadedFileKey: string;
    isDragging: boolean;
    fileInputRef: import("react").RefObject<HTMLInputElement | null>;
    setSelectedFile: import("react").Dispatch<import("react").SetStateAction<File | null>>;
    setVideoDuration: import("react").Dispatch<import("react").SetStateAction<number | null>>;
    setValidationErrors: import("react").Dispatch<import("react").SetStateAction<ValidationError[]>>;
    setIsDragging: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    handleFileDrop: (e: DragEvent<HTMLDivElement>) => void;
    clearFile: () => void;
    uploadMultipart: () => Promise<string>;
};
//# sourceMappingURL=useFileUpload.d.ts.map