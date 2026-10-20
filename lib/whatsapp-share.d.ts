/**
 * Build a WhatsApp share URL that opens WhatsApp directly on mobile
 * and falls back to wa.me on desktop.
 * On mobile: whatsapp://send?text=... opens the WhatsApp app directly.
 * On desktop: https://wa.me/?text=... opens WhatsApp Web.
 */
export declare function buildWhatsAppShareUrl(downloadUrl?: string): string;
/**
 * Build a direct WhatsApp Status share URL.
 * Opens WhatsApp with text pre-filled for status composition.
 */
export declare function buildWhatsAppStatusShareUrl(downloadUrl?: string): string;
//# sourceMappingURL=whatsapp-share.d.ts.map