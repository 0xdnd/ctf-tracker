import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { ChevronRight, FileText, Folder, FolderOpen, Plus, Search, Terminal, Upload } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { cheatTabId, useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { buildCptsFileTree, type CptsNoteEntry, type CptsTreeNode } from '../../utils/obsidianManualUtils';
import { CHEATSHEET_CATEGORIES } from '../../data/cheatsheetsData';
import type { CheatsheetCommand } from '../../types';

/** Fixed row height so the (potentially hundreds of) note rows can be windowed without measuring. */
const ROW_HEIGHT = 28;
const OVERSCAN = 8;
/** Used before the scroller has been measured (first paint, jsdom). */
const FALLBACK_VIEWPORT = 480;

const MY_NOTES_KEY = 'my';
const CHEATS_KEY = 'cheats';
const CATEGORY_NAMES = new Map(CHEATSHEET_CATEGORIES.map((c) => [c.id, c.name]));

type Row =
  | { kind: 'folder'; key: string; label: string; depth: number; count: number; expanded: boolean }
  | { kind: 'leaf'; key: string; tabId: string; label: string; depth: number; icon: 'note' | 'cheat' };

const noteHaystack = (n: CptsNoteEntry): string =>
  [n.title, n.titleEn, n.relPath, n.filename, n.category, (n.tags ?? []).join(' ')].filter(Boolean).join(' ').toLowerCase();

const cheatHaystack = (c: CheatsheetCommand): string =>
  [c.title, CATEGORY_NAMES.get(c.category) ?? c.category, (c.tags ?? []).join(' ')].filter(Boolean).join(' ').toLowerCase();

const tokenize = (q: string): string[] => q.toLowerCase().split(/\s+/).filter(Boolean);

/** Folder keys of every ancestor of a note, matching the keys flattenTree() produces. */
function ancestorKeys(prefix: string, relPath: string): string[] {
  const parts = (relPath || '').replace(/\\/g, '/').split('/').map((p) => p.trim()).filter(Boolean);
  const keys: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) keys.push(`${prefix}folder-${parts.slice(0, i + 1).join('/')}`);
  return keys;
}

function flattenTree(
  nodes: CptsTreeNode[],
  depth: number,
  prefix: string,
  expanded: ReadonlySet<string>,
  forceExpand: boolean,
  out: Row[]
): void {
  for (const node of nodes) {
    if (node.isFolder) {
      const key = `${prefix}${node.id}`;
      const isExpanded = forceExpand || expanded.has(key);
      out.push({ kind: 'folder', key, label: node.name, depth, count: node.count, expanded: isExpanded });
      if (isExpanded) flattenTree(node.children, depth + 1, prefix, expanded, forceExpand, out);
    } else if (node.note) {
      out.push({
        kind: 'leaf',
        key: `${prefix}note-${node.note.id}`,
        tabId: node.note.id,
        label: node.note.title || node.note.titleEn || node.name,
        depth,
        icon: 'note',
      });
    }
  }
}

interface DockNotesListProps {
  /** Called after a note or snippet has been opened (the overlay variant closes itself with it). */
  onOpened?: () => void;
  className?: string;
}

/**
 * Left-hand "Notes" list of the dock: every note the user has (authored + imported vault) as a folder tree,
 * plus the cheatsheet catalog. Reads straight from the stores, so it re-renders when the vault hydrates or an
 * import lands. The tree is memoized and rows are windowed, so large vaults stay cheap.
 */
export const DockNotesList: React.FC<DockNotesListProps> = ({ onOpened, className = '' }) => {
  const navigate = useNavigate();
  const { customNotes, userNotes, cheatsheets, setNotesImportModalOpen } = useCtfStore(
    useShallow((s) => ({
      customNotes: s.customNotes,
      userNotes: s.userNotes,
      cheatsheets: s.cheatsheets,
      setNotesImportModalOpen: s.setNotesImportModalOpen,
    }))
  );
  const openNote = useNotesWorkspaceStore((s) => s.openNote);
  const openTabIds = useNotesWorkspaceStore((s) => s.openTabIds);
  const storedActiveTabId = useNotesWorkspaceStore((s) => s.activeTabId);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set([MY_NOTES_KEY]));
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listId = React.useId();

  const tokens = useMemo(() => tokenize(query), [query]);
  const filtering = tokens.length > 0;

  // Authored notes shadow imported notes with the same id (same rule as mergeUserNotePools).
  const { authored, imported } = useMemo(() => {
    const custom = customNotes ?? [];
    const ids = new Set(custom.map((n) => n.id));
    return { authored: custom, imported: (userNotes ?? []).filter((n) => !ids.has(n.id)) };
  }, [customNotes, userNotes]);

  const hay = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of authored) map.set(n.id, noteHaystack(n));
    for (const n of imported) map.set(n.id, noteHaystack(n));
    return map;
  }, [authored, imported]);

  const matches = useCallback(
    (h: string) => tokens.every((t) => h.includes(t)),
    [tokens]
  );

  // With no query the lists are returned as-is, so typing and clearing never rebuilds an unchanged tree.
  const shownAuthored = useMemo(
    () => (filtering ? authored.filter((n) => matches(hay.get(n.id) ?? '')) : authored),
    [filtering, authored, hay, matches]
  );
  const shownImported = useMemo(
    () => (filtering ? imported.filter((n) => matches(hay.get(n.id) ?? '')) : imported),
    [filtering, imported, hay, matches]
  );

  const authoredTree = useMemo(() => buildCptsFileTree(shownAuthored), [shownAuthored]);
  const importedTree = useMemo(() => buildCptsFileTree(shownImported), [shownImported]);

  const cheatGroups = useMemo(() => {
    const byCategory = new Map<string, CheatsheetCommand[]>();
    for (const c of cheatsheets ?? []) {
      if (filtering && !matches(cheatHaystack(c))) continue;
      const list = byCategory.get(c.category);
      if (list) list.push(c);
      else byCategory.set(c.category, [c]);
    }
    const known = CHEATSHEET_CATEGORIES.filter((c) => c.id !== 'all' && byCategory.has(c.id)).map((c) => c.id);
    const extra = [...byCategory.keys()].filter((id) => !CATEGORY_NAMES.has(id));
    return [...known, ...extra].map((id) => ({
      id,
      name: CATEGORY_NAMES.get(id) ?? id,
      entries: byCategory.get(id) ?? [],
    }));
  }, [cheatsheets, filtering, matches]);
  const cheatTotal = useMemo(() => cheatGroups.reduce((n, g) => n + g.entries.length, 0), [cheatGroups]);

  // What the dock actually shows, which can differ from the stored id before hydration.
  const activeNoteId = useMemo(() => {
    const active = useNotesWorkspaceStore.getState().getActiveTab();
    if (active) return active.kind === 'note' ? active.note.id : null;
    return storedActiveTabId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedActiveTabId, openTabIds, customNotes, userNotes]);
  const activeCheatTabId = storedActiveTabId && storedActiveTabId.startsWith('cheat:') ? storedActiveTabId : null;
  const openSet = useMemo(() => new Set(openTabIds), [openTabIds]);

  // Reveal the active note once per change: expand the folders it sits in.
  const revealedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeNoteId || revealedRef.current === activeNoteId) return;
    const inAuthored = authored.find((n) => n.id === activeNoteId);
    const inImported = inAuthored ? undefined : imported.find((n) => n.id === activeNoteId);
    const note = inAuthored ?? inImported;
    if (!note) return;
    revealedRef.current = activeNoteId;
    const keys = ancestorKeys(inAuthored ? `${MY_NOTES_KEY}:` : 'imp:', note.relPath || note.title);
    if (inAuthored) keys.push(MY_NOTES_KEY);
    if (keys.length === 0) return;
    setExpanded((prev) => {
      if (keys.every((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
  }, [activeNoteId, authored, imported]);

  const noteRows = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    if (shownAuthored.length > 0) {
      const open = filtering || expanded.has(MY_NOTES_KEY);
      rows.push({ kind: 'folder', key: MY_NOTES_KEY, label: 'My notes', depth: 0, count: shownAuthored.length, expanded: open });
      if (open) flattenTree(authoredTree, 1, `${MY_NOTES_KEY}:`, expanded, filtering, rows);
    }
    flattenTree(importedTree, 0, 'imp:', expanded, filtering, rows);
    return rows;
  }, [shownAuthored, authoredTree, importedTree, expanded, filtering]);

  const cheatsOpen = filtering ? cheatTotal > 0 : expanded.has(CHEATS_KEY);
  const cheatRows = useMemo<Row[]>(() => {
    if (!cheatsOpen) return [];
    const rows: Row[] = [];
    for (const g of cheatGroups) {
      const key = `${CHEATS_KEY}:${g.id}`;
      const open = filtering || expanded.has(key);
      rows.push({ kind: 'folder', key, label: g.name, depth: 0, count: g.entries.length, expanded: open });
      if (!open) continue;
      for (const c of g.entries) {
        rows.push({ kind: 'leaf', key: `cheat-${c.id}`, tabId: cheatTabId(c.id), label: c.title, depth: 1, icon: 'cheat' });
      }
    }
    return rows;
  }, [cheatsOpen, cheatGroups, expanded, filtering]);

  const allRows = useMemo(() => [...noteRows, ...cheatRows], [noteRows, cheatRows]);
  const safeIndex = allRows.length === 0 ? -1 : Math.min(activeIndex, allRows.length - 1);

  useEffect(() => {
    setActiveIndex(0);
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [query]);

  // Track the scroller height for windowing.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggleFolder = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const activateRow = useCallback(
    (row: Row) => {
      if (row.kind === 'folder') {
        // While filtering every folder is forced open, so toggling would do nothing visible.
        if (!filtering) toggleFolder(row.key);
        return;
      }
      openNote(row.tabId);
      onOpened?.();
    },
    [filtering, toggleFolder, openNote, onOpened]
  );

  const moveTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (index < noteRows.length) {
        const el = scrollerRef.current;
        if (!el) return;
        const vh = el.clientHeight || FALLBACK_VIEWPORT;
        const top = index * ROW_HEIGHT;
        if (top < el.scrollTop) el.scrollTop = top;
        else if (top + ROW_HEIGHT > el.scrollTop + vh) el.scrollTop = top + ROW_HEIGHT - vh;
        setScrollTop(el.scrollTop);
      } else {
        document.getElementById(`${listId}-row-${index}`)?.scrollIntoView?.({ block: 'nearest' });
      }
    },
    [noteRows.length, listId]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (allRows.length > 0) moveTo(Math.min(safeIndex + 1, allRows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (allRows.length > 0) moveTo(Math.max(safeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (safeIndex >= 0) activateRow(allRows[safeIndex]);
    } else if (e.key === 'Escape' && query) {
      // Only consumed while there is something to clear; otherwise Esc keeps its usual meaning.
      e.preventDefault();
      e.stopPropagation();
      setQuery('');
    }
  };

  const hasAnyNotes = authored.length + imported.length > 0;
  const vh = viewportH || FALLBACK_VIEWPORT;
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(noteRows.length, Math.ceil((scrollTop + vh) / ROW_HEIGHT) + OVERSCAN);

  const renderRow = (row: Row, index: number) => {
    const selected = index === safeIndex;
    const indent = { paddingLeft: `${6 + row.depth * 12}px` };
    if (row.kind === 'folder') {
      const FolderIcon = row.expanded ? FolderOpen : Folder;
      return (
        // Rows are driven by the filter input (aria-activedescendant), so they are not tab stops.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
        <div
          key={row.key}
          id={`${listId}-row-${index}`}
          role="treeitem"
          aria-level={row.depth + 1}
          aria-expanded={row.expanded}
          aria-selected={selected}
          data-dock-list-folder={row.key}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setActiveIndex(index);
            activateRow(row);
          }}
          style={{ ...indent, height: ROW_HEIGHT }}
          className={`flex items-center gap-1.5 pr-1.5 rounded-md cursor-pointer text-xs transition-interactive ${
            selected ? 'bg-surface-hover text-primary' : 'text-secondary hover:bg-surface-hover hover:text-primary'
          }`}
          title={row.label}
        >
          <ChevronRight
            className={`w-3 h-3 flex-shrink-0 text-muted transition-transform duration-150 ${row.expanded ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
          <FolderIcon className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden="true" />
          <span className="truncate font-medium flex-1 min-w-0">{row.label}</span>
          <span className="text-[10px] font-mono tabular-nums px-1.5 rounded bg-surface-sunken border border-subtle text-muted flex-shrink-0">
            {row.count}
          </span>
        </div>
      );
    }
    const isActive = row.icon === 'cheat' ? row.tabId === activeCheatTabId : row.tabId === activeNoteId;
    const isOpenTab = openSet.has(row.tabId);
    const Icon = row.icon === 'cheat' ? Terminal : FileText;
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
      <div
        key={row.key}
        id={`${listId}-row-${index}`}
        role="treeitem"
        aria-level={row.depth + 1}
        aria-selected={isActive}
        aria-current={isActive ? 'true' : undefined}
        data-dock-list-item={row.tabId}
        data-active={isActive ? 'true' : undefined}
        data-open={isOpenTab ? 'true' : undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setActiveIndex(index);
          activateRow(row);
        }}
        style={{ ...indent, height: ROW_HEIGHT }}
        className={`flex items-center gap-1.5 pr-1.5 rounded-md cursor-pointer text-xs border transition-interactive ${
          isActive
            ? 'bg-accent-muted text-accent font-semibold border-accent/40'
            : selected
              ? 'bg-surface-hover text-primary border-subtle'
              : 'text-secondary hover:bg-surface-hover hover:text-primary border-transparent'
        }`}
        title={row.label}
      >
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
        <span className="truncate flex-1 min-w-0">{row.label}</span>
        {isOpenTab && (
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-accent' : 'bg-accent/50'}`}
            role="img"
            aria-label="Open in a tab"
          />
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col min-h-0 bg-surface-card ${className}`} data-dock-notes-list>
      <div className="p-2 border-b border-subtle flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-sunken border border-subtle">
          <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden="true" />
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={safeIndex >= 0 ? `${listId}-row-${safeIndex}` : undefined}
            aria-label="Filter notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Filter notes..."
            className="w-full min-w-0 bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>

      <div
        id={listId}
        className="flex-1 min-h-0 flex flex-col"
      >
        <div
          ref={scrollerRef}
          role="tree"
          aria-label="Notes"
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="flex-1 min-h-[96px] overflow-y-auto overscroll-contain p-1.5"
          data-dock-list-scroller
        >
          {!hasAnyNotes ? (
            <div className="px-2 py-4 text-center space-y-2" data-dock-list-empty>
              <FileText className="w-6 h-6 text-muted mx-auto" aria-hidden="true" />
              <p className="text-xs text-muted">No notes yet. Import a markdown or Obsidian vault to search and read it here.</p>
              <button
                type="button"
                data-testid="dock-list-empty-import"
                onClick={() => setNotesImportModalOpen(true)}
                className="active:scale-[0.97] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-muted text-accent border border-accent cursor-pointer transition-interactive"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                Import notes
              </button>
            </div>
          ) : noteRows.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted">Nothing matches</div>
          ) : (
            <div style={{ paddingTop: start * ROW_HEIGHT, paddingBottom: (noteRows.length - end) * ROW_HEIGHT }}>
              {noteRows.slice(start, end).map((row, i) => renderRow(row, start + i))}
            </div>
          )}
        </div>

        {(cheatTotal > 0 || !filtering) && (
          <div className="border-t border-subtle flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!filtering) toggleFolder(CHEATS_KEY);
              }}
              aria-expanded={cheatsOpen}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-secondary hover:text-primary hover:bg-surface-hover cursor-pointer transition-interactive"
              data-dock-list-cheats-toggle
            >
              <ChevronRight
                className={`w-3 h-3 text-muted transition-transform duration-150 ${cheatsOpen ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
              <Terminal className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span className="flex-1 text-left">Cheatsheets</span>
              <span className="text-[10px] font-mono tabular-nums px-1.5 rounded bg-surface-sunken border border-subtle text-muted">
                {cheatTotal}
              </span>
            </button>
            {cheatsOpen && (
              <div role="tree" aria-label="Cheatsheets" className="max-h-44 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
                {cheatRows.map((row, i) => renderRow(row, noteRows.length + i))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 p-2 border-t border-subtle flex-shrink-0">
        <button
          type="button"
          onClick={() => setNotesImportModalOpen(true)}
          className="active:scale-[0.97] flex-1 inline-flex items-center justify-center gap-1 whitespace-nowrap px-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-surface-sunken text-secondary hover:text-primary border border-subtle hover:border-strong cursor-pointer transition-interactive"
          data-testid="dock-list-import"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          Import notes
        </button>
        <button
          type="button"
          onClick={() => {
            navigate('/notes?new=1');
            onOpened?.();
          }}
          className="active:scale-[0.97] flex-1 inline-flex items-center justify-center gap-1 whitespace-nowrap px-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-accent-muted text-accent border border-accent cursor-pointer transition-interactive"
          data-testid="dock-list-new"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          New note
        </button>
      </div>
    </div>
  );
};
