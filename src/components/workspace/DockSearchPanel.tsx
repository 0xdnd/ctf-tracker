import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Search, Terminal } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useLiveNotes } from '../../hooks/useNoteIndex';
import { rankNoteMatches } from '../../utils/noteSearch';
import { NoteMatchSnippets } from '../cheatsheet/NoteMatchSnippets';
import { CHEATSHEET_CATEGORIES } from '../../data/cheatsheetsData';
import type { CheatsheetCommand } from '../../types';

const NOTE_LIMIT = 50;
const CHEAT_LIMIT = 20;
const CATEGORY_NAMES = new Map(CHEATSHEET_CATEGORIES.map((c) => [c.id, c.name]));

const cheatHaystack = (c: CheatsheetCommand): string =>
  [c.title, CATEGORY_NAMES.get(c.category) ?? c.category, (c.tags ?? []).join(' '), c.commandTemplate]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export interface DockSearchPanelProps {
  /** Opens a note; `query` is the search text to highlight in it. */
  onOpenNote: (noteId: string, query: string) => void;
  onOpenCheat: (entryId: string) => void;
  /** Focuses the search box whenever this grows past 0 (the user picked Search). 0 never steals focus. */
  focusSignal?: number;
}

const rowClass =
  'block w-full cursor-pointer rounded-sm px-2 py-1.5 text-left transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';

/** Full-text search of the dock: notes ranked by title, path, then body (with matching lines), plus cheatsheets. */
export const DockSearchPanel: React.FC<DockSearchPanelProps> = ({ onOpenNote, onOpenCheat, focusSignal = 0 }) => {
  const notes = useLiveNotes();
  const cheatsheets = useCtfStore((s) => s.cheatsheets);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const pending = deferred !== query;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus();
  }, [focusSignal]);

  const noteResults = useMemo(() => rankNoteMatches(deferred, notes, NOTE_LIMIT), [deferred, notes]);
  const cheatResults = useMemo(() => {
    const tokens = deferred.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    const out: CheatsheetCommand[] = [];
    for (const c of cheatsheets ?? []) {
      const hay = cheatHaystack(c);
      if (tokens.every((t) => hay.includes(t))) out.push(c);
      if (out.length >= CHEAT_LIMIT) break;
    }
    return out;
  }, [deferred, cheatsheets]);

  const trimmed = deferred.trim();

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-card" data-testid="dock-search-panel">
      <div className="flex-shrink-0 border-b border-subtle p-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-subtle bg-surface-sunken px-2 py-1.5">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            aria-label="Search notes and cheatsheets"
            data-testid="dock-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all text..."
            className="w-full min-w-0 bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" data-testid="dock-search-results">
        {!query.trim() ? (
          <p className="px-1 py-2 text-xs text-muted">Search note titles, paths and text, and cheatsheet commands.</p>
        ) : pending ? (
          <p className="px-1 py-2 text-xs text-muted">Searching…</p>
        ) : noteResults.length === 0 && cheatResults.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted">No results.</p>
        ) : (
          <>
            {noteResults.length > 0 && (
              <section aria-label="Notes">
                <h3 className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[.06em] text-tertiary">
                  Notes
                </h3>
                {noteResults.map(({ note, field }) => (
                  <button
                    key={note.id}
                    type="button"
                    data-dock-search-note={note.id}
                    onClick={() => onOpenNote(note.id, trimmed)}
                    className={rowClass}
                  >
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted" aria-hidden="true" />
                      <span className="truncate">{note.titleEn || note.title}</span>
                    </span>
                    {field === 'path' && note.relPath && (
                      <span className="block truncate pl-5 text-[11px] text-muted">{note.relPath}</span>
                    )}
                    <div className="pl-5">
                      <NoteMatchSnippets markdown={note.rawMarkdown} query={trimmed} max={2} />
                    </div>
                  </button>
                ))}
              </section>
            )}
            {cheatResults.length > 0 && (
              <section aria-label="Cheatsheets" className="mt-1">
                <h3 className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[.06em] text-tertiary">
                  Cheatsheets
                </h3>
                {cheatResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    data-dock-search-cheat={c.id}
                    onClick={() => onOpenCheat(c.id)}
                    className={rowClass}
                  >
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <Terminal className="h-3.5 w-3.5 flex-shrink-0 text-muted" aria-hidden="true" />
                      <span className="truncate">{c.title}</span>
                    </span>
                    <span className="block truncate pl-5 text-[11px] text-muted">
                      {CATEGORY_NAMES.get(c.category) ?? c.category}
                    </span>
                  </button>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DockSearchPanel;
