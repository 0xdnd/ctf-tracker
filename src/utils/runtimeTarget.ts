/**
 * Detects whether the app runs inside the Tauri desktop shell (hash routing, relative assets)
 * or as the web build (clean URLs via BrowserRouter).
 */
export const isTauriTarget = (): boolean => {
  if (import.meta.env.VITE_TARGET === 'tauri') return true;
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
};
