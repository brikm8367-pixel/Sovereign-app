// Public, shareable base URL of the app.
// Priority:
//   1. VITE_APP_BASE_URL (explicit build-time override, e.g. a custom domain)
//   2. The current origin — unless we're on a non-public host (Lovable preview,
//      localhost) in which case we fall back to the published domain.
// The Lovable *preview* origin (id-preview--*.lovable.app) requires a Lovable
// login, so any link built from it would wrongly send recipients to Lovable.
const PUBLIC_APP_URL =
  (import.meta as any)?.env?.VITE_APP_BASE_URL?.trim().replace(/\/$/, '') ||
  'https://directly-app.lovable.app';

function envBaseUrl(): string | null {
  const raw = (import.meta as any)?.env?.VITE_APP_BASE_URL;
  if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) {
    return raw.trim().replace(/\/$/, '');
  }
  return null;
}

export function getPublicAppUrl(): string {
  const override = envBaseUrl();
  if (override) return override;
  if (typeof window === 'undefined') return PUBLIC_APP_URL;
  const origin = window.location.origin;
  // Preview/sandbox hosts are not publicly accessible — use the published URL.
  if (
    origin.includes('id-preview--') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('.replit.dev') ||
    origin.includes('.repl.co')
  ) {
    return PUBLIC_APP_URL;
  }
  return origin;
}

// Build a full shareable link to an in-app path (path must start with "/").
export function buildShareLink(path: string): string {
  const base = getPublicAppUrl().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
