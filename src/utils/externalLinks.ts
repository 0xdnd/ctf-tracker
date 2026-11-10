import { isTauriTarget } from './runtimeTarget';

let installed = false;

const toExternalUrl = (raw: string | URL | undefined | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(String(raw), window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.origin === window.location.origin) return null;
    return url.href;
  } catch {
    return null;
  }
};

const openExternal = (href: string): void => {
  import('@tauri-apps/plugin-opener')
    .then((m) => m.openUrl(href))
    .catch((err) => console.warn('[ZeroBox] Could not open external link:', err));
};

/**
 * Desktop shell only: the webview blocks new-window requests, so route external http(s)
 * links (anchor clicks and window.open) to the system browser. No-op on the web build.
 */
export const installExternalLinkHandler = (): void => {
  if (installed || typeof window === 'undefined' || !isTauriTarget()) return;
  installed = true;

  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    // Primary click (click) or middle click (auxclick); ignore right click.
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = toExternalUrl(anchor.getAttribute('href'));
    if (!href) return;
    event.preventDefault();
    openExternal(href);
  };
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);

  const nativeOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = toExternalUrl(url);
    if (href) {
      openExternal(href);
      return null;
    }
    return nativeOpen(url, target, features);
  }) as typeof window.open;
};
