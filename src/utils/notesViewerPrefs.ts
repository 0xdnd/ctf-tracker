/** Viewer display modes that no longer exist. Stored values are dropped so they cannot linger. */
const LEGACY_VIEWER_KEYS = [
  'zerobox_note_viewer_mode',
  'zerobox_modal_maximized',
  'zerobox_docked_maximized',
] as const;

export function clearLegacyViewerPrefs(): void {
  for (const key of LEGACY_VIEWER_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage unavailable: nothing to clean
    }
  }
}
