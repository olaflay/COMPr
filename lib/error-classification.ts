/**
 * Classifies whether an error is permanent or transient.
 * Permanent failures (e.g. invalid file format, unknown codec, bad parameters) should not be retried.
 * Transient failures (e.g. database connection issues, object-storage timeouts) should be retried.
 */
export function isPermanentFailure(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes('magic-byte validation failed') ||
    normalized.includes('no media stream found') ||
    normalized.includes('no video stream') ||
    normalized.includes('matches no streams') ||
    normalized.includes('does not contain any stream') ||
    normalized.includes('invalid data found') ||
    normalized.includes('invalid argument') ||
    normalized.includes('option not found') ||
    normalized.includes('codec not found') ||
    normalized.includes('unknown encoder') ||
    normalized.includes('unsupported codec') ||
    normalized.includes('moov atom not found') ||
    normalized.includes('end of file') ||
    normalized.includes('eof') ||
    normalized.includes('corrupt') ||
    normalized.includes('empty file') ||
    normalized.includes('ssrf_blocked')
  );
}
