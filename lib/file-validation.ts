

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp', 'video/x-msvideo'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateFile(file: File): ValidationError[] {
  const errors: ValidationError[] = [];
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

  if (!isVideo && !isImage) {
    errors.push({
      field: 'type',
      message: `"${file.name}" is not a supported format. Use MP4, WebM, MOV, JPEG, PNG, or GIF.`,
    });
  }

  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    errors.push({
      field: 'size',
      message: `"${file.name}" is ${sizeMB}MB. Maximum file size is 100MB.`,
    });
  }

  if (file.size === 0) {
    errors.push({
      field: 'empty',
      message: `"${file.name}" appears to be empty.`,
    });
  }

  return errors;
}
