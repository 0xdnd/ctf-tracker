import React, { useEffect, useRef } from 'react';
import {
  ArrowLeft,
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
import { OverflowMenu } from '../common/OverflowMenu';
import { CompactIconButton } from '../common/CompactIconButton';
import { CyberButton } from '../common/CyberButton';
import { EmptyState } from '../common/EmptyState';
import { confirmAction } from '../../store/useConfirmStore';
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
  wipeCount: number;
  onWipeVault: () => void;
  onShowCards: () => void;
  onShowTable: () => void;
  onBackToSnippets: () => void;
  /** Optional top-of-rail shortcut back to the ZeroBox tracker. */
  onBackToTracker?: () => void;
}

const PANEL_TITLES: Record<NotesRibbonPanel, string> = { files: 'Files', search: 'Search', tags: 'Tags' };

const iconBtn = 'tap-target-sm inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const footBtn = 'w-full justify-start';

export const NotesLeftPanel: React.FC<NotesLeftPanelProps> = (props) => {
  const {
    view, onCollapse, focusSignal, tree, expandedFolders, onToggleFolder, selectedPath, onSelectFolder,
    onSelectNote, onDeleteNote, onAddNoteToFolder, langMode, activeNoteId, onExpandAll, onCollapseAll,
    onNewNote, onImport, activeTag, onClearTag, query, onQueryChange, results, onOpenResult, tags,
    onSelectTag, deletedCount, onRestoreDeleted, wipeCount, onWipeVault, onShowCards,
    onShowTable, onBackToSnippets, onBackToTracker,
  } = props;

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (view === 'search') searchRef.current?.focus();
  }, [view, focusSignal]);

  const snippetQuery = query.trim().length >= 2 ? query : '';

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-surface-card">
      {onBackToTracker && (
        <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-subtle bg-surface-sunken/50 px-3">
          <button
            type="button"
            onClick={onBackToTracker}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary transition-colors hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            title="Return to ZeroBox Tracker"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>ZeroBox Tracker</span>
          </button>
        </div>
      )}
      <div className="flex h-9 flex-shrink-0 items-center justify-between gap-1 border-b border-subtle px-3">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[.06em] text-secondary">
          {PANEL_TITLES[view]}
        </span>
        <div className="flex items-center gap-0.5">
          {view === 'files' && (
            <>
              <CompactIconButton onClick={onNewNote} title="Create new field note" aria-label="Create new field note">
                <Plus className="h-4 w-4" aria-hidden={true} />
              </CompactIconButton>
              <CompactIconButton
                onClick={onImport}
                title="Import notes directory"
                aria-label="Import notes directory"
                data-tour="notes-page-import"
              >
                <Upload className="h-4 w-4" aria-hidden={true} />
              </CompactIconButton>
              <CompactIconButton onClick={onExpandAll} title="Expand all folders" aria-label="Expand all folders">
                <ChevronsUpDown className="h-4 w-4" aria-hidden={true} />
              </CompactIconButton>
              <CompactIconButton onClick={onCollapseAll} title="Collapse all folders" aria-label="Collapse all folders">
                <ChevronsDownUp className="h-4 w-4" aria-hidden={true} />
              </CompactIconButton>
            </>
          )}
          {view === 'files' && wipeCount > 0 && (
            <OverflowMenu
              portal
              label="More file actions"
              className={iconBtn}
              items={[
                {
                  id: 'delete-all',
                  label: `Delete all imported notes (${wipeCount})`,
                  icon: <Trash2 className="h-3.5 w-3.5" aria-hidden={true} />,
                  danger: true,
                  onSelect: () => {
                    void confirmAction({
                      title: `Delete all ${wipeCount} notes?`,
                      body: `This removes all ${wipeCount} notes from the notes list. This cannot be undone.`,
                      confirmLabel: 'Delete all',
                      tone: 'danger',
                    }).then((ok) => {
                      if (ok) onWipeVault();
                    });
                  },
                },
              ]}
            />
          )}
          <CompactIconButton onClick={onCollapse} title="Collapse explorer (Ctrl+B)" aria-label="Collapse sidebar">
            <PanelLeft className="h-4 w-4" aria-hidden={true} />
          </CompactIconButton>
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
              <EmptyState
                compact
                icon={FolderOpen}
                title="No notes here"
                description="Import your notes directory from disk or create a note."
              />
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
                aria-label="Search notes"
                placeholder="Search notes…"
                className="w-full rounded-lg border border-subtle bg-surface-sunken py-1.5 pl-2.5 pr-8 text-xs text-primary placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => onQueryChange('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded cursor-pointer text-xs text-muted hover:text-primary"
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
          <CyberButton variant="secondary" size="sm" className={footBtn} onClick={onShowCards} title="Cards Gallery" iconLeft={<LayoutList className="h-3.5 w-3.5" aria-hidden={true} />}>
            Cards
          </CyberButton>
          <CyberButton variant="secondary" size="sm" className={footBtn} onClick={onShowTable} title="Quick Index Table" iconLeft={<Table className="h-3.5 w-3.5" aria-hidden={true} />}>
            Table
          </CyberButton>
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
        <CyberButton variant="secondary" size="sm" className={footBtn} onClick={onBackToSnippets} iconLeft={<Terminal className="h-3.5 w-3.5" aria-hidden={true} />}>
          Snippets
        </CyberButton>
      </div>
    </div>
  );
};
