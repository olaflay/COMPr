/**
 * Client-side image pre-compression utility.
 * Decodes images in browser using createImageBitmap, resizes to preset boundaries,
 * and outputs a compressed JPEG File.
 */

export async function precompressImage(
  file: File,
  maxLongEdgePx: number,
  quality: number = 0.85
): Promise<File> {
  if (typeof window === 'undefined' && !(globalThis as any).createImageBitmap) {
    return file; // SSR safety fallback
  }

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  if (width > maxLongEdgePx || height > maxLongEdgePx) {
    if (width > height) {
      height = Math.round((height * maxLongEdgePx) / width);
      width = maxLongEdgePx;
    } else {
      width = Math.round((width * maxLongEdgePx) / height);
      height = maxLongEdgePx;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Failed to get 2d context');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}
