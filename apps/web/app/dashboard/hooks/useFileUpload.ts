'use client';

import { useState, useEffect, useCallback, useRef, ChangeEvent, DragEvent } from 'react';
import { validateFile, type ValidationError } from '../../../lib/file-validation';
import { apiFetch } from '../../../lib/api-client';
import { trackEvent } from '../../providers';

export function useFileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceFileUrl, setSourceFileUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileKey, setUploadedFileKey] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processSelectedFile = useCallback((file: File, isDrop = false) => {
    const errors = validateFile(file);
    setValidationErrors(errors);
    if (errors.length === 0) {
      setSelectedFile(file);
      trackEvent(isDrop ? 'upload_started' : 'file_selected', {
        file_type: file.type,
        file_size_bytes: file.size,
      });

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
  }, []);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      processSelectedFile(target.files[0], false);
    }
  }, [processSelectedFile]);

  const handleFileDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (dt.files && dt.files.length > 0) {
      processSelectedFile(dt.files[0], true);
    }
  }, [processSelectedFile]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setVideoDuration(null);
    setValidationErrors([]);
    setUploadedFileKey('');
    setUploadProgress(0);
  }, []);

  const uploadMultipart = async (): Promise<string> => {
    if (!selectedFile) throw new Error('No file selected');

    setIsUploading(true);
    setUploadProgress(0);

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalParts = Math.ceil(selectedFile.size / CHUNK_SIZE);
    const checkpointKey = `upload_cp:${selectedFile.name}:${selectedFile.size}`;
    let fileKeyToUse = '';

    try {
      let uploadIdToUse = '';
      let completedParts: Array<{ ETag: string; PartNumber: number }> = [];

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

      if (!uploadIdToUse) {
        const startRes = await apiFetch('/api/v1/uploads/multipart/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            sizeBytes: selectedFile.size,
          }),
        });
        const startData = await startRes.json() as any;
        if (!startRes.ok || !startData.uploadId || !startData.fileKey) {
          throw new Error(startData?.error?.message || `Failed to start upload (status ${startRes.status})`);
        }
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

        while (!uploadSuccess && attempts < 5) {
          attempts++;
          try {
            const presignPartRes = await apiFetch('/api/v1/uploads/multipart/presign-part', {
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
            if (!presignPartRes.ok || !partUploadUrl) {
              throw new Error(presignData?.error?.message || `Failed to get upload URL (status ${presignPartRes.status})`);
            }

            const uploadRes = await fetch(partUploadUrl, {
              method: 'PUT',
              body: chunk,
            });

            if (uploadRes.ok) {
              etag = (uploadRes.headers.get('ETag') || '').replace(/"/g, '');
              uploadSuccess = true;
            } else if (uploadRes.status === 404) {
              localStorage.removeItem(checkpointKey);
              throw new Error('Upload session expired. Please try again.');
            } else {
              throw new Error(`Upload failed with status ${uploadRes.status}`);
            }
          } catch (err) {
            console.warn(`Part ${partNumber} attempt ${attempts} failed:`, err);
            if (attempts >= 5 || (err instanceof Error && err.message === 'Upload session expired. Please try again.')) {
              throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
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

      const completeRes = await apiFetch('/api/v1/uploads/multipart/complete', {
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
      return fileKeyToUse;
    } catch (err) {
      setIsUploading(false);
      throw err;
    }
  };

  return {
    selectedFile,
    sourceFileUrl,
    videoDuration,
    validationErrors,
    isUploading,
    uploadProgress,
    uploadedFileKey,
    isDragging,
    fileInputRef,
    setSelectedFile,
    setVideoDuration,
    setValidationErrors,
    setIsDragging,
    handleFileChange,
    handleFileDrop,
    clearFile,
    uploadMultipart,
  };
}
