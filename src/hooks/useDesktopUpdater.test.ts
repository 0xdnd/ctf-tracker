import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDesktopUpdater } from './useDesktopUpdater';
import * as tauriCore from '@tauri-apps/api/core';
import * as tauriApp from '@tauri-apps/api/app';
import * as tauriUpdater from '@tauri-apps/plugin-updater';
import * as tauriProcess from '@tauri-apps/plugin-process';
import * as ctfStore from '../store/useCtfStore';

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(() => false),
}));

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('2.0.0'),
}));

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../store/useCtfStore', () => ({
  checkpointTimerAndFlush: vi.fn(),
}));

describe('useDesktopUpdater hook', () => {
  const originalElectronAPI = window.electronAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriCore.isTauri).mockReturnValue(false);
  });

  afterEach(() => {
    window.electronAPI = originalElectronAPI;
  });

  it('initializes in web mode when running in standard browser', () => {
    delete (window as any).electronAPI;
    vi.mocked(tauriCore.isTauri).mockReturnValue(false);

    const { result } = renderHook(() => useDesktopUpdater());

    expect(result.current.isDesktop).toBe(false);
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
    expect(result.current.isDesktop).toBe(true);

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

  it('supports native Tauri v2 updater checking, downloading, and installing', async () => {
    delete (window as any).electronAPI;
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriApp.getVersion).mockResolvedValue('2.0.0');

    const mockInstall = vi.fn().mockResolvedValue(undefined);
    const mockDownload = vi.fn().mockImplementation(async (onEvent) => {
      onEvent({ event: 'Started', data: { contentLength: 1000 } });
      onEvent({ event: 'Progress', data: { chunkLength: 500 } });
      onEvent({ event: 'Finished' });
    });

    const mockUpdate = {
      version: '2.1.0',
      currentVersion: '2.0.0',
      download: mockDownload,
      install: mockInstall,
    };

    vi.mocked(tauriUpdater.check).mockResolvedValue(mockUpdate as any);

    const { result } = renderHook(() => useDesktopUpdater());

    // Flush getVersion
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isElectron).toBe(true);
    expect(result.current.version).toBe('2.0.0');

    // Trigger update check
    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(tauriUpdater.check).toHaveBeenCalledTimes(1);
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('downloaded');
    expect(result.current.latestVersion).toBe('2.1.0');
    expect(result.current.progressPercent).toBe(100);

    // Trigger install (flush grace period runs on a real timer)
    await act(async () => {
      result.current.quitAndInstall();
      await vi.waitFor(() => expect(tauriProcess.relaunch).toHaveBeenCalledTimes(1));
    });
    expect(mockInstall).toHaveBeenCalledTimes(1);
  });

  async function readyDownloadedUpdate(install: () => Promise<void>) {
    delete (window as any).electronAPI;
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriApp.getVersion).mockResolvedValue('2.0.0');
    vi.mocked(tauriUpdater.check).mockResolvedValue({
      version: '2.1.0',
      currentVersion: '2.0.0',
      download: vi.fn().mockResolvedValue(undefined),
      install,
    } as unknown as tauriUpdater.Update);

    const hook = renderHook(() => useDesktopUpdater());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await hook.result.current.checkForUpdates();
    });
    return hook;
  }

  it('persists state before install() and relaunches only after install completes', async () => {
    const order: string[] = [];
    vi.mocked(ctfStore.checkpointTimerAndFlush).mockImplementation(() => {
      order.push('flush');
    });
    vi.mocked(tauriProcess.relaunch).mockImplementation(async () => {
      order.push('relaunch');
    });
    const install = vi.fn().mockImplementation(async () => {
      order.push('install');
    });

    const { result } = await readyDownloadedUpdate(install);

    await act(async () => {
      result.current.quitAndInstall();
      await vi.waitFor(() => expect(tauriProcess.relaunch).toHaveBeenCalledTimes(1));
    });

    expect(order).toEqual(['flush', 'install', 'relaunch']);
    expect(result.current.status).toBe('downloaded');
  });

  it('surfaces a relaunch failure as the error state', async () => {
    vi.mocked(tauriProcess.relaunch).mockRejectedValueOnce(new Error('relaunch denied'));
    const install = vi.fn().mockResolvedValue(undefined);

    const { result } = await readyDownloadedUpdate(install);

    act(() => {
      result.current.quitAndInstall();
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.errorMessage).toBe('relaunch denied');
  });

  it('does not relaunch when install() fails', async () => {
    const install = vi.fn().mockRejectedValue(new Error('installer failed'));

    const { result } = await readyDownloadedUpdate(install);

    act(() => {
      result.current.quitAndInstall();
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.errorMessage).toBe('installer failed');
    expect(tauriProcess.relaunch).not.toHaveBeenCalled();
  });

  it('handles HTTP 429 rate limiting with structured error and 60s retry timeout', async () => {
    delete (window as any).electronAPI;
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriApp.getVersion).mockResolvedValue('2.0.0');

    vi.mocked(tauriUpdater.check).mockRejectedValue(new Error('GitHub API responded with 429 Too Many Requests'));

    const { result } = renderHook(() => useDesktopUpdater());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toContain('Rate limit reached (HTTP 429)');
    expect(result.current.retryTimeoutSeconds).toBe(60);
    expect(result.current.progressPercent).toBe(0);
  });

  it('handles HTTP 500 / 503 server errors with 30s retry timeout', async () => {
    delete (window as any).electronAPI;
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriApp.getVersion).mockResolvedValue('2.0.0');

    vi.mocked(tauriUpdater.check).mockRejectedValue(new Error('Remote server returned HTTP 503 Service Unavailable'));

    const { result } = renderHook(() => useDesktopUpdater());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toContain('Update server temporarily unavailable');
    expect(result.current.retryTimeoutSeconds).toBe(30);
  });

  it('handles mid-stream network drop, resets progress, and enforces 15s retry timeout', async () => {
    delete (window as any).electronAPI;
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriApp.getVersion).mockResolvedValue('2.0.0');

    const mockDownload = vi.fn().mockImplementation(async (onEvent) => {
      onEvent({ event: 'Started', data: { contentLength: 1000 } });
      onEvent({ event: 'Progress', data: { chunkLength: 950 } });
      throw new Error('Connection closed by remote peer (network timeout)');
    });

    const mockUpdate = {
      version: '2.1.0',
      currentVersion: '2.0.0',
      download: mockDownload,
      install: vi.fn(),
    };

    vi.mocked(tauriUpdater.check).mockResolvedValue(mockUpdate as any);

    const { result } = renderHook(() => useDesktopUpdater());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toContain('Network connection lost');
    expect(result.current.progressPercent).toBe(0); // Progress safely sanitized & reset
    expect(result.current.retryTimeoutSeconds).toBe(15);
  });
});
