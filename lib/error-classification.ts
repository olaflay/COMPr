/**
 * Classifies whether an error is permanent or transient.
 * Permanent failures (e.g. invalid file format, unknown codec, bad parameters) should not be retried.
 * Transient failures (e.g. database connection issues, R2 timeouts) should be retried.
 */
export function isPermanentFailure(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes('magic-byte validation failed') ||
    normalized.includes('no media stream found') ||
    normalized.includes('invalid data found') ||
    normalized.includes('invalid argument') ||
    normalized.includes('option not found') ||
    normalized.includes('codec not found') ||
    normalized.includes('unknown encoder') ||
    normalized.includes('unsupported codec')
  );
}
