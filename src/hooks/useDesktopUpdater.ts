import { useState, useEffect, useCallback, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getVersion as getTauriVersion } from '@tauri-apps/api/app';
import { check as checkTauriUpdate, type Update } from '@tauri-apps/plugin-updater';
import type { ElectronUpdateInfo, ElectronProgressInfo } from '../vite-env';

export type UpdateStatus = 
  | 'idle' 
  | 'checking' 
  | 'available' 
  | 'downloading' 
  | 'downloaded' 
  | 'not-available' 
  | 'error';

export interface DesktopUpdaterState {
  /** True if running inside any desktop container (Tauri or Electron). Kept for backwards UI compatibility. */
  isElectron: boolean;
  /** True if running inside any desktop container (Tauri or Electron) */
  isDesktop: boolean;
  status: UpdateStatus;
  version: string | null;
  latestVersion: string | null;
  progressPercent: number;
  errorMessage: string | null;
  retryTimeoutSeconds: number | null;
  checkForUpdates: () => Promise<void>;
  quitAndInstall: () => void;
}

function detectIsTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (typeof isTauri === 'function' && isTauri()) ||
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).isTauri
  );
}

function detectIsElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

export function useDesktopUpdater(): DesktopUpdaterState {
  const isTauriApp = detectIsTauri();
  const isElectron = detectIsElectron();
  const isDesktop = isTauriApp || isElectron;

  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [version, setVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryTimeoutSeconds, setRetryTimeoutSeconds] = useState<number | null>(null);

  const pendingUpdateRef = useRef<Update | null>(null);

  // Initialize desktop version & listeners
  useEffect(() => {
    if (!isDesktop) return;

    if (isTauriApp) {
      getTauriVersion()
        .then((ver) => setVersion(ver))
        .catch(() => setVersion('2.0.0'));
      return;
    }

    if (isElectron && window.electronAPI) {
      window.electronAPI.getVersion().then((ver: string) => setVersion(ver)).catch(() => {});

      const cleanups: (() => void)[] = [];

      cleanups.push(
        window.electronAPI.onCheckingForUpdate(() => {
          setStatus('checking');
          setErrorMessage(null);
        })
      );

      cleanups.push(
        window.electronAPI.onUpdateAvailable((info: ElectronUpdateInfo) => {
          setStatus('available');
          setLatestVersion(info.version);
        })
      );

      cleanups.push(
        window.electronAPI.onUpdateNotAvailable(() => {
          setStatus('not-available');
        })
      );

      cleanups.push(
        window.electronAPI.onUpdateProgress((progress: ElectronProgressInfo) => {
          setStatus('downloading');
          setProgressPercent(progress.percent);
        })
      );

      cleanups.push(
        window.electronAPI.onUpdateDownloaded((info: ElectronUpdateInfo) => {
          setStatus('downloaded');
          setLatestVersion(info.version);
          setProgressPercent(100);
        })
      );

      cleanups.push(
        window.electronAPI.onUpdateError((err: { message: string }) => {
          setStatus('error');
          setErrorMessage(err.message);
        })
      );

      return () => {
        cleanups.forEach((c) => c());
      };
    }
  }, [isDesktop, isTauriApp, isElectron]);

  const checkForUpdates = useCallback(async () => {
    if (!isDesktop) return;

    setStatus('checking');
    setErrorMessage(null);
    setRetryTimeoutSeconds(null);

    if (isTauriApp) {
      try {
        const update = await checkTauriUpdate();
        if (update) {
          pendingUpdateRef.current = update;
          setLatestVersion(update.version);
          setStatus('available');

          // Download the update chunk-by-chunk and monitor progress
          setStatus('downloading');
          let downloaded = 0;
          let total = 0;

          await update.download((event) => {
            if (event.event === 'Started') {
              total = event.data.contentLength || 0;
              setProgressPercent(0);
            } else if (event.event === 'Progress') {
              downloaded += event.data.chunkLength;
              if (total > 0) {
                setProgressPercent(Math.min(100, Math.round((downloaded / total) * 100)));
              }
            } else if (event.event === 'Finished') {
              setProgressPercent(100);
            }
          });

          setStatus('downloaded');
        } else {
          setStatus('not-available');
        }
      } catch (e: any) {
        pendingUpdateRef.current = null;
        setProgressPercent(0);
        setStatus('error');
        const rawErr = e?.message || String(e || '');
        if (rawErr.includes('429')) {
          setErrorMessage('Rate limit reached (HTTP 429). Please wait before checking again.');
          setRetryTimeoutSeconds(60);
        } else if (rawErr.includes('500') || rawErr.includes('502') || rawErr.includes('503')) {
          setErrorMessage('Update server temporarily unavailable (HTTP 500/502/503).');
          setRetryTimeoutSeconds(30);
        } else if (rawErr.toLowerCase().includes('signature')) {
          setErrorMessage('Signature verification failed. Update package rejected for security.');
          setRetryTimeoutSeconds(null);
        } else if (rawErr.toLowerCase().includes('network') || rawErr.toLowerCase().includes('connection')) {
          setErrorMessage('Network connection lost during update download.');
          setRetryTimeoutSeconds(15);
        } else {
          setErrorMessage(rawErr || 'Update check failed');
          setRetryTimeoutSeconds(null);
        }
      }
      return;
    }

    if (isElectron && window.electronAPI) {
      try {
        const res = await window.electronAPI.checkForUpdates();
        if (!res.success && res.error) {
          setStatus('error');
          setErrorMessage(res.error);
        }
      } catch (e: any) {
        setStatus('error');
        setErrorMessage(e?.message || 'Check failed');
      }
    }
  }, [isDesktop, isTauriApp, isElectron]);

  const quitAndInstall = useCallback(() => {
    if (!isDesktop) return;

    if (isTauriApp && pendingUpdateRef.current) {
      pendingUpdateRef.current.install().catch((err: any) => {
        console.error('[ZeroBox Desktop] Update installation failed:', err);
        setStatus('error');
        setErrorMessage(err?.message || 'Installation failed');
      });
      return;
    }

    if (isElectron && window.electronAPI) {
      window.electronAPI.quitAndInstall();
    }
  }, [isDesktop, isTauriApp, isElectron]);

  return {
    isElectron: isDesktop,
    isDesktop,
    status,
    version,
    latestVersion,
    progressPercent,
    errorMessage,
    retryTimeoutSeconds,
    checkForUpdates,
    quitAndInstall,
  };
}
