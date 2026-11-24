import React from 'react';
import { ArrowDownCircle } from 'lucide-react';
import { useDesktopUpdate } from '../../hooks/DesktopUpdateContext';
import { useUpdateUiStore } from '../../store/useUpdateUiStore';

/** Header icon shown on Desktop or Web once an update is ready to install/reload. */
export const UpdateReadyButton: React.FC = () => {
  const { isDesktop, status, latestVersion } = useDesktopUpdate();
  const webUpdateWaiting = useUpdateUiStore((s) => s.webUpdateWaiting);
  const openUpdateAvailable = useUpdateUiStore((s) => s.openUpdateAvailable);

  const isDesktopReady = isDesktop && status === 'downloaded' && Boolean(latestVersion);
  if (!isDesktopReady && !webUpdateWaiting) return null;

  const label = isDesktopReady
    ? `Update ready: version ${latestVersion}. Click to update and restart`
    : 'Update ready: a new version of ZeroBox is available. Click to reload and update';

  return (
    <button
      type="button"
      onClick={openUpdateAvailable}
      title={label}
      aria-label={label}
      className="relative h-8 w-8 p-0 rounded-lg bg-transparent hover:bg-surface-hover border border-subtle hover:border-strong text-accent flex items-center justify-center transition-interactive active:scale-[0.97] flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
    >
      <ArrowDownCircle className="w-4 h-4" aria-hidden="true" />
      <span aria-hidden="true" className="absolute -top-1 -right-1 h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping motion-reduce:animate-none" />
        <span className="absolute inset-0 rounded-full bg-accent ring-2 ring-surface-base" />
      </span>
    </button>
  );
};
