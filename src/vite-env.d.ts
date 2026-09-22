/// <reference types="vite/client" />

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

export interface ElectronUpdateInfo {
  version: string;
  releaseDate?: string;
}

export interface ElectronProgressInfo {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  getVersion: () => Promise<string>;
  isPackaged: () => Promise<boolean>;
  checkForUpdates: () => Promise<{ success: boolean; dev?: boolean; error?: string; result?: any }>;
  quitAndInstall: () => Promise<void>;
  onCheckingForUpdate: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: ElectronUpdateInfo) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: ElectronUpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (progress: ElectronProgressInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: ElectronUpdateInfo) => void) => () => void;
  onUpdateError: (callback: (error: { message: string }) => void) => () => void;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
