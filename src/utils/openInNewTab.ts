import { isTauriTarget } from './runtimeTarget';

/** Full URL for an in-app path, matching the router mode (hash routing on desktop, clean paths on web). */
export const buildAppUrl = (path: string): string =>
  isTauriTarget()
    ? `${window.location.origin}${window.location.pathname}#${path}`
    : `${window.location.origin}${path}`;

/** Opens an in-app path in a new browser tab (a new app window on desktop, same as the note popout). */
export const openInNewTab = (path: string): void => {
  window.open(buildAppUrl(path), '_blank', 'noopener');
};
