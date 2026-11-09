import React from 'react';
import { ArrowDownCircle } from 'lucide-react';
import { useDesktopUpdate } from '../../hooks/DesktopUpdateContext';
import { confirmAction } from '../../store/useConfirmStore';

/** Header icon shown on desktop once an update has finished downloading. */
export const UpdateReadyButton: React.FC = () => {
  const { isDesktop, status, latestVersion, quitAndInstall } = useDesktopUpdate();
  if (!isDesktop || status !== 'downloaded' || !latestVersion) return null;

  const label = `Update ready: version ${latestVersion}. Click to update and restart`;
  const onClick = async () => {
    const ok = await confirmAction({
      title: 'Update and restart?',
      body: `Version ${latestVersion} is ready. The app will close and reopen.`,
      confirmLabel: 'Update and restart',
    });
    if (ok) quitAndInstall();
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
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
