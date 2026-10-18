import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { confirmAction } from '../../store/useConfirmStore';
import {
  listPreMigrationBackups,
  restorePreMigrationBackup,
  type PreMigrationBackupSummary,
} from '../../store/preMigrationBackup';

const formatSize = (chars: number) =>
  chars >= 1024 * 1024 ? `${(chars / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(chars / 1024))} KB`;

interface PreUpdateSnapshotsProps {
  /** True while a confirmed restore is running (the parent blocks closing until it settles). */
  onBusyChange?: (busy: boolean) => void;
}

/**
 * "Restore pre-update snapshot" list. Renders nothing until a snapshot exists. The restore itself lives in
 * preMigrationBackup (module scope), so it completes even if this component unmounts mid-flight.
 */
export default function PreUpdateSnapshots({ onBusyChange }: PreUpdateSnapshotsProps = {}) {
  const [snapshots, setSnapshots] = useState<PreMigrationBackupSummary[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listPreMigrationBackups()
      .then((list) => {
        if (alive) setSnapshots(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (snapshots.length === 0) return null;

  const handleRestore = async (snap: PreMigrationBackupSummary) => {
    const when = new Date(snap.createdAt).toLocaleString();
    const preSync = snap.reason === 'pre-sync';
    const ok = await confirmAction({
      title: preSync ? 'Restore pre-sync snapshot?' : 'Restore pre-update snapshot?',
      body: `This replaces your tracker data (all profiles) with the copy saved on ${when}, ${
        preSync ? 'right before a sync file was merged' : 'before ZeroBox updated its data format'
      }. Changes made since then are replaced; a safety copy of your current data is kept first.${
        preSync
          ? ' Writeups that were kept only in IndexedDB are restored too. Notes the merge added to your private notes vault are not removed.'
          : ''
      } Close other ZeroBox tabs first, because older tabs do not know about the restore lock. The app reloads afterwards.`,
      confirmLabel: 'Restore snapshot',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyKey(snap.key);
    onBusyChange?.(true);
    let restored = false;
    try {
      restored = await restorePreMigrationBackup(snap.key);
    } finally {
      // On success the page is reloading: stay busy so nothing can be closed or clicked in the meantime.
      if (!restored) {
        setBusyKey(null);
        onBusyChange?.(false);
      }
    }
  };

  return (
    <div className="p-3.5 rounded-lg border border-subtle bg-surface-sunken space-y-2">
      <div className="flex items-center gap-2 text-primary">
        <History className="w-4 h-4 text-muted" />
        <span className="font-semibold">Restore pre-update snapshot</span>
      </div>
      <p className="text-muted text-[11px]">
        Saved automatically right before ZeroBox upgraded your stored data or merged a sync file.
      </p>
      <ul className="space-y-1.5">
        {snapshots.map((snap) => (
          <li key={snap.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-secondary">
              <span className="font-medium text-primary">{snap.reason === 'pre-sync' ? 'Before sync merge' : 'Before update'}</span>
              {' · '}
              {new Date(snap.createdAt).toLocaleString()}
              {snap.reason === 'pre-sync' ? '' : ` · v${snap.fromVersion}`} · {formatSize(snap.bytes)}
            </span>
            <button
              type="button"
              onClick={() => handleRestore(snap)}
              disabled={busyKey !== null}
              className="px-2.5 py-1 max-sm:py-2.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-primary font-medium transition-colors disabled:opacity-50"
            >
              {busyKey === snap.key ? 'Restoring…' : 'Restore'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
