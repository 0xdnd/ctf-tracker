import { isFullscreenNotesPath } from './fullscreenRoutes';

const KEY = 'zerobox_last_app_route';

/** Remember the last route outside the full-screen notes, for the "Back to ZeroBox" button. */
export function rememberAppRoute(pathWithSearchAndHash: string): void {
  const path = pathWithSearchAndHash.split(/[?#]/)[0];
  if (isFullscreenNotesPath(path)) return;
  // Legacy links that redirect into the field manual would make Back loop straight back into it.
  const rest = pathWithSearchAndHash.slice(path.length);
  if (/^\/cheatsheets?\/?$/i.test(path) && (/[?&]note=/.test(rest) || /manual|cpts/i.test(rest))) return;
  try {
    sessionStorage.setItem(KEY, pathWithSearchAndHash);
  } catch {
    /* storage unavailable */
  }
}

export function getLastAppRoute(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
