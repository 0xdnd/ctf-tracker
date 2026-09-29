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
  const allNotes = React.useMemo(() => getAllCptsNotes(), [customNotes]);
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
    <div className="relative flex items-center bg-slate-100 dark:bg-[#121215] border-b border-slate-200 dark:border-[#27272a] px-2 h-10 select-none flex-shrink-0">
      {/* Scrollable Tab Container */}
      <div 
        ref={tabStripRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2 py-1"
      >
        {openTabIds.map((tabId) => {
          const note = notesMap.get(tabId);
          const isActive = tabId === activeTabId;
          const title = note?.title || tabId.replace(/_/g, ' ');

          return (
            <div
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium cursor-pointer transition-colors border flex-shrink-0 max-w-[160px] sm:max-w-[200px] ${
                isActive
                  ? 'bg-white dark:bg-[#1e1e24] text-cyan-700 dark:text-cyber-cyan border-slate-300 dark:border-cyber-cyan/50 shadow-xs'
                  : 'bg-transparent text-slate-600 dark:text-zinc-400 border-transparent hover:bg-slate-200/70 dark:hover:bg-[#18181d] hover:text-slate-900 dark:hover:text-white'
              }`}
              title={title}
            >
              <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyber-cyan' : 'text-slate-400 dark:text-zinc-500'}`} />
              <span className="truncate text-[11px]">{title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabId);
                }}
                className={`p-0.5 rounded-sm hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors flex-shrink-0 ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Close Tab"
                aria-label={`Close tab ${title}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* New Tab Button */}
        <div className="relative" ref={searchContainerRef}>
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-[#1e1e24] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0 cursor-pointer"
            title="Open Note in Tab"
            aria-label="Open Note in Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Quick Search Dropdown */}
          {isSearchOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#27272a] shadow-2xl p-2.5 z-50 space-y-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a]">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search field notes & guides..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto space-y-0.5 scrollbar-thin">
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
                      }}
                      className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-colors text-xs font-mono cursor-pointer ${
                        isAlreadyOpen
                          ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyber-cyan'
                          : 'hover:bg-slate-100 dark:hover:bg-[#1f1f25] text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                        <span className="truncate font-medium">{note.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex-shrink-0">
                        {note.category}
                      </span>
                    </button>
                  );
                })}
                {filteredNotes.length === 0 && (
                  <div className="text-center py-3 text-slate-400 dark:text-zinc-500 text-xs font-mono">
                    No notes found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Strip Right Actions: Close All */}
      {openTabIds.length > 1 && (
        <button
          type="button"
          onClick={closeAllTabs}
          className="px-1.5 py-1 rounded-md text-[10px] font-mono text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-[#1e1e24] transition-colors flex-shrink-0 cursor-pointer ml-1"
          title="Close All Tabs"
        >
          Close All
        </button>
      )}
    </div>
  );
};
