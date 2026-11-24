import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { isTargetFocusPath } from '../../utils/fullscreenRoutes';
import { useEngageTarget } from '../../hooks/useEngageTarget';
import { useTargetIpField } from '../../hooks/useTargetIpField';
import { useCtfStore } from '../../store/useCtfStore';
import { isPlaceholderIp } from '../../utils/ipInput';
import { useShallow } from 'zustand/react/shallow';
import { Crosshair, ChevronDown, X, Search, Copy, Check, User } from 'lucide-react';
import { isTauriTarget } from '../../utils/runtimeTarget';
import { CyberLogo } from '../common/CyberLogo';
import { PlatformIcon } from '../common/PlatformBadge';
import { playCyberSound } from '../../utils/helpers';
import { SettingsDropdown } from './SettingsDropdown';
import { SessionDropdown } from './SessionDropdown';
import type { SessionField } from './SessionPanel';
import { useCopyFlash } from './useCopyFlash';
import { ThemeToggle } from '../common/ThemeToggle';
import { UpdateReadyButton } from './UpdateReadyButton';
import { ExamHeaderCapsule } from '../exam/ExamHeaderCapsule';
import { useAuthStore } from '../../store/useAuthStore';
import { getAvatarSvgDataUri } from '../../data/avatarPresets';
import { useTrackerCounts } from '../../hooks/useTrackerCounts';

/**
 * The app top bar. Always on screen: brand, exam clock, the engaged target, a one-click RHOST copy chip, search,
 * theme, profile and settings. Everything else (LHOST / LPORT, stopwatch, flag shortcuts, quick tools) lives in the
 * lazily loaded Session popover behind one button. Labels shrink with `min-w-0 truncate`; there are no per-breakpoint
 * show/hide ladders for the main controls.
 */
export const UnifiedHeader: React.FC = () => {
  const engage = useEngageTarget();
  const focusPage = isTargetFocusPath(useLocation().pathname);

  const { activeTargetId, setActiveTarget, machines, soundEnabled, setCommandPaletteOpen } = useCtfStore(
    useShallow((s) => ({
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      machines: s.machines,
      soundEnabled: s.soundEnabled,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
    }))
  );

  const user = useAuthStore((s) => s.user);
  const setOperatorProfileModalOpen = useAuthStore((s) => s.setOperatorProfileModalOpen);

  const { totalMachines, rootedMachines: operatorRootedCount } = useTrackerCounts(machines);

  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionField, setSessionField] = useState<SessionField | undefined>(undefined);
  const { displayIp: displayTargetIp } = useTargetIpField();
  // Placeholder values read as an empty field with a "set" prompt, not as a fake address.
  const targetShown = isPlaceholderIp(displayTargetIp) ? '' : displayTargetIp;
  const { copied, copy } = useCopyFlash();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const targetPopoverRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({ top: 54, left: 0 });

  const handleSessionOpenChange = useCallback((next: boolean) => {
    setSessionOpen(next);
    if (!next) setSessionField(undefined);
  }, []);

  const activeMachine = useMemo(() => {
    if (!activeTargetId) return null;
    return machines.find((m) => m.id === activeTargetId) || null;
  }, [activeTargetId, machines]);

  // Filter machines for target selector dropdown
  const filteredTargets = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return machines.slice(0, 10);
    return machines
      .filter((m) => m.name.toLowerCase().includes(q) || m.ip.includes(q))
      .slice(0, 10);
  }, [machines, targetSearch]);

  // Anchor portaled Target Selector popover below trigger
  useLayoutEffect(() => {
    if (!targetDropdownOpen || !dropdownRef.current) return;
    const updatePosition = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const maxLeft = Math.max(8, window.innerWidth - 296);
      setPopoverCoords({
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.left), maxLeft),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [targetDropdownOpen]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!targetPopoverRef.current || !targetPopoverRef.current.contains(target))
      ) {
        setTargetDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTargetDropdownOpen(false);
      }
    };
    if (targetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetDropdownOpen]);

  const iconBtn =
    'h-8 w-8 p-0 rounded-lg border border-subtle hover:border-strong text-secondary hover:text-primary text-xs font-medium flex flex-shrink-0 items-center justify-center transition-interactive active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';

  const brand = (
      <div className="flex items-center flex-shrink-0">
        {isTauriTarget() ? (
          <Link to="/tracker" className="flex items-center gap-2 group transition-opacity hover:opacity-90 active:scale-[0.97]" title="ZeroBox">
            <CyberLogo size="sm" />
            <div className="hidden sm:flex flex-col text-left leading-none" data-tauri-drag-region="false">
              <span className="font-semibold text-sm tracking-tight text-primary">
                ZERO<span className="text-accent">BOX</span>
              </span>
            </div>
          </Link>
        ) : (
          <a href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90 active:scale-[0.97]" title="ZeroBox">
            <CyberLogo size="sm" />
            <div className="hidden sm:flex flex-col text-left leading-none" data-tauri-drag-region="false">
              <span className="font-semibold text-sm tracking-tight text-primary">
                ZERO<span className="text-accent">BOX</span>
              </span>
            </div>
          </a>
        )}
      </div>
  );

  const headerClass =
    'h-[52px] px-1.5 sm:px-4 gap-1.5 sm:gap-2 bg-surface-base border-b border-subtle flex items-center font-sans select-none z-40 transition-colors flex-shrink-0 whitespace-nowrap overflow-hidden';

  // Target focus page: only the brand and the exam clock stay (the page owns "Exit focus").
  if (focusPage) {
    return (
      <header data-testid="app-header" data-tauri-drag-region="true" className={headerClass}>
        {brand}
        <div className="flex min-w-0 flex-1 items-center" data-tauri-drag-region="false">
          <ExamHeaderCapsule />
        </div>
      </header>
    );
  }

  return (
    <header
      data-testid="app-header"
      data-tauri-drag-region="true"
      className="h-[52px] px-1.5 sm:px-4 gap-1.5 sm:gap-2 bg-surface-base border-b border-subtle flex items-center font-sans select-none z-40 transition-colors flex-shrink-0 whitespace-nowrap overflow-hidden"
    >
      {/* 1. Brand */}
      {brand}

      {/* 2. Exam clock, engaged target and the RHOST copy chip. This group takes the spare width and shrinks first. */}
      <div className="relative flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2" ref={dropdownRef} data-tauri-drag-region="false">
        <ExamHeaderCapsule />
        {activeMachine ? (
          <div className="flex h-8 min-w-0 items-center gap-1 overflow-hidden rounded-lg border border-subtle bg-surface-card pl-2 pr-0.5 text-xs machined-edge max-sm:pl-1.5">
            <PlatformIcon platform={activeMachine.platform} className="w-3.5 h-3.5 flex-shrink-0 max-sm:hidden" />
            <Link
              to={`/target/${activeMachine.id}`}
              className="inline-flex min-h-6 min-w-6 flex-shrink items-center truncate font-semibold max-sm:min-w-0 text-primary transition-colors hover:text-accent"
              title="View Target Command Center"
            >
              <span className="min-w-0 truncate">{activeMachine.name}</span>
            </Link>
            <button
              type="button"
              onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
              className="inline-flex min-h-6 min-w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
              title="Switch Active Target"
              aria-label="Switch Active Target"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${targetDropdownOpen ? 'rotate-180 text-accent' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTarget(null);
                if (soundEnabled) playCyberSound('click');
              }}
              className="inline-flex min-h-6 min-w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-muted transition-colors max-sm:hidden hover:bg-callout-danger-bg hover:text-callout-danger-fg active:scale-[0.97]"
              title={`Disengage ${activeMachine.name} — Release active engagement`}
              aria-label="Disengage Active Target"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
            aria-label="Engage target"
            className="group flex h-8 min-w-0 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-subtle bg-surface-card px-2.5 text-xs font-medium text-secondary transition-[transform,background-color,border-color,color] hover:border-strong hover:text-primary active:scale-[0.97]"
          >
            <Crosshair className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
            <span className="max-sm:hidden">Engage target</span>
            <ChevronDown className={`w-3 h-3 text-muted group-hover:text-accent transition-transform ${targetDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* RHOST: one click copies; when none is set it opens the Session popover on the RHOST field. */}
        {targetShown ? (
          <button
            type="button"
            onClick={() => copy(targetShown, 'target')}
            className="group inline-flex h-8 min-w-20 shrink-[2] cursor-pointer items-center gap-1.5 rounded-lg border border-subtle bg-surface-sunken px-2 text-xs transition-interactive hover:border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] max-sm:hidden [@media(pointer:coarse)]:h-11"
            title={copied === 'target' ? 'Copied Target IP to clipboard!' : 'Copy Target IP (RHOST)'}
            aria-label={`Copy RHOST ${targetShown}`}
          >
            <span className="flex-shrink-0 text-[11px] font-medium text-muted">RHOST</span>{' '}
            <span className="min-w-0 truncate font-mono text-xs font-semibold tabular-nums text-primary">{targetShown}</span>
            {copied === 'target' ? (
              <Check className="w-3 h-3 flex-shrink-0 text-callout-success-fg" aria-hidden="true" />
            ) : (
              <Copy className="w-3 h-3 flex-shrink-0 text-muted group-hover:text-primary" aria-hidden="true" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSessionField('rhost');
              setSessionOpen(true);
            }}
            className="inline-flex h-8 min-w-0 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-callout-warn-border/60 bg-surface-sunken px-2 text-xs font-medium text-secondary transition-interactive hover:border-strong hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] max-sm:hidden [@media(pointer:coarse)]:h-11"
            title="Set the target IP (RHOST)"
          >
            <span>Set RHOST</span>
          </button>
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {copied === 'target' ? 'Copied Target IP to clipboard' : ''}
        </span>

        {/* Target selector popover (portaled out of overflow-hidden header) */}
        {targetDropdownOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={targetPopoverRef}
              style={{ top: popoverCoords.top, left: popoverCoords.left }}
              className="fixed w-72 p-2.5 rounded-xl bg-surface-elevated border border-subtle shadow-xl machined-edge z-popover font-sans text-xs space-y-2"
            >
              <div className="text-[11px] text-muted px-1 font-medium flex items-center justify-between">
                <span>Engage target</span>
                <span className="text-secondary font-mono tabular-nums">{totalMachines} total</span>
              </div>
              <input
                type="text"
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                placeholder="Search target name or IP..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-sunken border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent tabular-nums"
                // eslint-disable-next-line jsx-a11y/no-autofocus -- search field in a dropdown the user just opened
                autoFocus
              />
              {activeTargetId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTarget(null);
                    setTargetDropdownOpen(false);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="w-full p-1.5 rounded-lg bg-callout-danger-bg border border-callout-danger-border/30 flex items-center justify-center gap-1.5 text-callout-danger-fg text-[11px] font-medium transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Disengage target</span>
                </button>
              )}
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filteredTargets.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setTargetDropdownOpen(false);
                      engage(m.id);
                    }}
                    className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-colors text-xs cursor-pointer ${
                      activeTargetId === m.id
                        ? 'bg-surface-hover border border-strong text-primary font-semibold'
                        : 'hover:bg-surface-hover text-secondary border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <PlatformIcon platform={m.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium truncate">{m.name}</span>
                    </div>
                    {m.ip && !isPlaceholderIp(m.ip) && (
                      <span className="text-[10px] text-muted font-mono tabular-nums flex-shrink-0">{m.ip}</span>
                    )}
                  </button>
                ))}
                {filteredTargets.length === 0 && (
                  <div className="text-center py-2 text-muted text-[11px]">No targets matching query</div>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>

      {/* 3. Session popover, search, theme, profile and settings */}
      <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-1.5" data-tauri-drag-region="false">
        <SessionDropdown open={sessionOpen} onOpenChange={handleSessionOpenChange} initialField={sessionField} />

        <button
          type="button"
          onClick={() => {
            setCommandPaletteOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className={`${iconBtn} bg-surface-sunken hover:bg-surface-hover max-sm:hidden`}
          title="Open Command Palette (Ctrl+K)"
          data-tour="command-palette"
          aria-label="Search Ctrl+K, open command palette"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        </button>

        <UpdateReadyButton />

        {/* Theme toggle moves into MobileNavDrawer / Settings on phones (<640px) so the engaged target chip has room during exams */}
        <ThemeToggle size="sm" soundEnabled={soundEnabled} className="flex-shrink-0 max-sm:hidden" />

        {/* Operator profile (phones reach it from the menu drawer, which frees room for the target name) */}
        <button
          type="button"
          onClick={() => {
            setOperatorProfileModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className={`${iconBtn} overflow-hidden bg-transparent hover:bg-surface-hover group max-sm:hidden`}
          title={`Profile: ${user?.callsign || user?.name || 'Local profile'} (${user?.role || 'Offline Mode'}). Click to switch or log in (Alt+O)`}
          aria-label={`Profile: ${user?.callsign || user?.name || 'Local profile'} · ${operatorRootedCount} rooted. Open profile (Alt+O)`}
        >
          {user?.avatarId ? (
            <img
              src={getAvatarSvgDataUri(user.avatarId)}
              alt=""
              aria-hidden="true"
              className="w-full h-full rounded-[7px] bg-surface-inverse object-contain p-0.5"
            />
          ) : (
            <User className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Settings & workspace menu */}
        <SettingsDropdown />
      </div>
    </header>
  );
};
