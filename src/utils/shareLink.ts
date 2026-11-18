import { isTauriTarget } from './runtimeTarget';
import { safeCopyToClipboard } from './helpers';

/** Absolute share URL. The web build uses clean URLs; the desktop (hash-routed) build keeps '#/path'. */
export function buildShareUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return isTauriTarget()
    ? `${window.location.origin}${window.location.pathname}#${cleanPath}`
    : `${window.location.origin}${cleanPath}`;
}

/** Copies the share URL for `path`. Resolves true when the copy went through. */
export async function copyShareLink(path: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const fullUrl = buildShareUrl(path);
  return safeCopyToClipboard(fullUrl);
}
