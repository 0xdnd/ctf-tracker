import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDesktopUpdater } from './useDesktopUpdater';

describe('useDesktopUpdater hook', () => {
  const originalElectronAPI = window.electronAPI;

  afterEach(() => {
    window.electronAPI = originalElectronAPI;
  });

  it('initializes in web mode when window.electronAPI is undefined', () => {
    delete (window as any).electronAPI;
    const { result } = renderHook(() => useDesktopUpdater());

    expect(result.current.isElectron).toBe(false);
    expect(result.current.status).toBe('idle');
    expect(result.current.version).toBeNull();
  });

  it('subscribes to updater events when running inside Electron', async () => {
    let availableCallback: any = null;
    let progressCallback: any = null;
    let downloadedCallback: any = null;

    window.electronAPI = {
      isElectron: true,
      platform: 'win32',
      getVersion: vi.fn().mockResolvedValue('2.0.0'),
      isPackaged: vi.fn().mockResolvedValue(true),
      checkForUpdates: vi.fn().mockResolvedValue({ success: true }),
      quitAndInstall: vi.fn().mockResolvedValue(undefined),
      onCheckingForUpdate: vi.fn().mockReturnValue(() => {}),
      onUpdateAvailable: vi.fn().mockImplementation((cb) => {
        availableCallback = cb;
        return () => {};
      }),
      onUpdateNotAvailable: vi.fn().mockReturnValue(() => {}),
      onUpdateProgress: vi.fn().mockImplementation((cb) => {
        progressCallback = cb;
        return () => {};
      }),
      onUpdateDownloaded: vi.fn().mockImplementation((cb) => {
        downloadedCallback = cb;
        return () => {};
      }),
      onUpdateError: vi.fn().mockReturnValue(() => {}),
      openExternal: vi.fn().mockResolvedValue(true),
    };

    const { result } = renderHook(() => useDesktopUpdater());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isElectron).toBe(true);

    // Simulate update available event
    act(() => {
      availableCallback?.({ version: '2.1.0' });
    });
    expect(result.current.status).toBe('available');
    expect(result.current.latestVersion).toBe('2.1.0');

    // Simulate progress event
    act(() => {
      progressCallback?.({ percent: 50, transferred: 5000, total: 10000, bytesPerSecond: 1000 });
    });
    expect(result.current.status).toBe('downloading');
    expect(result.current.progressPercent).toBe(50);

    // Simulate downloaded event
    act(() => {
      downloadedCallback?.({ version: '2.1.0' });
    });
    expect(result.current.status).toBe('downloaded');
    expect(result.current.progressPercent).toBe(100);
  });
});
