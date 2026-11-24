import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Modal } from './Modal';
import { useDesktopUpdate } from '../../hooks/DesktopUpdateContext';
import { useUpdateUiStore } from '../../store/useUpdateUiStore';
import { APP_VERSION } from '../../utils/appVersion';
import { fetchReleaseManifest, parseReleaseNotesBullets } from '../../utils/whatsNewDiff';

const FALLBACK_BULLETS = [
  'Latest bug fixes, interface polish, and accessibility refinements.',
  'Updated machine catalog across HTB Active, Proving Grounds, and VulnHub.',
];

/**
 * Lazy-loaded Update Ready modal shared by both the Tauri Desktop updater and the Web Service Worker.
 */
export const UpdateAvailableModal: React.FC = () => {
  const open = useUpdateUiStore((s) => s.updateAvailableOpen);
  const close = useUpdateUiStore((s) => s.closeUpdateAvailable);
  const webUpdateWaiting = useUpdateUiStore((s) => s.webUpdateWaiting);
  const triggerWebReload = useUpdateUiStore((s) => s.triggerWebReload);

  const { isDesktop, status, version, latestVersion, releaseNotes, quitAndInstall } = useDesktopUpdate();
  const isDesktopReady = isDesktop && status === 'downloaded' && Boolean(latestVersion);
  const [webHighlights, setWebHighlights] = useState<string[]>([]);

  useEffect(() => {
    if (!open || isDesktopReady || !webUpdateWaiting) return;
    let live = true;
    void fetchReleaseManifest(true).then((manifest) => {
      if (live && manifest?.highlights?.length) {
        setWebHighlights(manifest.highlights.slice(0, 4));
      }
    });
    return () => {
      live = false;
    };
  }, [open, isDesktopReady, webUpdateWaiting]);

  const desktopBullets = isDesktopReady ? parseReleaseNotesBullets(releaseNotes, 5) : [];
  const bullets =
    desktopBullets.length > 0
      ? desktopBullets
      : webHighlights.length > 0
        ? webHighlights
        : FALLBACK_BULLETS;

  const currentVer = version || APP_VERSION;
  const heading = isDesktopReady
    ? `ZeroBox v${latestVersion} is ready`
    : 'A new ZeroBox update is ready';
  const primaryLabel = isDesktopReady ? 'Update and restart' : 'Reload to update';

  const handlePrimary = () => {
    close();
    if (isDesktopReady) {
      quitAndInstall();
    } else if (webUpdateWaiting) {
      triggerWebReload();
    }
  };

  return (
    <Modal
      open={open && (isDesktopReady || webUpdateWaiting)}
      onClose={close}
      labelledBy="update-available-title"
      size="md"
      panelClassName="text-primary"
    >
      <div className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-subtle bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="update-available-title" className="text-sm font-semibold text-primary">
                {heading}
              </h2>
              <p className="text-[11px] text-muted">
                {isDesktopReady
                  ? `Desktop update · v${currentVer} → v${latestVersion}`
                  : `Web app update · currently v${currentVer}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close update notice"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 p-4 text-xs">
          <div className="rounded-xl border border-subtle bg-surface-sunken p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>Highlights in this update</span>
            </div>
            <ul className="space-y-1.5 text-secondary leading-relaxed">
              {bullets.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-callout-success-border/40 bg-callout-success-bg px-3 py-2 text-[11px] text-callout-success-fg">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Your local targets, notes, credentials, and progress are flushed automatically before restarting.</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-subtle bg-surface-card px-4 py-3">
          <button
            type="button"
            onClick={close}
            className="h-9 cursor-pointer rounded-lg border border-subtle bg-surface-sunken px-3.5 text-xs font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-semibold text-on-accent transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{primaryLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

