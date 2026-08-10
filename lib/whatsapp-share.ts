const SHARE_MESSAGE = 'Make your media look sharp on WhatsApp';
const SHARE_URL = 'https://compr.app';

/**
 * Build a WhatsApp share URL that opens WhatsApp directly on mobile
 * and falls back to wa.me on desktop.
 * On mobile: whatsapp://send?text=... opens the WhatsApp app directly.
 * On desktop: https://wa.me/?text=... opens WhatsApp Web.
 */
export function buildWhatsAppShareUrl(downloadUrl?: string): string {
  const message = downloadUrl
    ? `${SHARE_MESSAGE} ${downloadUrl}`
    : `${SHARE_MESSAGE} ${SHARE_URL}`;
  const encoded = encodeURIComponent(message);

  if (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return `whatsapp://send?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Build a direct WhatsApp Status share URL.
 * Opens WhatsApp with text pre-filled for status composition.
 */
export function buildWhatsAppStatusShareUrl(downloadUrl?: string): string {
  const message = downloadUrl
    ? `Check out this sharp video I optimized with COMPr ${downloadUrl}`
    : `${SHARE_MESSAGE} ${SHARE_URL}`;
  const encoded = encodeURIComponent(message);

  if (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return `whatsapp://send?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
