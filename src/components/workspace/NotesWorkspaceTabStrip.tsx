import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  FileText, 
  Search, 
  Trash2, 
  Pin, 
  Layers 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { getAllCptsNotes, CptsNoteEntry } from '../../utils/obsidianManualUtils';

export const NotesWorkspaceTabStrip: React.FC = () => {
  const {
    openTabIds,
    activeTabId,
    setActiveTab,
    closeTab,
    closeAllTabs,
    openNote,
  } = useNotesWorkspaceStore();

  const customNotes = useCtfStore((s) => s.customNotes || []);
  const userNotes = useCtfStore((s) => s.userNotes || []);
  const allNotes = React.useMemo(() => [...(customNotes || []), ...getAllCptsNotes()], [customNotes, userNotes]);
  const notesMap = React.useMemo(() => new Map(allNotes.map((n) => [n.id, n])), [allNotes]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const tabStripRef = useRef<HTMLDivElement>(null);

  // Close search popover on outside click
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const filteredNotes = React.useMemo(() => {
    if (!searchQuery.trim()) return allNotes.slice(0, 15);
    const q = searchQuery.toLowerCase();
    return allNotes
      .filter((n) => n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allNotes, searchQuery]);

  return (
    <div className="relative flex items-center bg-surface-sunken border-b border-subtle px-2 h-10 select-none flex-shrink-0">
      {/* Scrollable Tab Container */}
      <div 
        ref={tabStripRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2 py-1"
      >
        {openTabIds.map((tabId) => {
          const note = notesMap.get(tabId);
          const isActive = tabId === activeTabId;
          const title = note?.title || tabId.replace(/[_-]/g, ' ');

          return (
            <div
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border flex-shrink-0 max-w-[160px] sm:max-w-[200px] ${
                isActive
                  ? 'text-accent border-transparent'
                  : 'bg-transparent text-secondary border-transparent hover:bg-surface-hover hover:text-primary'
              }`}
              title={title}
            >
              {isActive && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={TACTICAL_SPRING}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-md bg-surface-card border border-accent/50 pointer-events-none"
                />
              )}
              <FileText className={`relative w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} />
              <span className="relative truncate text-[11px]">{title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabId);
                }}
                className={`relative p-1 rounded-sm hover:bg-surface-hover text-muted hover:text-secondary transition-colors flex-shrink-0 min-w-[20px] min-h-[20px] flex items-center justify-center cursor-pointer ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'
                }`}
                title="Close Tab"
                aria-label={`Close tab ${title}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Tab Strip Controls (New Tab + Close All) */}
      <div className="flex items-center gap-1 flex-shrink-0 pl-1">
        {/* New Tab Button */}
        <div className="relative" ref={searchContainerRef}>
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
            title="Open Note in Tab"
            aria-label="Open Note in Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Quick Search Dropdown */}
          {isSearchOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl bg-surface-card border border-strong shadow-2xl p-2.5 z-50 space-y-2 max-w-[calc(100vw-1.5rem)]">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-sunken border border-subtle">
                <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search field notes & guides..."
                  className="w-full bg-transparent text-xs text-primary placeholder-muted focus:outline-none"
                />
                {searchQuery && (
                  <button aria-label="Clear search"
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-muted hover:text-secondary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="max-h-[48vh] sm:max-h-56 overflow-y-auto space-y-0.5 scrollbar-thin overscroll-contain">
                {filteredNotes.map((note) => {
                  const isAlreadyOpen = openTabIds.includes(note.id);
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => {
                        openNote(note.id);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        if (searchInputRef.current) {
                          searchInputRef.current.blur();
                        }
                      }}
                      className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-colors text-xs cursor-pointer ${
                        isAlreadyOpen
                          ? 'bg-accent-muted text-accent'
                          : 'hover:bg-surface-sunken text-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                        <span className="truncate font-medium">{note.title}</span>
                      </div>
                      <span className="text-[10px] text-muted flex-shrink-0">
                        {note.category}
                      </span>
                    </button>
                  );
                })}
                {filteredNotes.length === 0 && (
                  <div className="text-center py-3 text-muted text-xs">
                    No notes found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Strip Right Actions: Close All */}
        {openTabIds.length > 1 && (
          <button
            type="button"
            onClick={closeAllTabs}
            className="px-1.5 py-1 rounded-md text-[10px] text-muted hover:text-callout-danger-fg hover:bg-surface-hover transition-colors flex-shrink-0 cursor-pointer"
            title="Close All Tabs"
          >
            Close All
          </button>
        )}
      </div>
    </div>
  );
};
