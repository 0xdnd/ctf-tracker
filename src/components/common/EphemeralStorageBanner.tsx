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
      className="bg-callout-warn-bg border-b border-callout-warn-border/40 text-callout-warn-fg px-4 py-2 text-xs font-sans flex items-center justify-between z-50 transition-colors"
    >
      <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full">
        <AlertTriangle className="w-4 h-4 text-callout-warn-fg shrink-0" />
        <span>
          <strong className="font-semibold text-callout-warn-fg">Ephemeral Memory Fallback Active:</strong>{' '}
          Browser storage (IndexedDB / LocalStorage) is restricted, or the browser is in private mode. All operational data is stored in memory and will not persist across browser restarts. Use <strong>Export Workspace (Ctrl+S)</strong> before closing.
        </span>
      </div>
    </div>
  );
};
