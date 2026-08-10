import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { sniffFileType } from '../lib/sniff-file-type.ts';

describe('sniff-file-type.ts - server-side magic-byte sniffing', () => {
  const tempPath = join(process.cwd(), 'temp_magic_test');

  const testSniff = (bytes: number[]): string => {
    writeFileSync(tempPath, Buffer.from(bytes));
    try {
      return sniffFileType(tempPath);
    } finally {
      try {
        unlinkSync(tempPath);
      } catch {}
    }
  };

  it('detects PNG magic bytes correctly as IMAGE', () => {
    const pngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    assert.equal(testSniff(pngBytes), 'IMAGE');
  });

  it('detects JPEG magic bytes correctly as IMAGE', () => {
    const jpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];
    assert.equal(testSniff(jpegBytes), 'IMAGE');
  });

  it('detects WEBP container magic bytes correctly as IMAGE', () => {
    const webpBytes = [
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // size
      0x57, 0x45, 0x42, 0x50  // WEBP
    ];
    assert.equal(testSniff(webpBytes), 'IMAGE');
  });

  it('detects HEIC format signature correctly as IMAGE', () => {
    const heicBytes = [
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x68, 0x65, 0x69, 0x63  // heic
    ];
    assert.equal(testSniff(heicBytes), 'IMAGE');
  });

  it('detects MP4 video signature correctly as VIDEO', () => {
    const mp4Bytes = [
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x6d, 0x70, 0x34, 0x32  // mp42
    ];
    assert.equal(testSniff(mp4Bytes), 'VIDEO');
  });

  it('detects WebM video EBML headers correctly as VIDEO', () => {
    const webmBytes = [0x1A, 0x45, 0xDF, 0xA3];
    assert.equal(testSniff(webmBytes), 'VIDEO');
  });

  it('detects QuickTime MOV format headers correctly as VIDEO', () => {
    const movBytes = [
      0x00, 0x00, 0x00, 0x14,
      0x6d, 0x6f, 0x6f, 0x76  // moov
    ];
    assert.equal(testSniff(movBytes), 'VIDEO');
  });

  it('returns INVALID for unsupported format magic bytes', () => {
    const randomBytes = [0x00, 0x11, 0x22, 0x33, 0x44, 0x55];
    assert.equal(testSniff(randomBytes), 'INVALID');
  });
});
