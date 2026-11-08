import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildAppUrl, openInNewTab } from './openInNewTab';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
});

describe('openInNewTab', () => {
  it('builds a clean path url for the browser router', () => {
    expect(buildAppUrl('/field-manual')).toBe(`${window.location.origin}/field-manual`);
  });

  it('builds a hash url for the desktop (hash) router', () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    expect(buildAppUrl('/tracker')).toBe(`${window.location.origin}${window.location.pathname}#/tracker`);
  });

  it('opens the url in a new tab without an opener', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    openInNewTab('/tracker');
    expect(open).toHaveBeenCalledWith(`${window.location.origin}/tracker`, '_blank', 'noopener');
  });
});
