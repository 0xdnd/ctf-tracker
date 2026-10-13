import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Search, FilePlus, ClipboardCopy, Keyboard } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCtfStore } from '../../store/useCtfStore';
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
 * LHOST (all editable in place), plus search / new note / copy-all actions.
 */
export const NotesWorkspaceTargetBar: React.FC<NotesWorkspaceTargetBarProps> = ({
  onSearch,
  onNewNote,
  onCopyAll,
  canCopyAll,
}) => {
  const { activeMachine, globalVars, setGlobalVars } = useCtfStore(
    useShallow((s) => ({
      activeMachine: s.activeTargetId ? s.machines.find((m) => m.id === s.activeTargetId) : undefined,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
    }))
  );

  return (
    <div
      data-testid="notes-target-bar"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1 bg-surface-card border-b border-subtle text-[11px] flex-shrink-0"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Crosshair className="w-3.5 h-3.5 flex-shrink-0 text-accent" aria-hidden="true" />
        {activeMachine ? (
          <>
            <span className="max-w-[140px] truncate font-semibold text-primary" title={activeMachine.name}>
              {activeMachine.name}
            </span>
            <EditableIpBadge machineId={activeMachine.id} initialIp={activeMachine.ip || ''} size="xs" />
          </>
        ) : (
          <>
            <span className="text-muted">No target engaged</span>
            <InlineVarField
              label="RHOST"
              value={globalVars.targetIp || ''}
              onSave={(targetIp) => setGlobalVars({ targetIp })}
            />
          </>
        )}
      </div>

      <InlineVarField label="LHOST" value={globalVars.lhost || ''} onSave={(lhost) => setGlobalVars({ lhost })} />

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
