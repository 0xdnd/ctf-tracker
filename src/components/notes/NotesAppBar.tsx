import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CyberLogo } from '../common/CyberLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import { SettingsDropdown } from '../layout/SettingsDropdown';
import { useCtfStore } from '../../store/useCtfStore';
import { isTauriTarget } from '../../utils/runtimeTarget';

export interface NotesAppBarProps {
  /** Leaves the notes workspace for the tracker. */
  onBack: () => void;
  /** Phones: the notes ribbon moves into the bar instead of taking a column. */
  ribbon?: React.ReactNode;
}

/**
 * Slim app bar for the standalone Notes workspace. Same brand mark, height, border and icon buttons as the tracker
 * header, but only a way back, theme and settings: no timer, target, IP or Session.
 */
export const NotesAppBar: React.FC<NotesAppBarProps> = ({ onBack, ribbon }) => {
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const brand = (
    <>
      <CyberLogo size="sm" />
      <span className="hidden text-sm font-semibold tracking-tight text-primary sm:inline">
        ZERO<span className="text-accent">BOX</span>
      </span>
    </>
  );
  const brandClass = 'flex items-center gap-2 transition-opacity hover:opacity-90 active:scale-[0.97]';

  return (
    <header
      data-testid="notes-app-bar"
      className="z-40 flex h-[52px] flex-shrink-0 select-none items-center gap-2 whitespace-nowrap border-b border-subtle bg-surface-base px-2 font-sans sm:px-4"
    >
      {isTauriTarget() ? (
        <Link to="/tracker" className={brandClass} title="ZeroBox">
          {brand}
        </Link>
      ) : (
        <a href="/" className={brandClass} title="ZeroBox">
          {brand}
        </a>
      )}
      <span aria-hidden="true" className="h-4 flex-shrink-0 border-l border-strong max-sm:hidden" />
      <span className="text-sm font-medium text-secondary max-sm:hidden">Notes</span>
      <div className="flex min-w-0 flex-1 items-center">{ribbon}</div>
      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onBack}
          title="Back to the tracker"
          className="flex h-8 flex-shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-subtle px-2.5 text-xs font-medium text-secondary transition-interactive hover:border-strong hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] max-sm:w-8 max-sm:px-0 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="max-sm:sr-only">Back to app</span>
        </button>
        <ThemeToggle size="sm" soundEnabled={soundEnabled} className="flex-shrink-0" />
        <SettingsDropdown />
      </div>
    </header>
  );
};
