import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLiveNotes } from '../../hooks/useNoteIndex';
import { rankNoteMatches } from '../../utils/noteSearch';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { isFullscreenNotesPath } from '../../utils/fullscreenRoutes';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

const MAX_RESULTS = 20;

const SwitcherDialog: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dockOpen = useNotesWorkspaceStore((s) => s.isOpen);
  const opensInDock = dockOpen && !isFullscreenNotesPath(location.pathname);
  const notes = useLiveNotes();
  const recentNoteIds = useNotesWorkspaceStore((s) => s.recentNoteIds);
  const closeNoteSwitcher = useNotesWorkspaceStore((s) => s.closeNoteSwitcher);
  const recordRecentNote = useNotesWorkspaceStore((s) => s.recordRecentNote);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: true,
    onClose: closeNoteSwitcher,
    autoFocusFirst: true,
  });

  const results = useMemo<CptsNoteEntry[]>(() => {
    if (!query.trim()) {
      const byId = new Map(notes.map((n) => [n.id, n]));
      return recentNoteIds
        .map((id) => byId.get(id))
        .filter((n): n is CptsNoteEntry => Boolean(n))
        .slice(0, MAX_RESULTS);
    }
    return rankNoteMatches(query, notes, MAX_RESULTS).map((m) => m.note);
  }, [query, notes, recentNoteIds]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-switcher-index="${selected}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [selected]);

  // With the side dock open (outside the full-screen manual) a note opens as a dock tab, so the page
  // stays put. Shift+Enter or Shift+click always goes to the full-screen manual.
  const choose = (note: CptsNoteEntry | undefined, fullScreen = false) => {
    if (!note) return;
    recordRecentNote(note.id);
    closeNoteSwitcher();
    const workspace = useNotesWorkspaceStore.getState();
    if (!fullScreen && workspace.isOpen && !isFullscreenNotesPath(location.pathname)) {
      workspace.openNote(note.id);
      return;
    }
    navigate(`/field-manual?note=${encodeURIComponent(note.id)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((i) => (results.length ? Math.min(i + 1, results.length - 1) : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[selected], e.shiftKey);
    }
  };

  const dialog = (
    <div
      className="fixed inset-0 z-popover flex items-start justify-center pt-20 p-4 bg-surface-inverse/70 font-sans"
      onClick={closeNoteSwitcher}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Open note"
        className="w-full max-w-xl rounded-md border border-strong bg-surface-elevated shadow-xl overflow-hidden machined-edge"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-subtle px-4 py-3 bg-surface-card">
          <Search className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            type="text"
            name="note-switcher-search"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[selected] ? `${listId}-opt-${selected}` : undefined}
            aria-label="Find a note"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Find a note…"
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
            autoFocus
          />
          <kbd className="px-2 py-0.5 rounded text-[10px] bg-surface-sunken text-muted border border-subtle font-mono">
            Esc
          </kbd>
        </div>
        <div ref={listRef} id={listId} role="listbox" aria-label="Notes" className="max-h-[60vh] overflow-y-auto p-3 space-y-1 text-xs">
          {results.length === 0 ? (
            <div className="px-2 py-6 text-center text-muted">
              {query.trim() ? 'No matching notes' : 'No recent notes. Type to search.'}
            </div>
          ) : (
            results.map((n, i) => (
              <div
                key={n.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === selected}
                data-switcher-index={i}
                onClick={(e) => choose(n, e.shiftKey)}
                onMouseMove={() => setSelected(i)}
                className={`w-full p-2 rounded-sm border text-left cursor-pointer transition-colors duration-150 motion-reduce:transition-none ${
                  i === selected
                    ? 'bg-surface-hover border-subtle'
                    : 'hover:bg-surface-hover border-transparent'
                }`}
              >
                <div className="font-medium text-primary truncate">{n.title}</div>
                <div className="text-[11px] text-muted truncate">{n.relPath}</div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-subtle bg-surface-card px-4 py-2 flex items-center gap-3 text-[10px] text-muted">
          <span>Navigate <kbd className="bg-surface-sunken px-1 py-0.5 rounded font-mono">↑</kbd> <kbd className="bg-surface-sunken px-1 py-0.5 rounded font-mono">↓</kbd></span>
          <span>{opensInDock ? 'Open in side panel' : 'Open'} <kbd className="bg-surface-sunken px-1 py-0.5 rounded font-mono">Enter</kbd></span>
          {opensInDock && (
            <span>Full screen <kbd className="bg-surface-sunken px-1 py-0.5 rounded font-mono">Shift+Enter</kbd></span>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : dialog;
};

/** Ctrl+O quick switcher. Renders nothing (and builds no index) while closed. */
export default function NoteSwitcherModal(): JSX.Element | null {
  const open = useNotesWorkspaceStore((s) => s.isNoteSwitcherOpen);
  return open ? <SwitcherDialog /> : null;
}
