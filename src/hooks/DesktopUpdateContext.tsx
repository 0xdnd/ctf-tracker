import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useDesktopUpdater, type DesktopUpdaterState } from './useDesktopUpdater';
import { useToastStore } from '../store/useToastStore';

export const AUTO_CHECK_DELAY_MS = 6000;

const noop = async () => {};

const WEB_DEFAULT: DesktopUpdaterState = {
  isElectron: false,
  isDesktop: false,
  status: 'idle',
  version: null,
  latestVersion: null,
  progressPercent: 0,
  errorMessage: null,
  retryTimeoutSeconds: null,
  checkForUpdates: noop,
  quitAndInstall: () => {},
};

const DesktopUpdateContext = createContext<DesktopUpdaterState>(WEB_DEFAULT);

/** Runs the updater once app-wide: a silent check shortly after launch, plus a notice when an update is ready. */
export const DesktopUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const updater = useDesktopUpdater();
  const { isDesktop, status, latestVersion, checkForUpdates, quitAndInstall } = updater;

  const checkRef = useRef(checkForUpdates);
  checkRef.current = checkForUpdates;
  const installRef = useRef(quitAndInstall);
  installRef.current = quitAndInstall;
  const notifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    const timer = setTimeout(() => {
      void checkRef.current().catch(() => {});
    }, AUTO_CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop || status !== 'downloaded' || !latestVersion) return;
    if (notifiedRef.current === latestVersion) return;
    notifiedRef.current = latestVersion;
    useToastStore.getState().addToast({
      type: 'info',
      title: 'Update ready',
      message: `Version ${latestVersion} is ready to install.`,
      durationMs: 0,
      action: { label: 'Update and restart', onClick: () => installRef.current() },
    });
  }, [isDesktop, status, latestVersion]);

  return <DesktopUpdateContext.Provider value={updater}>{children}</DesktopUpdateContext.Provider>;
};

export const useDesktopUpdate = (): DesktopUpdaterState => useContext(DesktopUpdateContext);
