import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Search, FilePlus, ClipboardCopy, Keyboard, Flag, Crown, Check, BookOpen, ChevronDown, X, KeyRound } from 'lucide-react';
import type { CredentialType } from '../../types/loot';
import { useShallow } from 'zustand/react/shallow';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useToastStore } from '../../store/useToastStore';
import { playCyberSound } from '../../utils/helpers';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { Tooltip } from '../common/Tooltip';
import { DOCK_SWITCHER_SHORTCUT_LABEL } from './DockQuickSwitcher';

/** Workspace-scoped shortcuts (Alt combos the global hotkeys leave free). */
export const NOTES_WORKSPACE_SHORTCUTS = [
  { keys: DOCK_SWITCHER_SHORTCUT_LABEL.replace('+', ' + '), label: 'Search notes' },
  { keys: 'Alt + =', label: 'New note' },
  { keys: 'Alt + C', label: 'Copy all commands' },
] as const;

const UNSET_VALUES = new Set(['', '10.10.14.X', '10.10.10.X']);

const ICON_BTN =
  'active:scale-[0.97] inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 text-muted hover:bg-surface-hover hover:text-primary transition-interactive cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11';

interface InlineVarFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
}

/** Click-to-edit variable value (Enter / blur saves, Escape cancels). */
const InlineVarField: React.FC<InlineVarFieldProps> = ({ label, value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const unset = UNSET_VALUES.has(value.trim());

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const finish = (save: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (save) onSave(draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <label className="inline-flex items-center gap-1">
        <span className="font-semibold text-muted">{label}</span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          aria-label={`Edit ${label}`}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => finish(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              finish(true);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              finish(false);
            }
          }}
          className="h-7 w-32 rounded-md border border-accent bg-surface-sunken px-1.5 font-mono tabular-nums text-[11px] text-primary focus:outline-none [@media(pointer:coarse)]:h-11"
        />
      </label>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        doneRef.current = false;
        setDraft(unset ? '' : value);
        setEditing(true);
      }}
      title={unset ? `${label} is not set. Click to set it` : `Click to edit ${label}`}
      aria-label={`${label}: ${unset ? 'not set' : value}. Edit`}
      className="active:scale-[0.97] inline-flex h-7 items-center gap-1 rounded-md px-1.5 hover:bg-surface-hover transition-interactive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
    >
      <span className="font-semibold text-muted">{label}</span>
      <span
        className={`rounded border px-1 font-mono tabular-nums ${
          unset
            ? 'border-callout-warn-border bg-callout-warn-bg text-callout-warn-fg'
            : 'border-subtle bg-surface-sunken text-primary'
        }`}
      >
        {unset ? 'not set' : value}
      </span>
    </button>
  );
};

export interface NotesWorkspaceTargetBarProps {
  onSearch: () => void;
  onNewNote: () => void;
  onCopyAll: () => void;
  canCopyAll: boolean;
}

/**
 * Compact bar on top of the notes workspace: engaged target + its IP and
 * LHOST (all editable in place), direct target-note binding, live user/root
 * flag capture sync, plus search / new note / copy-all actions.
 */
export const NotesWorkspaceTargetBar: React.FC<NotesWorkspaceTargetBarProps> = ({
  onSearch,
  onNewNote,
  onCopyAll,
  canCopyAll,
}) => {
  const {
    machines,
    activeMachine,
    setActiveTarget,
    globalVars,
    setGlobalVars,
    toggleUserFlag,
    toggleRootFlag,
    addCustomNote,
    addCredential,
    updateNoteContent,
    soundEnabled,
  } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      activeMachine: s.activeTargetId ? s.machines.find((m) => m.id === s.activeTargetId) : undefined,
      setActiveTarget: s.setActiveTarget,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      toggleUserFlag: s.toggleUserFlag,
      toggleRootFlag: s.toggleRootFlag,
      addCustomNote: s.addCustomNote,
      addCredential: s.addCredential,
      updateNoteContent: s.updateNoteContent,
      soundEnabled: s.soundEnabled,
    }))
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [lootOpen, setLootOpen] = useState(false);
  const [lootUser, setLootUser] = useState('');
  const [lootSecret, setLootSecret] = useState('');
  const [lootType, setLootType] = useState<CredentialType>('password');
  const [lootSyncVars, setLootSyncVars] = useState(true);

  const handleSaveLoot = (e: React.FormEvent) => {
    e.preventDefault();
    const u = lootUser.trim();
    const s = lootSecret.trim();
    if (!u || !s) return;

    addCredential({
      type: lootType,
      username: u,
      secret: s,
      sourceMachineId: activeMachine?.id,
      notes: activeMachine ? `Captured on ${activeMachine.name} via Notes` : 'Captured via Notes Workspace',
    });

    if (lootSyncVars) {
      setGlobalVars({ user: u, cred: s });
    }

    const activeNoteId = useNotesWorkspaceStore.getState().activeTabId;
    if (activeNoteId) {
      const st = useCtfStore.getState();
      const noteObj =
        st.customNotes.find((n) => n.id === activeNoteId) ||
        st.userNotes.find((n) => n.id === activeNoteId);
      if (noteObj) {
        const row = `| \`${u}\` | \`${s}\` | ${lootType} | ${activeMachine?.name || 'Captured'} |`;
        const nextMd = (noteObj.rawMarkdown || '').includes('| Username |')
          ? `${(noteObj.rawMarkdown || '').trimEnd()}
${row}
`
          : `${(noteObj.rawMarkdown || '').trimEnd()}

### Captured Credentials
| Username | Secret / Hash | Type | Source |
| :--- | :--- | :--- | :--- |
${row}
`;
        Promise.resolve(updateNoteContent(activeNoteId, nextMd)).catch((e) => console.warn('[ZeroBox] Could not save note', e));
      }
    }

    if (soundEnabled) playCyberSound('root');
    useToastStore.getState().addToast({
      type: 'success',
      message: `Saved ${u} (${lootType}) to Vault${lootSyncVars ? ' & updated {USER}/{PASS}' : ''}`,
    });
    setLootUser('');
    setLootSecret('');
    setLootOpen(false);
  };

  const filteredMachines = React.useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const list = q
      ? machines.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            (m.ip && m.ip.toLowerCase().includes(q)) ||
            (m.os && m.os.toLowerCase().includes(q))
        )
      : machines;
    return list.slice(0, 10);
  }, [machines, pickerQuery]);

  const handleOpenOrCreateTargetNote = () => {
    if (!activeMachine) return;
    const state = useCtfStore.getState();
    const targetLower = activeMachine.name.toLowerCase();
    const existing =
      state.customNotes.find((n) => n.title.toLowerCase().includes(targetLower)) ||
      state.userNotes.find((n) => n.title.toLowerCase().includes(targetLower));

    if (existing) {
      useNotesWorkspaceStore.getState().openNote(existing.id);
      if (soundEnabled) playCyberSound('click');
      useToastStore.getState().addToast({
        type: 'info',
        message: `Opened field log for ${activeMachine.name}`,
      });
      return;
    }

    const templateText = `# ${activeMachine.name} — Field Log

> [!NOTE] Target Profile
> - **Machine**: ${activeMachine.name} (${activeMachine.platform || 'Custom'})
> - **OS / Difficulty**: ${activeMachine.os || 'Linux'} • ${activeMachine.difficulty || 'Medium'}
> - **RHOST**: \`{TARGET}\` (${activeMachine.ip || 'unset'}) | **LHOST**: \`{LHOST}\`

## 1. Enumeration & Open Ports
\`\`\`bash
nmap -sC -sV -p- --min-rate 5000 -oN nmap_${activeMachine.name.toLowerCase().replace(/[^a-z0-9]/g, '_')} {TARGET}
\`\`\`

| Port | Service | Version | Notes / Attack Surface |
| :--- | :--- | :--- | :--- |
| 22/tcp | ssh | OpenSSH | Check banner / auth methods |
| 80/tcp | http | Web | Enumerate vhosts & directories |

## 2. Foothold & Initial Access
- [ ] Enumerate web directories / subdomains (\`ffuf\`)
- [ ] Identify vulnerable service or credential reuse
- [ ] Obtain shell & capture \`user.txt\`

## 3. Privilege Escalation
- [ ] Run \`sudo -l\` / check SUID & capabilities / WinPEAS
- [ ] Inspect internal ports, cronjobs, and config files
- [ ] Escalate privileges & capture \`root.txt\`

## 4. Loot & Credentials
| Username | Secret / Hash | Source | Verified On |
| :--- | :--- | :--- | :--- |
| \`user\` | \`password / hash\` | Config / dump | SSH / SMB |
`;

    addCustomNote({
      title: `${activeMachine.name} — Field Log`,
      stage: '1 — Enumeration',
      tags: [
        (activeMachine.platform || 'Custom').toLowerCase(),
        (activeMachine.os || 'Linux').toLowerCase(),
        (activeMachine.difficulty || 'Medium').toLowerCase(),
        'target-log',
      ],
      rawMarkdown: templateText,
    });

    const created = useCtfStore.getState().customNotes[0];
    if (created) {
      useNotesWorkspaceStore.getState().openNote(created.id);
    }
    if (soundEnabled) playCyberSound('root');
    useToastStore.getState().addToast({
      type: 'success',
      message: `Created & bound field log for ${activeMachine.name}`,
    });
  };

  const handleToggleUser = () => {
    if (!activeMachine) return;
    const willBePwned = !activeMachine.userPwnedAt;
    toggleUserFlag(activeMachine.id);
    if (soundEnabled) playCyberSound(willBePwned ? 'root' : 'click');
    useToastStore.getState().addToast({
      type: willBePwned ? 'success' : 'info',
      message: willBePwned
        ? `user.txt captured on ${activeMachine.name}!`
        : `user.txt cleared on ${activeMachine.name}`,
    });
  };

  const handleToggleRoot = () => {
    if (!activeMachine) return;
    const willBePwned = !activeMachine.rootPwnedAt;
    toggleRootFlag(activeMachine.id);
    if (soundEnabled) playCyberSound(willBePwned ? 'root' : 'click');
    useToastStore.getState().addToast({
      type: willBePwned ? 'success' : 'info',
      message: willBePwned
        ? `root.txt captured on ${activeMachine.name}!`
        : `root.txt cleared on ${activeMachine.name}`,
    });
  };

  const userPwned = Boolean(activeMachine?.userPwnedAt);
  const rootPwned = Boolean(activeMachine?.rootPwnedAt);

  return (
    <div
      data-testid="notes-target-bar"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1 bg-surface-card border-b border-subtle text-[11px] flex-shrink-0 relative"
    >
      <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
        <Crosshair className="w-3.5 h-3.5 flex-shrink-0 text-accent" aria-hidden="true" />
        {activeMachine ? (
          <>
            <button
              type="button"
              onClick={() => {
                setPickerOpen((p) => !p);
                setPickerQuery('');
              }}
              title="Click to switch engaged target"
              className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-surface-hover cursor-pointer"
            >
              <span className="max-w-[140px] truncate font-semibold text-primary">
                {activeMachine.name}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-muted" />
            </button>
            <span className="hidden sm:inline-flex items-center rounded border border-subtle bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-secondary">
              {activeMachine.os || 'Linux'} • {activeMachine.difficulty || 'Medium'}
            </span>
            <EditableIpBadge machineId={activeMachine.id} initialIp={activeMachine.ip || ''} size="xs" />

            {/* Tier 1 Upgrade #1: 1-Click Bound Target Note */}
            <button
              type="button"
              onClick={handleOpenOrCreateTargetNote}
              data-testid="open-target-note-btn"
              aria-label="Open target note"
              title={`Open or create field note bound to ${activeMachine.name}`}
              className="active:scale-[0.97] inline-flex h-6 items-center gap-1 rounded border border-accent/40 bg-accent-muted px-1.5 text-[10px] font-semibold text-accent hover:bg-surface-hover transition-interactive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <BookOpen className="w-3 h-3" />
              <span>Target Note</span>
            </button>

            {/* Tier 1 Upgrade #2: In-Note Flag Capture & Pwn Sync */}
            <div className="inline-flex items-center gap-1" role="group" aria-label="Target flag capture controls">
              <button
                type="button"
                onClick={handleToggleUser}
                data-testid="target-bar-user-flag"
                aria-label="Toggle user.txt flag"
                aria-pressed={userPwned}
                title={userPwned ? 'user.txt captured (click to clear)' : 'Mark user.txt captured'}
                className={`active:scale-[0.97] inline-flex h-6 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-semibold transition-interactive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  userPwned
                    ? 'border-callout-success-border bg-callout-success-bg text-callout-success-fg'
                    : 'border-subtle bg-surface-sunken text-muted hover:text-primary hover:border-strong'
                }`}
              >
                <Flag className="w-2.5 h-2.5" />
                <span>user.txt</span>
                {userPwned && <Check className="w-2.5 h-2.5" />}
              </button>

              <button
                type="button"
                onClick={handleToggleRoot}
                data-testid="target-bar-root-flag"
                aria-label="Toggle root.txt flag"
                aria-pressed={rootPwned}
                title={rootPwned ? 'root.txt captured (click to clear)' : 'Mark root.txt captured'}
                className={`active:scale-[0.97] inline-flex h-6 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-semibold transition-interactive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  rootPwned
                    ? 'border-callout-danger-border bg-callout-danger-bg text-callout-danger-fg'
                    : 'border-subtle bg-surface-sunken text-muted hover:text-primary hover:border-strong'
                }`}
              >
                <Crown className="w-2.5 h-2.5" />
                <span>root.txt</span>
                {rootPwned && <Check className="w-2.5 h-2.5" />}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-muted">No target engaged</span>
            {machines.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPickerOpen((p) => !p);
                  setPickerQuery('');
                }}
                data-testid="engage-target-picker-btn"
                aria-label="Engage target machine"
                className="active:scale-[0.97] inline-flex h-6 items-center gap-1 rounded border border-accent/40 bg-accent-muted px-1.5 text-[10px] font-semibold text-accent hover:bg-surface-hover transition-interactive cursor-pointer"
              >
                <span>Engage</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
            <InlineVarField
              label="RHOST"
              value={globalVars.targetIp || ''}
              onSave={(targetIp) => setGlobalVars({ targetIp })}
            />
          </>
        )}
      </div>

      {/* Quick Target Picker Popover */}
      {pickerOpen && (
        <div
          data-testid="target-picker-popover"
          className="absolute left-3 top-full mt-1 w-72 p-2 rounded-lg bg-surface-card border border-strong shadow-2xl z-50 text-[11px] space-y-1.5"
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
              Select Active Target ({machines.length})
            </span>
            <div className="flex items-center gap-1.5">
              {activeMachine && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTarget(null);
                    setPickerOpen(false);
                  }}
                  className="text-[10px] text-callout-danger-fg hover:underline cursor-pointer"
                >
                  Disengage
                </button>
              )}
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-muted hover:text-primary cursor-pointer"
                aria-label="Close target picker"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <input
            type="text"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Filter targets by name or IP..."
            aria-label="Filter targets"
            autoFocus
            className="w-full h-7 px-2 rounded border border-subtle bg-surface-sunken text-[11px] text-primary placeholder-muted focus:outline-none focus:border-accent"
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredMachines.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActiveTarget(m.id);
                  setPickerOpen(false);
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left hover:bg-surface-sunken transition-colors cursor-pointer ${
                  activeMachine?.id === m.id ? 'bg-accent-muted text-accent font-semibold' : 'text-primary'
                }`}
              >
                <div className="truncate pr-2">
                  <span className="font-semibold">{m.name}</span>
                  <span className="ml-1.5 text-[10px] text-muted">{m.os} • {m.difficulty}</span>
                </div>
                <span className="font-mono text-[10px] text-secondary flex-shrink-0">{m.ip || 'no IP'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <InlineVarField label="LHOST" value={globalVars.lhost || ''} onSave={(lhost) => setGlobalVars({ lhost })} />

      {/* Phase 2 Power Tool: 1-Click Loot Capture to Vault & Active Note */}
      <button
        type="button"
        onClick={() => setLootOpen((p) => !p)}
        data-testid="quick-loot-btn"
        aria-label="Quick capture credential to Vault"
        title="Capture credential to Vault & inject into active note"
        className="active:scale-[0.97] inline-flex h-6 items-center gap-1 rounded border border-callout-warn-border bg-callout-warn-bg px-1.5 text-[10px] font-semibold text-callout-warn-fg hover:bg-surface-hover transition-interactive cursor-pointer"
      >
        <KeyRound className="w-3 h-3" />
        <span>+ Loot</span>
      </button>

      {lootOpen && (
        <form
          onSubmit={handleSaveLoot}
          data-testid="quick-loot-popover"
          className="absolute right-3 top-full mt-1 w-72 p-2.5 rounded-lg bg-surface-card border border-strong shadow-2xl z-50 text-[11px] space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-callout-warn-fg uppercase tracking-wider flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              Capture Loot to Vault
            </span>
            <button
              type="button"
              onClick={() => setLootOpen(false)}
              className="text-muted hover:text-primary cursor-pointer"
              aria-label="Close loot capture"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            <input
              type="text"
              value={lootUser}
              onChange={(e) => setLootUser(e.target.value)}
              placeholder="Username (e.g. svc_loanmgr, admin)"
              aria-label="Loot username"
              autoFocus
              className="w-full h-7 px-2 rounded border border-subtle bg-surface-sunken text-[11px] font-mono text-primary placeholder-muted focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              value={lootSecret}
              onChange={(e) => setLootSecret(e.target.value)}
              placeholder="Password, NTLM hash, or token"
              aria-label="Loot secret"
              className="w-full h-7 px-2 rounded border border-subtle bg-surface-sunken text-[11px] font-mono text-primary placeholder-muted focus:outline-none focus:border-accent"
            />
            <div className="flex items-center justify-between gap-2">
              <select
                value={lootType}
                onChange={(e) => setLootType(e.target.value as CredentialType)}
                aria-label="Loot credential type"
                className="h-7 px-1.5 rounded border border-subtle bg-surface-sunken text-[10px] text-primary focus:outline-none focus:border-accent"
              >
                <option value="password">Password</option>
                <option value="hash">Hash</option>
                <option value="key">SSH / Key</option>
                <option value="token">Token / Ticket</option>
              </select>
              <label className="inline-flex items-center gap-1 text-[10px] text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={lootSyncVars}
                  onChange={(e) => setLootSyncVars(e.target.checked)}
                  className="rounded border-subtle accent-red-500"
                />
                <span>Set {'{USER}'}/{'{PASS}'}</span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={!lootUser.trim() || !lootSecret.trim()}
            className="w-full h-7 rounded bg-accent-muted hover:bg-surface-hover border border-accent/50 text-accent font-semibold text-[11px] cursor-pointer disabled:opacity-40"
          >
            Save to Vault & Note
          </button>
        </form>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        <button type="button" onClick={onSearch} className={ICON_BTN} aria-label="Search notes" title={`Search notes (${DOCK_SWITCHER_SHORTCUT_LABEL})`}>
          <Search className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onNewNote} className={ICON_BTN} aria-label="New note" title="New note (Alt + =)">
          <FilePlus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onCopyAll}
          disabled={!canCopyAll}
          className={ICON_BTN}
          aria-label="Copy all commands"
          title={canCopyAll ? 'Copy all commands in this note, variables filled in (Alt + C)' : 'This note has no commands'}
        >
          <ClipboardCopy className="w-3.5 h-3.5" />
        </button>
        <Tooltip
          side="bottom"
          content={
            <ul className="space-y-0.5">
              {NOTES_WORKSPACE_SHORTCUTS.map((s) => (
                <li key={s.keys} className="flex items-center justify-between gap-3">
                  <span>{s.label}</span>
                  <kbd className="rounded border border-subtle bg-surface-sunken px-1 font-mono text-[10px]">{s.keys}</kbd>
                </li>
              ))}
            </ul>
          }
        >
          <button type="button" className={ICON_BTN} aria-label="Notes keyboard shortcuts">
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
