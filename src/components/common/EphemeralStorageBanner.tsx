import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';

export const EphemeralStorageBanner: React.FC = () => {
  const isEphemeralStorage = useCtfStore((s) => s.isEphemeralStorage);

  if (!isEphemeralStorage) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-500/15 border-b border-amber-500/40 text-amber-300 dark:text-amber-200 px-4 py-2 text-xs font-mono flex items-center justify-between z-50 transition-all"
    >
      <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <span>
          <strong className="font-bold text-amber-200 uppercase tracking-wide">Ephemeral Memory Fallback Active:</strong>{' '}
          Browser storage (IndexedDB / LocalStorage) is restricted or running in private browsing mode. All operational data is stored in memory and will not persist across browser restarts. Use <strong>Export Workspace (Ctrl+S)</strong> before closing.
        </span>
      </div>
    </div>
  );
};
