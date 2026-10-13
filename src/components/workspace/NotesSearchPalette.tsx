import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CptsNoteEntry } from '../../utils/obsidianManualUtils';

const MAX_RESULTS = 30;
const SNIPPET_RADIUS = 40;

interface SearchHit {
  note: CptsNoteEntry;
  /** Short excerpt around the first content match (content-only hits). */
  snippet?: string;
}

function noteContent(note: CptsNoteEntry): string {
  return note.rawMarkdown || (note as CptsNoteEntry & { content?: string }).content || '';
}

/** Case-insensitive title + content search; title hits rank first. */
export function searchNotes(notes: CptsNoteEntry[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return notes.slice(0, MAX_RESULTS).map((note) => ({ note }));
  const titleHits: SearchHit[] = [];
  const contentHits: SearchHit[] = [];
  for (const note of notes) {
    const title = `${note.title} ${note.titleEn || ''}`.toLowerCase();
    if (title.includes(q)) {
      titleHits.push({ note });
      continue;
    }
    const content = noteContent(note);
    const at = content.toLowerCase().indexOf(q);
    if (at !== -1) {
      const start = Math.max(0, at - SNIPPET_RADIUS);
      const end = Math.min(content.length, at + q.length + SNIPPET_RADIUS);
      const snippet = `${start > 0 ? '…' : ''}${content.slice(start, end).replace(/\s+/g, ' ')}${end < content.length ? '…' : ''}`;
      contentHits.push({ note, snippet });
    }
  }
  return [...titleHits, ...contentHits].slice(0, MAX_RESULTS);
}

export interface NotesSearchPaletteProps {
  open: boolean;
  notes: CptsNoteEntry[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (noteId: string) => void;
  onClose: () => void;
}

/** Keyboard-first note search: arrows move, Enter opens in a tab, Escape closes. */
export const NotesSearchPalette: React.FC<NotesSearchPaletteProps> = ({
  open,
  notes,
  query,
  onQueryChange,
  onSelect,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();
  const hits = useMemo(() => searchNotes(notes, query), [notes, query]);

  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  const choose = (index: number) => {
    const hit = hits[index];
    if (hit) onSelect(hit.note.id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (hits.length ? (i + 1) % hits.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (hits.length ? (i - 1 + hits.length) % hits.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(activeIndex);
    }
  };

  const optionId = (i: number) => `${baseId}-opt-${i}`;

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Search notes" size="lg" placement="top" initialFocusRef={inputRef}>
      <div className="flex items-center gap-2 px-3 border-b border-subtle">
        <Search className="w-4 h-4 text-muted flex-shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${baseId}-list`}
          aria-activedescendant={hits.length ? optionId(activeIndex) : undefined}
          aria-label="Search notes by title or content"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search note titles and content…"
          spellCheck={false}
          className="h-12 w-full bg-transparent text-sm text-primary placeholder-muted focus:outline-none"
        />
      </div>
      <ul
        ref={listRef}
        id={`${baseId}-list`}
        role="listbox"
        aria-label="Matching notes"
        className="max-h-[50dvh] overflow-y-auto overscroll-contain p-1.5 space-y-0.5"
      >
        {hits.map((hit, i) => {
          const active = i === activeIndex;
          return (
            // Keyboard selection lives on the combobox input (aria-activedescendant).
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={hit.note.id}
              id={optionId(i)}
              data-index={i}
              role="option"
              aria-selected={active}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-lg px-2.5 py-1.5 text-xs ${
                active ? 'bg-accent-muted text-accent' : 'text-secondary hover:bg-surface-sunken'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 flex-shrink-0 text-muted" aria-hidden="true" />
                <span className="truncate font-medium">{hit.note.title}</span>
                <span className="ml-auto flex-shrink-0 text-[10px] text-muted">{hit.note.category}</span>
              </span>
              {hit.snippet && <span className="mt-0.5 truncate pl-5 text-[11px] text-muted">{hit.snippet}</span>}
            </li>
          );
        })}
        {hits.length === 0 && <li className="py-6 text-center text-xs text-muted">No notes match “{query.trim()}”</li>}
      </ul>
    </Modal>
  );
};
