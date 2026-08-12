import { openSync, readSync, closeSync } from 'node:fs';

/**
 * Sniff file headers to determine actual file container type on server-side.
 * Dependency-free, reading the first 16 bytes.
 */
export function sniffFileType(filePath: string): 'VIDEO' | 'IMAGE' | 'INVALID' {
  let fd: number;
  try {
    fd = openSync(filePath, 'r');
  } catch (err) {
    return 'INVALID';
  }

  const buffer = Buffer.alloc(16);
  let bytesRead = 0;
  try {
    bytesRead = readSync(fd, buffer, 0, 16, 0);
  } catch (err) {
    return 'INVALID';
  } finally {
    try {
      closeSync(fd);
    } catch {}
  }

  if (bytesRead < 4) {
    return 'INVALID';
  }

  // 1. PNG check: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return 'IMAGE';
  }

  // 2. JPEG check: FF D8 FF
  if (
    buffer[0] === 0xFF &&
    buffer[1] === 0xD8 &&
    buffer[2] === 0xFF
  ) {
    return 'IMAGE';
  }

  // 3. WEBP check: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    bytesRead >= 12
  ) {
    const webpMagic = buffer.toString('ascii', 8, 12);
    if (webpMagic === 'WEBP') {
      return 'IMAGE';
    }
  }

  // 4. GIF check: "GIF87a" or "GIF89a" (ASCII header)
  if (bytesRead >= 6) {
    const gifMagic = buffer.toString('ascii', 0, 6);
    if (gifMagic === 'GIF87a' || gifMagic === 'GIF89a') {
      return 'IMAGE';
    }
  }

  // 5. HEIC check: ....ftypheic or ....ftypmif1
  if (bytesRead >= 12) {
    const ftyp = buffer.toString('ascii', 4, 8);
    if (ftyp === 'ftyp') {
      const brand = buffer.toString('ascii', 8, 12);
      if (['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
        return 'IMAGE';
      }
    }
  }

  // 6. MP4/3GP check: has "ftyp" at offset 4
  if (bytesRead >= 8) {
    const ftyp = buffer.toString('ascii', 4, 8);
    if (ftyp === 'ftyp') {
      return 'VIDEO';
    }
  }

  // 7. WebM/MKV check: 1A 45 DF A3
  if (
    buffer[0] === 0x1A &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xDF &&
    buffer[3] === 0xA3
  ) {
    return 'VIDEO';
  }

  // 8. QuickTime (MOV) check: ftypqt / moov / free / mdat
  if (bytesRead >= 8) {
    const ftyp = buffer.toString('ascii', 4, 8);
    if (ftyp === 'moov' || ftyp === 'free' || ftyp === 'mdat' || ftyp === 'wide') {
      return 'VIDEO';
    }
  }

  return 'INVALID';
}
