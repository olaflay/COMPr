import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export interface SsrfValidationResult {
  valid: boolean;
  reason?: string;
  resolvedIp?: string;
}

/**
 * Checks if an IPv4 or IPv6 address is private, loopback, or reserved.
 * Strictly blocks RFC 1918, 127.0.0.0/8, 169.254.0.0/16, and link-local ranges.
 */
export function isPrivateOrBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformed IPv4 is blocked
    }

    const [b0, b1] = parts;

    // Loopback (127.0.0.0/8)
    if (b0 === 127) return true;

    // Current network (0.0.0.0/8)
    if (b0 === 0) return true;

    // Cloud metadata and link-local (169.254.0.0/16)
    if (b0 === 169 && b1 === 254) return true;

    // RFC 1918 Private Ranges
    // 10.0.0.0/8
    if (b0 === 10) return true;
    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16
    if (b0 === 192 && b1 === 168) return true;

    // Carrier-grade NAT (100.64.0.0/10)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // Documentation / TEST-NET (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
    if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;
    if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;
    if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;

    // Multicast & Reserved (224.0.0.0/4 and 240.0.0.0/4, plus 255.255.255.255)
    if (b0 >= 224) return true;

    return false;
  }

  if (version === 6) {
    const norm = ip.toLowerCase();

    // Loopback (::1)
    if (norm === '::1' || norm === '0:0:0:0:0:0:0:1') return true;

    // Unspecified (::)
    if (norm === '::' || norm === '0:0:0:0:0:0:0:0') return true;

    // Unique Local (fc00::/7, i.e. fc00:: to fdff::)
    if (norm.startsWith('fc') || norm.startsWith('fd')) return true;

    // Link-local (fe80::/10)
    if (norm.startsWith('fe8') || norm.startsWith('fe9') || norm.startsWith('fea') || norm.startsWith('feb')) {
      return true;
    }

    // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
    if (norm.includes('::ffff:')) {
      const mappedIpv4 = norm.split('::ffff:')[1];
      if (mappedIpv4 && isIP(mappedIpv4) === 4) {
        return isPrivateOrBlockedIp(mappedIpv4);
      }
    }

    return false;
  }

  // Not a valid standard IP string
  return false;
}

/**
 * Validates an outbound URL to prevent Server-Side Request Forgery (SSRF).
 * Rejects non-HTTP(S) protocols and hostnames that resolve to private or loopback IPs.
 */
export async function validateWebhookUrl(urlString: string): Promise<SsrfValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Malformed URL structure' };
  }

  // Enforce HTTP or HTTPS protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicit localhost reject
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { valid: false, reason: 'Localhost addresses are forbidden' };
  }

  // If hostname is directly an IP literal
  if (isIP(hostname)) {
    if (isPrivateOrBlockedIp(hostname)) {
      return { valid: false, reason: `Destination IP ${hostname} is private or blocked`, resolvedIp: hostname };
    }
    return { valid: true, resolvedIp: hostname };
  }

  // Resolve hostname via DNS
  try {
    const res = await lookup(hostname, { all: true });
    for (const entry of res) {
      if (isPrivateOrBlockedIp(entry.address)) {
        return {
          valid: false,
          reason: `Hostname ${hostname} resolves to private IP ${entry.address}`,
          resolvedIp: entry.address,
        };
      }
    }
    return { valid: true, resolvedIp: res[0]?.address };
  } catch (err: any) {
    return { valid: false, reason: `DNS lookup failed for ${hostname}: ${err.message}` };
  }
}
