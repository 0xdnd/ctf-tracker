import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Flag,
  KeyRound,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  ShieldAlert,
  Terminal,
  Zap,
} from 'lucide-react';
import type { Credential } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useTargetIpField } from '../../hooks/useTargetIpField';
import { useOpenTabCount } from '../../hooks/useOpenTabCount';
import { isPlaceholderIp } from '../../utils/ipInput';
import { formatSeconds, playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { type CopyKey, useCopyFlash } from './useCopyFlash';

export type SessionField = 'lhost' | 'rhost';

export interface SessionPanelPosition {
  top: number;
  left: number;
  width: number;
  /** Horizontal transform origin, measured from the panel's own left edge (the trigger's centre). */
  originX: number;
}

interface SessionPanelProps {
  position: SessionPanelPosition;
  panelRef: React.RefObject<HTMLDivElement>;
  /** Field that takes focus on open; without one, a fine pointer lands on LHOST and a touch screen on the panel itself. */
  initialField?: SessionField;
  /** Opened from the keyboard: no entrance animation. */
  instant: boolean;
  /** Closes the panel; `restoreFocus` returns focus to the trigger. */
  onClose: (restoreFocus: boolean) => void;
}

const FIELD_IDS = {
  lhost: 'unified-lhost',
  rhost: 'unified-target-ip',
  lport: 'unified-lport',
  domain: 'unified-domain',
  dcIp: 'unified-dc-ip',
  user: 'unified-user',
  cred: 'unified-cred',
} as const;

const COPY_ANNOUNCEMENTS: Record<CopyKey, string> = {
  lhost: 'LHOST',
  lport: 'LPORT',
  target: 'Target IP',
  domain: 'DOMAIN',
  dcIp: 'DC IP',
  user: 'USER',
  cred: 'PASS',
};

const TimerDisplay: React.FC = React.memo(() => {
  const seconds = useCtfStore((s) => s.activeTimerSeconds);
  return <span className="font-mono text-sm font-semibold tabular-nums text-primary">{formatSeconds(seconds)}</span>;
});

const labelCls = 'w-12 shrink-0 text-[11px] font-medium text-muted';
const inputCls =
  'h-8 min-w-0 flex-1 rounded-lg border border-subtle bg-surface-sunken px-2 font-mono text-xs font-semibold tabular-nums text-primary placeholder:font-sans placeholder:font-normal placeholder:text-muted focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11';
const iconBtnCls =
  'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-interactive hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';
const actionBtnCls =
  'inline-flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-subtle px-2.5 text-xs font-medium transition-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] [@media(pointer:coarse)]:h-11';
const rowBtnCls =
  'flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11';
const groupLabelCls = 'px-1 pb-1 text-[11px] font-medium text-muted';

/** The open Session popover: attacker variables, stopwatch, flag shortcuts and quick tools. Loaded the first time it opens. */
const SessionPanel: React.FC<SessionPanelProps> = ({ position, panelRef, initialField, instant, onClose }) => {
  const {
    activeTargetId,
    machines,
    credentials,
    updateMachine,
    globalVars,
    setGlobalVars,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    soundEnabled,
    setRevShellModalOpen,
    setSnippetsDrawerOpen,
    setNewMachineModalOpen,
    setReconAutomationModalOpen,
    setReportMachineId,
  } = useCtfStore(
    useShallow((s) => ({
      activeTargetId: s.activeTargetId,
      machines: s.machines,
      credentials: s.credentials,
      updateMachine: s.updateMachine,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      isTimerRunning: s.isTimerRunning,
      startTimer: s.startTimer,
      pauseTimer: s.pauseTimer,
      resetTimer: s.resetTimer,
      soundEnabled: s.soundEnabled,
      setRevShellModalOpen: s.setRevShellModalOpen,
      setSnippetsDrawerOpen: s.setSnippetsDrawerOpen,
      setNewMachineModalOpen: s.setNewMachineModalOpen,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      setReportMachineId: s.setReportMachineId,
    })),
  );
  const isNotesOpen = useNotesWorkspaceStore((s) => s.isOpen);
  const toggleNotesWorkspace = useNotesWorkspaceStore((s) => s.toggleOpen);
  const openNotesCount = useOpenTabCount();
  const { displayIp, commit: commitTargetIp } = useTargetIpField();
  const { copied, copy, reset } = useCopyFlash();

  const activeMachine = useMemo(
    () => (activeTargetId ? machines.find((m) => m.id === activeTargetId) ?? null : null),
    [activeTargetId, machines],
  );
  const targetVaultCreds = useMemo(() => {
    if (!activeMachine) return [];
    return credentials
      .filter((c) => c.sourceMachineId === activeMachine.id || Boolean(c.verifications?.[activeMachine.id]))
      .slice(0, 4);
  }, [activeMachine, credentials]);

  const filledCredCount = useMemo(
    () =>
      [globalVars.domain, globalVars.dcIp, globalVars.user, globalVars.cred].filter((v) => Boolean(v && v.trim())).length,
    [globalVars.domain, globalVars.dcIp, globalVars.user, globalVars.cred],
  );
  const [credsOpen, setCredsOpen] = useState(filledCredCount > 0);
  const [showCred, setShowCred] = useState(false);

  const lhostShown = isPlaceholderIp(globalVars.lhost) ? '' : globalVars.lhost;
  const targetShown = isPlaceholderIp(displayIp) ? '' : displayIp;
  // Draft while typing in RHOST; committed on blur or Enter (updateMachine bumps the unexported-change counter).
  const [targetDraft, setTargetDraft] = useState<string | null>(null);
  const flushDraftRef = useRef<() => void>(() => {});
  flushDraftRef.current = () => {
    if (targetDraft === null) return;
    commitTargetIp(targetDraft);
    setTargetDraft(null);
  };

  // Focus moves into the panel on open.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const field = initialField ?? (coarse ? null : 'lhost');
    const input = field ? panel.querySelector<HTMLInputElement>(`#${FIELD_IDS[field]}`) : null;
    (input ?? panel).focus({ preventScroll: true });
  }, [initialField, panelRef]);

  // A half-typed RHOST is saved when the panel goes away.
  useEffect(() => () => flushDraftRef.current(), []);

  const click = () => {
    if (soundEnabled) playCyberSound('click');
  };
  /** Runs a tool and hands focus back to the trigger first, so a modal that opens restores it there on close. */
  const runTool = (fn: () => void) => {
    onClose(true);
    fn();
    click();
  };

  const userDone = Boolean(
    activeMachine &&
      (activeMachine.userPwnedAt || activeMachine.userFlag || ['foothold', 'root', 'completed'].includes(activeMachine.status)),
  );
  const rootDone = Boolean(
    activeMachine && (activeMachine.rootPwnedAt || activeMachine.rootFlag || ['root', 'completed'].includes(activeMachine.status)),
  );

  const toggleUser = () => {
    if (!activeMachine) return;
    const now = new Date().toISOString();
    updateMachine(activeMachine.id, {
      userPwnedAt: userDone ? undefined : now,
      status:
        activeMachine.status === 'root' || activeMachine.status === 'completed'
          ? activeMachine.status
          : userDone
            ? 'recon'
            : 'foothold',
    });
    if (soundEnabled) playCyberSound('flag');
  };

  const toggleRoot = () => {
    if (!activeMachine) return;
    const now = new Date().toISOString();
    updateMachine(activeMachine.id, {
      rootPwnedAt: rootDone ? undefined : now,
      userPwnedAt: activeMachine.userPwnedAt || now,
      status: rootDone ? (activeMachine.userPwnedAt ? 'foothold' : 'recon') : 'root',
    });
    if (!rootDone) {
      triggerRootCelebration();
      if (soundEnabled) playCyberSound('root');
    } else if (soundEnabled) {
      playCyberSound('click');
    }
  };

  const applyVaultCred = (cred: Credential) => {
    setGlobalVars({
      ...(cred.domain ? { domain: cred.domain } : {}),
      user: cred.username,
      cred: cred.secret,
    });
    reset('domain');
    reset('user');
    reset('cred');
    setCredsOpen(true);
    click();
  };

  const copyBtn = (key: CopyKey, value: string, label: string) => (
    <button
      type="button"
      onClick={() => copy(value, key)}
      className={iconBtnCls}
      title={copied === key ? `Copied ${label} to clipboard!` : `Copy ${label}`}
      aria-label={key === 'target' ? 'Copy Target IP' : `Copy ${label}`}
    >
      {copied === key ? <Check className="h-3.5 w-3.5 text-callout-success-fg" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- non-modal dialog: Escape from any field closes it
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Session"
      tabIndex={-1}
      data-escape-open="true"
      data-escape-consumer="true"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose(true);
        }
      }}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        transformOrigin: `${position.originX}px 0`,
      }}
      className={`fixed z-popover max-h-[calc(100dvh-54px-72px-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain rounded-xl border border-subtle bg-surface-elevated p-2 font-sans text-xs shadow-xl outline-none machined-edge md:max-h-[calc(100dvh-54px-8px)] ${
        instant ? '' : 'animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none'
      }`}
    >
      <div role="group" aria-label="Connection" className="space-y-1.5 pb-2">
        <p className={groupLabelCls}>Connection</p>
        <div className="flex items-center gap-1.5">
          <label htmlFor={FIELD_IDS.lhost} className={labelCls} title="Attacker IP (tun0 LHOST)">
            LHOST
          </label>
          <input
            id={FIELD_IDS.lhost}
            name="lhost"
            aria-label="Attacker IP (LHOST)"
            type="text"
            value={lhostShown || ''}
            onChange={(e) => {
              setGlobalVars({ lhost: e.target.value });
              reset('lhost');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            placeholder="Set IP"
            title={lhostShown || 'Set your attacker IP (LHOST)'}
            className={inputCls}
          />
          {copyBtn('lhost', globalVars.lhost, 'LHOST')}
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor={FIELD_IDS.rhost} className={labelCls} title="Target IP (RHOST)">
            RHOST
          </label>
          <input
            id={FIELD_IDS.rhost}
            name="targetIp"
            aria-label="Target IP (RHOST)"
            type="text"
            value={targetDraft ?? targetShown}
            onChange={(e) => {
              setTargetDraft(e.target.value);
              reset('target');
            }}
            onBlur={() => flushDraftRef.current()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            placeholder="Target IP"
            title={targetShown || 'Set the target IP (RHOST)'}
            className={inputCls}
          />
          {copyBtn('target', targetShown, 'Target IP (RHOST)')}
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor={FIELD_IDS.lport} className={labelCls} title="Listener port (LPORT)">
            LPORT
          </label>
          <input
            id={FIELD_IDS.lport}
            name="lport"
            aria-label="Listener Port (LPORT)"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={globalVars.lport || ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              if (!digits) {
                setGlobalVars({ lport: '' });
              } else {
                const num = parseInt(digits, 10);
                if (num <= 65535) setGlobalVars({ lport: String(num) });
              }
              reset('lport');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            placeholder="4444"
            title={globalVars.lport || '4444'}
            className={inputCls}
          />
          {copyBtn('lport', globalVars.lport, 'LPORT')}
        </div>

        <button
          type="button"
          onClick={() => setCredsOpen((prev) => !prev)}
          aria-expanded={credsOpen}
          aria-controls="session-target-creds"
          className="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-10"
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 transition-transform ${credsOpen ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
          <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">Target &amp; AD creds</span>
          {filledCredCount > 0 ? (
            <span className="ml-auto rounded-full bg-accent/15 px-1.5 text-[10px] font-semibold tabular-nums text-accent">
              {filledCredCount}
            </span>
          ) : targetVaultCreds.length > 0 ? (
            <span className="ml-auto rounded-full border border-subtle bg-surface-sunken px-1.5 text-[10px] font-medium text-secondary">
              Vault ({targetVaultCreds.length})
            </span>
          ) : null}
        </button>

        {credsOpen && (
          <div id="session-target-creds" className="space-y-1.5 pt-0.5">
            <div className="flex items-center gap-1.5">
              <label htmlFor={FIELD_IDS.domain} className={labelCls} title="Target domain (DOMAIN)">
                DOMAIN
              </label>
              <input
                id={FIELD_IDS.domain}
                name="domain"
                aria-label="Target Domain (DOMAIN)"
                type="text"
                autoComplete="off"
                value={globalVars.domain || ''}
                onChange={(e) => {
                  setGlobalVars({ domain: e.target.value });
                  reset('domain');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder={activeMachine?.domain || 'corp.local'}
                title={globalVars.domain || 'Set target domain (DOMAIN)'}
                className={inputCls}
              />
              {copyBtn('domain', globalVars.domain || '', 'DOMAIN')}
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor={FIELD_IDS.dcIp} className={labelCls} title="Domain Controller IP (DC_IP)">
                DC IP
              </label>
              <input
                id={FIELD_IDS.dcIp}
                name="dcIp"
                aria-label="Domain Controller IP (DC_IP)"
                type="text"
                autoComplete="off"
                value={globalVars.dcIp || ''}
                onChange={(e) => {
                  setGlobalVars({ dcIp: e.target.value });
                  reset('dcIp');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="10.10.10.10"
                title={globalVars.dcIp || 'Set Domain Controller IP (DC_IP)'}
                className={inputCls}
              />
              {copyBtn('dcIp', globalVars.dcIp || '', 'DC IP')}
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor={FIELD_IDS.user} className={labelCls} title="Target username (USER)">
                USER
              </label>
              <input
                id={FIELD_IDS.user}
                name="user"
                aria-label="Target Username (USER)"
                type="text"
                autoComplete="off"
                value={globalVars.user || ''}
                onChange={(e) => {
                  setGlobalVars({ user: e.target.value });
                  reset('user');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="svc_backup"
                title={globalVars.user || 'Set target username (USER)'}
                className={inputCls}
              />
              {copyBtn('user', globalVars.user || '', 'USER')}
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor={FIELD_IDS.cred} className={labelCls} title="Target password or hash (CRED)">
                PASS
              </label>
              <div className="relative flex min-w-0 flex-1 items-center">
                <input
                  id={FIELD_IDS.cred}
                  name="cred"
                  aria-label="Target Password or Hash (PASS)"
                  type={showCred ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={globalVars.cred || ''}
                  onChange={(e) => {
                    setGlobalVars({ cred: e.target.value });
                    reset('cred');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  placeholder="Password / hash"
                  className={`${inputCls} pr-7`}
                />
                <button
                  type="button"
                  onClick={() => setShowCred((prev) => !prev)}
                  aria-label={showCred ? 'Hide password' : 'Show password'}
                  aria-pressed={showCred}
                  title={showCred ? 'Hide password' : 'Show password'}
                  className="absolute right-0.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {showCred ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {copyBtn('cred', globalVars.cred || '', 'PASS')}
            </div>

            {targetVaultCreds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5" aria-label="Load from Vault">
                <span className="text-[10px] font-medium text-muted">Vault:</span>
                {targetVaultCreds.map((cred) => {
                  const displayLabel = cred.domain ? `${cred.domain}\\${cred.username}` : cred.username;
                  return (
                    <button
                      key={cred.id}
                      type="button"
                      onClick={() => applyVaultCred(cred)}
                      title={`Use ${displayLabel} (${cred.type}) in Connection HUD`}
                      className="inline-flex max-w-[200px] cursor-pointer items-center gap-1 truncate rounded-md border border-subtle bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-secondary transition-colors hover:border-accent/50 hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <KeyRound className="h-2.5 w-2.5 shrink-0 text-accent" aria-hidden="true" />
                      <span className="truncate">{displayLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Screen reader announcement for copy operations */}
        <span className="sr-only" role="status" aria-live="polite">
          {copied ? `Copied ${COPY_ANNOUNCEMENTS[copied]} to clipboard` : ''}
        </span>
      </div>

      {activeMachine && (
        <div role="group" aria-label="Engaged target" className="space-y-1.5 border-t border-subtle py-2">
          <p className={`${groupLabelCls} truncate`}>Engaged: {activeMachine.name}</p>
          <div className="flex items-center gap-1.5 px-1">
            <TimerDisplay />
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => {
                if (isTimerRunning) pauseTimer();
                else startTimer();
                if (soundEnabled) playCyberSound('timer');
              }}
              className={`${actionBtnCls} bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary`}
              title={isTimerRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
            >
              {isTimerRunning ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
              <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetTimer();
                click();
              }}
              className={`${actionBtnCls} text-muted hover:bg-surface-hover hover:text-primary`}
              title="Reset Stopwatch"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleUser}
              aria-pressed={userDone}
              title="1-Click: Toggle User Flag"
              className={`${actionBtnCls} ${
                userDone
                  ? 'border-callout-warn-border/40 bg-callout-warn-bg text-callout-warn-fg'
                  : 'bg-transparent text-muted hover:bg-surface-hover hover:text-primary'
              }`}
            >
              <Flag className="h-3 w-3" aria-hidden="true" />
              <span>User flag</span>
            </button>
            <button
              type="button"
              onClick={toggleRoot}
              aria-pressed={rootDone}
              title="1-Click: Toggle Root Flag (Celebration!)"
              className={`${actionBtnCls} ${
                rootDone
                  ? 'border-callout-success-border/40 bg-callout-success-bg text-callout-success-fg'
                  : 'bg-transparent text-muted hover:bg-surface-hover hover:text-primary'
              }`}
            >
              <Flag className="h-3 w-3" aria-hidden="true" />
              <span>Root flag</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => runTool(() => setReportMachineId(activeMachine.id))}
            className={rowBtnCls}
            title={`Generate Pentest Report for ${activeMachine.name}`}
            aria-label={`Pentest report for ${activeMachine.name}`}
          >
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Pentest report</span>
          </button>
        </div>
      )}

      <div role="group" aria-label="Quick tools" className="border-t border-subtle pt-2">
        <p className={groupLabelCls}>Quick tools</p>
        <button type="button" onClick={() => runTool(() => setNewMachineModalOpen(true))} className={rowBtnCls} title="Add a custom target">
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Add target</span>
        </button>
        <button
          type="button"
          onClick={() => runTool(() => setReconAutomationModalOpen(true))}
          className={rowBtnCls}
          title="Recon & Scan Automation (Nmap / Rustscan / XML)"
        >
          <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Scans Hub</span>
        </button>
        <button type="button" onClick={() => runTool(() => setRevShellModalOpen(true))} className={rowBtnCls} title="Open Rapid Reverse Shell Crafter (Alt+R)" aria-keyshortcuts="Alt+R">
          <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Reverse Shell Crafter</span>
          <kbd aria-hidden="true" className="font-mono text-[11px] font-normal text-muted [@media(pointer:coarse)]:hidden">Alt+R</kbd>
        </button>
        <button type="button" onClick={() => runTool(() => setSnippetsDrawerOpen(true))} className={rowBtnCls} title="Open Snippets Drawer (Alt+S)" aria-keyshortcuts="Alt+S">
          <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Snippets</span>
          <kbd aria-hidden="true" className="font-mono text-[11px] font-normal text-muted [@media(pointer:coarse)]:hidden">Alt+S</kbd>
        </button>
        <button type="button" onClick={() => runTool(toggleNotesWorkspace)} className={rowBtnCls} title="Notes panel (Alt+N)" aria-keyshortcuts="Alt+N" aria-pressed={isNotesOpen}>
          <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Field notes</span>
          {openNotesCount > 0 && (
            <span
              title={`${openNotesCount} open`}
              data-testid="notes-open-badge"
              className="min-w-[16px] rounded-full bg-accent px-1 text-center text-[11px] font-medium leading-4 tabular-nums text-on-accent"
            >
              {openNotesCount}
            </span>
          )}
          <kbd aria-hidden="true" className="font-mono text-[11px] font-normal text-muted [@media(pointer:coarse)]:hidden">Alt+N</kbd>
        </button>
      </div>
    </div>
  );
};

export default SessionPanel;
