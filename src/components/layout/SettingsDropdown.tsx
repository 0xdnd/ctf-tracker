import React, { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';
import { useLocation } from 'react-router-dom';
import { afterFirstPaint } from '../../utils/afterFirstPaint';
import { ImportLimitError, assertJsonFileWithinLimit } from '../../utils/importLimits';

// The open menu is only needed once the button is used, so it loads as its own chunk. The request starts after the
// first paint has settled, so the menu is usually ready by the time the button is tapped.
const loadSettingsDropdownMenu = () => import('./SettingsDropdownMenu');
const SettingsDropdownMenu = React.lazy(loadSettingsDropdownMenu);

export const SettingsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { soundEnabled, importWorkspace, unexportedChangesCount } = useCtfStore(
    useShallow((s) => ({
      soundEnabled: s.soundEnabled,
      importWorkspace: s.importWorkspace,
      unexportedChangesCount: s.unexportedChangesCount,
    }))
  );

  useEffect(() => {
    let live = true;
    void afterFirstPaint().then(() => {
      if (live) void loadSettingsDropdownMenu();
    });
    return () => {
      live = false;
    };
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Close dropdown on route change
  const location = useLocation();
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      assertJsonFileWithinLimit(file);
    } catch (err) {
      if (err instanceof ImportLimitError) toast.error(err.message, 'File too large to import');
      e.target.value = '';
      setIsOpen(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importWorkspace(content);
        if (res.success) {
          if (soundEnabled) playCyberSound('root');
          toast.success(`Workspace restored successfully! ${res.count ?? 0} targets loaded.`, 'Workspace Restored');
        } else {
          toast.error(`Failed to import workspace: ${res.error}`, 'Import Failed');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setIsOpen(false);
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Settings trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (soundEnabled) playCyberSound('click');
        }}
        className={`h-8 w-8 rounded-lg border flex items-center justify-center group relative cursor-pointer transition-interactive active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 ${
          isOpen
            ? 'bg-surface-hover text-primary border-strong'
            : 'bg-transparent border-subtle text-secondary hover:bg-surface-hover hover:text-primary hover:border-strong'
        }`}
        title="Settings & Workspace Utilities"
        data-tour="settings-menu"
        aria-label="Settings and options"
      >
        <Settings className="w-3.5 h-3.5 stroke-[1.8]" />
        {unexportedChangesCount > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-callout-warn-fg rounded-full border border-surface-base" />
        )}
      </button>

      {/* Hidden file input for 1-click workspace JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Choose workspace JSON file to import"
        accept=".json"
        className="hidden"
        onChange={handleJsonImport}
      />

      {isOpen && (
        <React.Suspense fallback={null}>
          <SettingsDropdownMenu onClose={() => setIsOpen(false)} onPickFile={() => fileInputRef.current?.click()} />
        </React.Suspense>
      )}
    </div>
  );
};
