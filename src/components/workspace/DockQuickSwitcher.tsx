import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Terminal } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { cheatTabId, useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { mergeUserNotePools } from '../../utils/obsidianManualUtils';
import { buildSearchIndex, searchDocs, type SearchDoc } from '../../utils/searchIndex';
import { CHEATSHEET_CATEGORIES } from '../../data/cheatsheetsData';

/** Chord that opens the switcher while the dock is open (Ctrl/Cmd+P is print, Alt+O is operator switch). */
export const DOCK_SWITCHER_SHORTCUT_LABEL = 'Alt+K';

type Section = 'notes' | 'cheats';

interface SwitcherItem {
  key: string;
  tabId: string;
  title: string;
  detail: string;
  section: Section;
}

const SECTIONS: Section[] = ['notes', 'cheats'];
const SECTION_LABEL: Record<Section, string> = { notes: 'Notes', cheats: 'Cheatsheets' };
const EMPTY_QUERY_LIMIT: Record<Section, number> = { notes: 8, cheats: 6 };
const CATEGORY_NAMES = new Map(CHEATSHEET_CATEGORIES.map((c) => [c.id, c.name]));
const SHORTCUT_CATEGORIES = CHEATSHEET_CATEGORIES.filter((c) => !['all', 'custom'].includes(c.id)).slice(0, 4);

interface DockQuickSwitcherProps {
  /** `popover` closes itself via onClose; `inline` is the empty-state variant and never closes. */
  variant: 'popover' | 'inline';
  onClose?: () => void;
}

export const DockQuickSwitcher: React.FC<DockQuickSwitcherProps> = ({ variant, onClose }) => {
  const navigate = useNavigate();
  const openNote = useNotesWorkspaceStore((s) => s.openNote);
  const { customNotes, userNotes, cheatsheets } = useCtfStore(
    useShallow((s) => ({ customNotes: s.customNotes, userNotes: s.userNotes, cheatsheets: s.cheatsheets }))
  );

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = React.useId();

  // Lookups for the secondary label on each row; rebuilt only when the underlying data changes.
  const { index, details } = useMemo(() => {
    const notes = mergeUserNotePools(customNotes, userNotes);
    const map = new Map<string, string>();
    for (const n of notes) map.set(`note-${n.id}`, n.category);
    for (const c of cheatsheets) map.set(`cheat-${c.id}`, CATEGORY_NAMES.get(c.category) ?? c.category);
    return { index: buildSearchIndex({ customNotes: notes, cheatsheets }), details: map };
  }, [customNotes, userNotes, cheatsheets]);

  const items = useMemo<SwitcherItem[]>(() => {
    const toItem = (doc: SearchDoc): SwitcherItem | null => {
      if (doc.ref.kind === 'note') {
        return { key: doc.id, tabId: doc.ref.id, title: doc.title, detail: details.get(doc.id) ?? '', section: 'notes' };
      }
      if (doc.ref.kind === 'cheat') {
        return { key: doc.id, tabId: cheatTabId(doc.ref.id), title: doc.title, detail: details.get(doc.id) ?? '', section: 'cheats' };
      }
      return null;
    };

    const q = query.trim();
    const picked: SwitcherItem[] = [];
    if (q) {
      for (const hit of searchDocs(index, q, 8)) {
        const item = toItem(hit.doc);
        if (item) picked.push(item);
      }
    } else {
      const counts: Record<Section, number> = { notes: 0, cheats: 0 };
      for (const doc of index.docs) {
        const item = toItem(doc);
        if (!item || counts[item.section] >= EMPTY_QUERY_LIMIT[item.section]) continue;
        counts[item.section]++;
        picked.push(item);
      }
    }
    // Group order is fixed (Notes, then Cheatsheets) so arrow navigation matches what is on screen.
    return SECTIONS.flatMap((section) => picked.filter((i) => i.section === section));
  }, [index, details, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (variant === 'popover') inputRef.current?.focus();
  }, [variant]);

  const safeIndex = items.length === 0 ? -1 : Math.min(activeIndex, items.length - 1);

  useEffect(() => {
    if (safeIndex < 0) return;
    document.getElementById(`${listId}-opt-${safeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [safeIndex, listId]);

  const choose = (item: SwitcherItem) => {
    openNote(item.tabId);
    setQuery('');
    onClose?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) setActiveIndex((safeIndex + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) setActiveIndex((safeIndex - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (safeIndex >= 0) choose(items[safeIndex]);
    } else if (e.key === 'Escape') {
      // Handled here so the global Esc handler (which would only blur the input) never sees it.
      e.preventDefault();
      e.stopPropagation();
      if (variant === 'popover') onClose?.();
      else setQuery('');
    }
  };

  let optionCounter = -1;

  return (
    <div className="space-y-2" data-dock-switcher={variant}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-sunken border border-subtle">
        <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={safeIndex >= 0 ? `${listId}-opt-${safeIndex}` : undefined}
          aria-label="Open anything: notes and cheatsheets"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Open a note or cheatsheet..."
          className="w-full bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none"
        />
        {variant === 'popover' && (
          <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-surface-card text-muted border border-subtle font-mono flex-shrink-0">
            Esc
          </kbd>
        )}
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Notes and cheatsheets"
        className="max-h-[48vh] sm:max-h-72 overflow-y-auto space-y-2 overscroll-contain"
      >
        {SECTIONS.map((section) => {
          const group = items.filter((i) => i.section === section);
          if (group.length === 0) return null;
          const Icon = section === 'notes' ? FileText : Terminal;
          return (
            <div key={section} role="group" aria-label={SECTION_LABEL[section]} className="space-y-0.5">
              <div className="px-2 pt-1 text-[11px] font-medium text-muted">{SECTION_LABEL[section]}</div>
              {group.map((item) => {
                optionCounter++;
                const idx = optionCounter;
                const selected = idx === safeIndex;
                return (
                  // Options are driven by the combobox input (aria-activedescendant), so they are not tab stops.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                  <div
                    key={item.key}
                    id={`${listId}-opt-${idx}`}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(item)}
                    className={`w-full p-2 rounded-lg flex items-center justify-between gap-2 text-left text-xs cursor-pointer transition-interactive ${
                      selected ? 'bg-accent-muted text-accent' : 'text-secondary hover:bg-surface-sunken'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden="true" />
                      <span className="truncate font-medium">{item.title}</span>
                    </span>
                    {item.detail && (
                      <span className="text-[10px] text-muted flex-shrink-0 truncate max-w-[40%]">{item.detail}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-center py-3 text-muted text-xs">
            {query.trim() ? 'Nothing matches' : 'No notes or snippets yet'}
          </div>
        )}
      </div>

      {variant === 'inline' && (
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => navigate('/notes?new=1')}
            className="active:scale-[0.97] w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent-muted text-accent border border-accent cursor-pointer transition-interactive"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New note
          </button>
          <div className="flex flex-wrap justify-center gap-1.5" aria-label="Cheatsheet categories">
            {SHORTCUT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/cheatsheets?category=${c.id}`)}
                className="active:scale-[0.97] px-2 py-1 rounded-md text-[11px] bg-surface-sunken border border-subtle text-secondary hover:text-primary hover:border-strong cursor-pointer transition-interactive"
              >
                {c.name}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted text-center">
            Press{' '}
            <kbd className="px-1 rounded bg-surface-sunken border border-subtle font-mono">{DOCK_SWITCHER_SHORTCUT_LABEL}</kbd>{' '}
            any time to open anything.
          </p>
        </div>
      )}
    </div>
  );
};
