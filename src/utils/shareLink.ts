import { isTauriTarget } from './runtimeTarget';

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
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullUrl);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = fullUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    return true;
  } catch (err) {
    console.error('Failed to copy share link:', err);
    return false;
  }
}
