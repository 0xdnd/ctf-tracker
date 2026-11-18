import React from 'react';
import {
  Search,
  ChevronDown,
  Folder,
  FolderOpen,
  Hash,
  ArrowUpDown,
  BookOpen,
  LayoutList,
  Table,
  PanelLeft,
} from 'lucide-react';
import { CptsNoteEntry, CptsSortOrder, getCategoryTopicGroups } from '../../../utils/obsidianManualUtils';
import { playCyberSound } from '../../../utils/helpers';
import type { CptsDisplayLayout, ObsidianNavView } from './types';

interface FieldManualHeaderProps {
  handleToggleObsidianSidebar: () => void;
  leftOpenNow: boolean;
  selectedCptsCategory: string;
  selectedCptsSubCategory: string;
  setSelectedCptsSubCategory: (value: string) => void;
  allActiveNotes: CptsNoteEntry[];
  filteredCptsNotes: CptsNoteEntry[];
  jumpDropdownOpen: boolean;
  setJumpDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  jumpSearchQuery: string;
  setJumpSearchQuery: (value: string) => void;
  setActiveObsidianNote: (note: CptsNoteEntry | null) => void;
  obsidianNavView: ObsidianNavView;
  setObsidianNavView: (view: ObsidianNavView) => void;
  soundEnabled: boolean;
  cptsSortOrder: CptsSortOrder;
  setCptsSortOrder: (order: CptsSortOrder) => void;
  setCptsLimit: (limit: number) => void;
  setCptsDisplayLayout: (layout: CptsDisplayLayout) => void;
  selectedTreePath: string | null;
  setSelectedTreePath: (path: string | null) => void;
  activeCategoryTopicGroups: ReturnType<typeof getCategoryTopicGroups>;
}

export const FieldManualHeader: React.FC<FieldManualHeaderProps> = ({
  handleToggleObsidianSidebar,
  leftOpenNow,
  selectedCptsCategory,
  selectedCptsSubCategory,
  setSelectedCptsSubCategory,
  allActiveNotes,
  filteredCptsNotes,
  jumpDropdownOpen,
  setJumpDropdownOpen,
  jumpSearchQuery,
  setJumpSearchQuery,
  setActiveObsidianNote,
  obsidianNavView,
  setObsidianNavView,
  soundEnabled,
  cptsSortOrder,
  setCptsSortOrder,
  setCptsLimit,
  setCptsDisplayLayout,
  selectedTreePath,
  setSelectedTreePath,
  activeCategoryTopicGroups,
}) => {
  return (
    <div className="p-3.5 rounded-xl border border-subtle bg-surface-card space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-testid="hud-toggle-sidebar-button"
            onClick={handleToggleObsidianSidebar}
            className="p-1 mr-1 rounded-lg hover:bg-surface-hover text-muted hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
            title={leftOpenNow ? "Collapse explorer (Ctrl+B)" : "Expand explorer (Ctrl+B)"}
            aria-label={leftOpenNow ? "Collapse explorer" : "Expand explorer"}
          >
            <PanelLeft className={`w-4 h-4 ${leftOpenNow ? 'text-accent' : 'text-muted'}`} />
          </button>
          <BookOpen className="w-4 h-4 text-accent" />
          <span className="text-primary font-semibold">
            Your notes
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-accent-muted text-accent font-semibold">
            {selectedCptsCategory === 'ALL'
              ? allActiveNotes.length > 0
                ? `All notes (${allActiveNotes.length})`
                : 'No notes yet'
              : selectedCptsCategory}
          </span>
          {selectedCptsSubCategory !== 'ALL' && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-accent-muted border border-accent/40 text-accent flex items-center gap-1 font-semibold">
              <span>📁 {selectedCptsSubCategory}</span>
              <button
                type="button"
                onClick={() => setSelectedCptsSubCategory('ALL')}
                className="hover:text-primary text-accent ml-1 font-semibold"
                title="Clear subcategory filter"
                aria-label="Clear subcategory filter"
              >
                ✕
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Jump to Note Combobox */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setJumpDropdownOpen((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-surface-card border border-accent/40 text-accent hover:text-accent text-xs flex items-center gap-1.5 font-semibold transition-colors"
              title="Quick search and jump to any note directly"
            >
              <Search className="w-3.5 h-3.5 text-accent" />
              <span>Jump to Note...</span>
              <ChevronDown className="w-3 h-3 text-accent" />
            </button>

            {jumpDropdownOpen && (
              <>
                <div
                  role="presentation"
                  className="fixed inset-0 z-40"
                  onClick={() => setJumpDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-80 max-h-96 rounded-xl border border-accent/50 bg-surface-card/95 backdrop-blur-md shadow-2xl p-2 z-50 space-y-2 animate-fade-in">
                  <input
                    id="cpts-jump-search-input"
                    name="cpts-jump-search"
                    aria-label="Type note name, tag, or tool"
                    type="text"
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- search field in a just-opened dropdown
                    autoFocus
                    value={jumpSearchQuery}
                    onChange={(e) => setJumpSearchQuery(e.target.value)}
                    placeholder="Type note name, tag, or tool..."
                    className="w-full bg-surface-card px-2.5 py-1.5 rounded-lg border border-accent/40 text-primary text-xs focus:outline-none focus:border-accent"
                  />
                  <div className="max-h-72 overflow-y-auto space-y-1 divide-y divide-subtle/30">
                    {(jumpSearchQuery.trim() ? allActiveNotes : filteredCptsNotes)
                      .filter((n) => {
                        if (!jumpSearchQuery.trim()) return true;
                        const q = jumpSearchQuery.toLowerCase();
                        return (
                          n.title.toLowerCase().includes(q) ||
                          (n.titleEn && n.titleEn.toLowerCase().includes(q)) ||
                          (n.titleHe && n.titleHe.toLowerCase().includes(q)) ||
                          (n.subCategory && n.subCategory.toLowerCase().includes(q)) ||
                          (n.tools && n.tools.some((t) => t.toLowerCase().includes(q)))
                        );
                      })
                      .slice(0, 40)
                      .map((note) => (
                        <div
                          key={note.id}
                          className="flex items-center gap-1 w-full rounded hover:bg-accent/40 transition-colors p-1 group"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setJumpDropdownOpen(false);
                              setActiveObsidianNote(note);
                              setObsidianNavView('files');
                              if (soundEnabled) playCyberSound('root');
                            }}
                            className="flex-1 text-left px-1.5 py-1 rounded transition-colors flex flex-col min-w-0 cursor-pointer"
                            title="Open full Obsidian note"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-primary text-xs font-semibold group-hover:text-accent truncate flex-1">
                                {note.titleEn || note.title}
                              </span>
                              <span className="text-[9px] px-1 rounded bg-surface-sunken text-accent flex-shrink-0">
                                {note.category.split(' ')[0]}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted truncate block">
                              {note.subCategory || note.category}
                            </span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
            <button
              type="button"
              onClick={() => {
                setCptsSortOrder('number');
                setCptsLimit(30);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                cptsSortOrder === 'number'
                  ? 'bg-accent text-on-accent'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Number</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCptsSortOrder('topic');
                setCptsLimit(30);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                cptsSortOrder === 'topic'
                  ? 'bg-accent text-on-accent'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Topic</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCptsSortOrder('title');
                setCptsLimit(30);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                cptsSortOrder === 'title'
                  ? 'bg-accent text-on-accent'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>A → Z</span>
            </button>
          </div>

          {/* Display Layout Switcher */}
          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
            <button
              type="button"
              onClick={() => {
                setObsidianNavView('files');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                (obsidianNavView as string) === 'files'
                  ? 'bg-accent text-on-accent'
                  : 'text-secondary hover:text-primary'
              }`}
              title="Switch to Obsidian Note Reader"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCptsDisplayLayout('cards');
                setObsidianNavView('cards');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                obsidianNavView === 'cards'
                  ? 'bg-accent text-on-accent'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCptsDisplayLayout('quick-index');
                setObsidianNavView('index');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                obsidianNavView === 'index'
                  ? 'bg-accent text-on-accent'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Folder Filter Indicator */}
      {selectedTreePath && (
        <div className="flex items-center justify-between p-2 px-3 rounded-lg bg-accent-muted border border-accent/40 text-xs">
          <div className="flex items-center gap-2 text-accent truncate">
            <FolderOpen className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="truncate">
              Folder: <strong className="text-primary font-mono">{selectedTreePath.split('/').pop()?.replace(/^\d+[\s_.-]*/, '') || selectedTreePath}</strong> (<strong className="text-accent">{filteredCptsNotes.length} notes</strong>)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTreePath(null)}
            className="text-[10px] text-accent hover:text-accent underline font-semibold flex-shrink-0 cursor-pointer ml-2"
          >
            ✕ Clear Filter
          </button>
        </div>
      )}

      {/* Topic Filter Chips */}
      {activeCategoryTopicGroups.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin pt-1 border-t border-accent/20">
          <button
            type="button"
            onClick={() => {
              setSelectedCptsSubCategory('ALL');
              setCptsLimit(30);
            }}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors ${
              selectedCptsSubCategory === 'ALL'
                ? 'bg-accent text-on-accent'
                : 'bg-surface-elevated border border-subtle text-secondary hover:text-primary'
            }`}
          >
            ALL ({filteredCptsNotes.length})
          </button>
          {activeCategoryTopicGroups.map((tg) => {
            const isGroupActive = selectedCptsSubCategory === tg.group;
            return (
              <button
                key={tg.group}
                type="button"
                onClick={() => {
                  setSelectedCptsSubCategory(isGroupActive ? 'ALL' : tg.group);
                  setCptsLimit(30);
                }}
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors flex items-center gap-1.5 ${
                  isGroupActive
                    ? 'bg-accent text-on-accent border border-accent/40'
                    : 'bg-surface-elevated border border-subtle text-secondary hover:text-accent'
                }`}
              >
                <span>📁 {tg.group}</span>
                <span className={`text-[9px] px-1 rounded-full ${isGroupActive ? 'bg-accent text-on-accent' : 'bg-surface-hover text-accent'}`}>
                  {tg.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
