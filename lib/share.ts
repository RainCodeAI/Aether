export interface ShareToken {
  type: 'node' | 'insight';
  id: string;
  workspaceId: string;
  label: string;
}

// UTF-8 + base64url so labels with emoji, accents, or non-Latin scripts encode
// without throwing, and the result is safe to drop into a URL query string
// (plain base64's +, /, = get mangled by URLSearchParams).
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareToken(token: ShareToken): string {
  return toBase64Url(JSON.stringify(token));
}

export function decodeShareToken(encoded: string): ShareToken | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (
      parsed &&
      typeof parsed.type === 'string' &&
      typeof parsed.id === 'string' &&
      typeof parsed.workspaceId === 'string' &&
      typeof parsed.label === 'string'
    ) {
      return parsed as ShareToken;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(token: ShareToken): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';
  return `${base}?share=${encodeShareToken(token)}`;
}

export async function copyShareUrl(token: ShareToken): Promise<void> {
  const url = buildShareUrl(token);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Fallback for browsers that block clipboard API without user gesture
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export function getShareTokenFromUrl(): ShareToken | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('share');
  if (!raw) return null;
  return decodeShareToken(raw);
}
