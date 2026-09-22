import { useState, useEffect, useCallback } from 'react';
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
  isElectron: boolean;
  status: UpdateStatus;
  version: string | null;
  latestVersion: string | null;
  progressPercent: number;
  errorMessage: string | null;
  checkForUpdates: () => Promise<void>;
  quitAndInstall: () => void;
}

export function useDesktopUpdater(): DesktopUpdaterState {
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [version, setVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

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
  }, [isElectron]);

  const checkForUpdates = useCallback(async () => {
    if (!isElectron || !window.electronAPI) return;
    setStatus('checking');
    setErrorMessage(null);
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
  }, [isElectron]);

  const quitAndInstall = useCallback(() => {
    if (!isElectron || !window.electronAPI) return;
    window.electronAPI.quitAndInstall();
  }, [isElectron]);

  return {
    isElectron,
    status,
    version,
    latestVersion,
    progressPercent,
    errorMessage,
    checkForUpdates,
    quitAndInstall,
  };
}
