import React, { useEffect, useRef } from 'react';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  FolderOpen,
  LayoutList,
  PanelLeft,
  Plus,
  Table,
  Terminal,
  Trash2,
  Upload,
} from 'lucide-react';
import type { CptsNoteEntry, CptsTreeNode } from '../../utils/obsidianManualUtils';
import { CptsTreeItem } from '../cheatsheet/CptsTreeItem';
import { NoteMatchSnippets } from '../cheatsheet/NoteMatchSnippets';
import { NoteTagsPanel } from './NoteTagsPanel';
import type { NotesRibbonPanel } from './NotesRibbon';

export interface NotesLeftPanelProps {
  view: NotesRibbonPanel;
  onCollapse: () => void;
  /** Bump to re-focus the search box when the Search view is reopened while already selected. */
  focusSignal?: number;
  // files
  tree: CptsTreeNode[];
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  selectedPath: string | null;
  onSelectFolder: (path: string) => void;
  onSelectNote: (n: CptsNoteEntry) => void;
  onDeleteNote?: (id: string, title: string) => void;
  onAddNoteToFolder?: (dir: string) => void;
  langMode: 'en' | 'he';
  activeNoteId?: string | null;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onNewNote: () => void;
  onImport: () => void;
  activeTag: string | null;
  onClearTag: () => void;
  // search
  query: string;
  onQueryChange: (q: string) => void;
  results: CptsNoteEntry[];
  /** True while the deferred query lags the typed one; results are stale and not shown. */
  resultsPending?: boolean;
  onOpenResult: (n: CptsNoteEntry) => void;
  // tags
  tags: Map<string, string[]>;
  onSelectTag: (tag: string | null) => void;
  // footer
  deletedCount: number;
  onRestoreDeleted: () => void;
  wipeArmed: boolean;
  wipeCount: number;
  onWipeVault: () => void;
  onShowCards: () => void;
  onShowTable: () => void;
  onBackToSnippets: () => void;
}

const PANEL_TITLES: Record<NotesRibbonPanel, string> = { files: 'Files', search: 'Search', tags: 'Tags' };

const iconBtn =
  'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';
const footBtn =
  'flex w-full cursor-pointer items-center gap-2 rounded-md border border-subtle px-2.5 py-1.5 text-xs text-muted transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';

export const NotesLeftPanel: React.FC<NotesLeftPanelProps> = (props) => {
  const {
    view, onCollapse, focusSignal, tree, expandedFolders, onToggleFolder, selectedPath, onSelectFolder,
    onSelectNote, onDeleteNote, onAddNoteToFolder, langMode, activeNoteId, onExpandAll, onCollapseAll,
    onNewNote, onImport, activeTag, onClearTag, query, onQueryChange, results, onOpenResult, tags,
    onSelectTag, deletedCount, onRestoreDeleted, wipeArmed, wipeCount, onWipeVault, onShowCards,
    onShowTable, onBackToSnippets,
  } = props;

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (view === 'search') searchRef.current?.focus();
  }, [view, focusSignal]);

  const snippetQuery = query.trim().length >= 2 ? query : '';

  return (
    <div className="flex h-full w-[260px] flex-col overflow-hidden bg-surface-card">
      <div className="flex h-10 flex-shrink-0 items-center justify-between gap-1 border-b border-subtle px-3">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[.06em] text-secondary">
          {PANEL_TITLES[view]}
        </span>
        <div className="flex items-center gap-0.5">
          {view === 'files' && (
            <>
              <button type="button" className={iconBtn} onClick={onNewNote} title="Create new field note" aria-label="Create new field note">
                <Plus className="h-4 w-4" aria-hidden={true} />
              </button>
              <button
                type="button"
                className={iconBtn}
                onClick={onImport}
                title="Import notes directory"
                aria-label="Import notes directory"
                data-tour="notes-page-import"
              >
                <Upload className="h-4 w-4" aria-hidden={true} />
              </button>
              <button type="button" className={iconBtn} onClick={onExpandAll} title="Expand all folders" aria-label="Expand all folders">
                <ChevronsUpDown className="h-4 w-4" aria-hidden={true} />
              </button>
              <button type="button" className={iconBtn} onClick={onCollapseAll} title="Collapse all folders" aria-label="Collapse all folders">
                <ChevronsDownUp className="h-4 w-4" aria-hidden={true} />
              </button>
            </>
          )}
          <button type="button" className={iconBtn} onClick={onCollapse} title="Collapse explorer (Ctrl+B)" aria-label="Collapse sidebar">
            <PanelLeft className="h-4 w-4" aria-hidden={true} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
        {view === 'files' && (
          <div className="space-y-0.5">
            {activeTag && (
              <button
                type="button"
                aria-label="Clear tag filter"
                onClick={onClearTag}
                className="w-full cursor-pointer rounded-md border border-accent/40 bg-accent-muted px-2 py-1 text-left text-[11px] font-semibold text-accent transition-colors duration-150 motion-reduce:transition-none hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
              >
                × #{activeTag}
              </button>
            )}
            {tree.length === 0 ? (
              <div className="my-2 space-y-2.5 rounded-md border border-accent/40 bg-accent-muted p-4 text-center">
                <FolderOpen className="mx-auto h-8 w-8 text-accent" aria-hidden={true} />
                <div className="text-xs font-semibold text-primary">No notes here</div>
                <p className="text-[10px] text-secondary">Import your notes directory from disk or create a note.</p>
              </div>
            ) : (
              tree.map((root) => (
                <CptsTreeItem
                  key={root.id}
                  node={root}
                  depth={0}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                  selectedPath={selectedPath}
                  onSelectFolder={onSelectFolder}
                  onSelectNote={onSelectNote}
                  onDeleteNote={onDeleteNote}
                  onAddNoteToFolder={onAddNoteToFolder}
                  cptsLangMode={langMode}
                  activeNoteId={activeNoteId}
                />
              ))
            )}
          </div>
        )}

        {view === 'search' && (
          <div className="space-y-2">
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                aria-label="Search field manual notes"
                placeholder="Search notes…"
                className="w-full rounded-md border border-subtle bg-surface-sunken py-1.5 pl-2.5 pr-7 text-xs text-primary placeholder:text-muted focus:border-accent focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-xs text-muted hover:text-primary"
                >
                  ✕
                </button>
              )}
            </div>
            <div data-testid="notes-search-results" className="space-y-0.5">
              {!query.trim() ? (
                <p className="px-1 py-2 text-xs text-muted">Type to search note text.</p>
              ) : props.resultsPending ? (
                <p className="px-1 py-2 text-xs text-muted">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted">No results.</p>
              ) : (
                results.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    title={`Open Obsidian Note: ${n.titleEn || n.title}`}
                    onClick={() => onOpenResult(n)}
                    className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs text-secondary transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
                  >
                    <span className="block truncate font-medium">
                      {langMode === 'he' ? n.titleHe || n.title : n.titleEn || n.title}
                    </span>
                    {snippetQuery && <NoteMatchSnippets markdown={n.rawMarkdown} query={snippetQuery} />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'tags' && <NoteTagsPanel tags={tags} activeTag={activeTag} onSelectTag={onSelectTag} />}
      </div>

      <div className="flex flex-shrink-0 flex-col gap-1.5 border-t border-subtle bg-surface-sunken/40 p-2">
        <div className="flex gap-1.5">
          <button type="button" className={footBtn} onClick={onShowCards} title="Cards Gallery">
            <LayoutList className="h-3.5 w-3.5" aria-hidden={true} />
            <span>Cards</span>
          </button>
          <button type="button" className={footBtn} onClick={onShowTable} title="Quick Index Table">
            <Table className="h-3.5 w-3.5" aria-hidden={true} />
            <span>Table</span>
          </button>
        </div>
        {deletedCount > 0 && (
          <button
            type="button"
            onClick={onRestoreDeleted}
            title="Click to restore all deleted field notes"
            className="w-full cursor-pointer rounded-md border border-callout-danger-border/40 bg-callout-danger-bg p-1.5 px-2 text-left text-[10px] font-semibold text-callout-danger-fg transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
          >
            ↺ {deletedCount} deleted · Restore
          </button>
        )}
        {wipeCount > 0 && (
          <button
            type="button"
            data-testid="header-delete-notes-btn"
            onClick={onWipeVault}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 ${
              wipeArmed
                ? 'border border-callout-danger-border bg-callout-danger-bg text-callout-danger-fg'
                : 'border border-subtle text-muted hover:bg-callout-danger-bg hover:text-callout-danger-fg'
            }`}
            title={
              wipeArmed
                ? `Click again to permanently delete all ${wipeCount} notes (cannot be undone)`
                : `Delete all ${wipeCount} notes`
            }
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden={true} />
            <span>{wipeArmed ? `Confirm Delete (${wipeCount})?` : `Delete (${wipeCount})`}</span>
          </button>
        )}
        <button type="button" className={footBtn} onClick={onBackToSnippets}>
          <Terminal className="h-3.5 w-3.5" aria-hidden={true} />
          <span>← Back to snippets</span>
        </button>
      </div>
    </div>
  );
};

export default NotesLeftPanel;
