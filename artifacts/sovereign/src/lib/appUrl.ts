/**
 * Public, shareable base URL for Sovereign.
 * Priority:
 *   1. VITE_APP_BASE_URL — explicit build/deploy-time override (custom domain)
 *   2. window.location.origin — the actual domain the app is running on.
 *      We exclude localhost/127.0.0.1 since those aren't publicly reachable.
 */

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

  if (typeof window === 'undefined') return '';

  const origin = window.location.origin;

  // Localhost is not publicly reachable — skip it.
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return '';
  }

  return origin;
}

/** Build a full shareable link to an in-app path (path must start with "/"). */
export function buildShareLink(path: string): string {
  const base = getPublicAppUrl().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
