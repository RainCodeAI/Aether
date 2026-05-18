export interface ShareToken {
  type: 'node' | 'insight';
  id: string;
  workspaceId: string;
  label: string;
}

export function encodeShareToken(token: ShareToken): string {
  return btoa(JSON.stringify(token));
}

export function decodeShareToken(encoded: string): ShareToken | null {
  try {
    const parsed = JSON.parse(atob(encoded));
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
  await navigator.clipboard.writeText(buildShareUrl(token));
}

export function getShareTokenFromUrl(): ShareToken | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('share');
  if (!raw) return null;
  return decodeShareToken(raw);
}
