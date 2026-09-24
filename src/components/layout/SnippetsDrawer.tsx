import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { 
  X, 
  Search, 
  Terminal, 
  Copy, 
  Check, 
  Star, 
  ExternalLink,
  Code2,
  Sparkles
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { interpolateCommand, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { CHEATSHEET_CATEGORIES } from '../../data/cheatsheetsData';
import { useNavigate } from 'react-router-dom';

export const SnippetsDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    snippetsDrawerOpen,
    setSnippetsDrawerOpen,
    cheatsheets,
    globalVars,
    soundEnabled,
    toggleStarCommand,
  } = useCtfStore(
    useShallow((s) => ({
      snippetsDrawerOpen: s.snippetsDrawerOpen,
      setSnippetsDrawerOpen: s.setSnippetsDrawerOpen,
      cheatsheets: s.cheatsheets,
      globalVars: s.globalVars,
      soundEnabled: s.soundEnabled,
      toggleStarCommand: s.toggleStarCommand,
    }))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: snippetsDrawerOpen,
    onClose: () => setSnippetsDrawerOpen(false),
  });

  // Focus search input when drawer opens
  useEffect(() => {
    if (snippetsDrawerOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [snippetsDrawerOpen]);

  const filteredCommands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cheatsheets.filter((cmd) => {
      if (selectedCategory !== 'all' && selectedCategory !== 'starred') {
        if (cmd.category !== selectedCategory) return false;
      }
      if (selectedCategory === 'starred' && !cmd.isStarred) return false;

      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.commandTemplate.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [cheatsheets, searchQuery, selectedCategory]);

  const handleCopy = (id: string, text: string) => {
    safeCopyToClipboard(text);
    if (soundEnabled) playCyberSound('copy');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!snippetsDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-mono">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => setSnippetsDrawerOpen(false)}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Tactical snippets cheatsheet drawer"
          className="w-screen max-w-md md:max-w-lg bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col h-full transform transition-transform will-change-transform animate-in slide-in-from-right duration-200"
          style={{ transform: 'translate3d(0, 0, 0)', contain: 'layout paint' }}
        >
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-sm text-zinc-100 uppercase tracking-wider">
                TACTICAL SNIPPETS
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
                Alt+S
              </span>
            </div>
            <button
              onClick={() => setSnippetsDrawerOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Close Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Active Variable Indicator */}
          <div className="p-3 bg-zinc-900/40 border-b border-zinc-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands, flags, tools (nmap, smb, hashcat)..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-zinc-500 hover:text-zinc-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Micro variable badges */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 overflow-x-auto pb-0.5">
              <span className="text-zinc-500 uppercase font-bold">Auto-Bound:</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                LHOST: <strong className="text-cyan-400">{globalVars.lhost || '10.10.14.X'}</strong>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                LPORT: <strong className="text-cyan-400">{globalVars.lport || '4444'}</strong>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                RHOST: <strong className="text-emerald-400">{globalVars.targetIp || '10.10.10.X'}</strong>
              </span>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800/80 overflow-x-auto text-xs scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              All ({cheatsheets.length})
            </button>
            <button
              onClick={() => setSelectedCategory('starred')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                selectedCategory === 'starred'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Star className="w-3 h-3 text-amber-400" />
              <span>Starred</span>
            </button>
            {CHEATSHEET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Snippet List */}
          <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
            {filteredCommands.map((cmd) => {
              const interpolated = interpolateCommand(cmd.commandTemplate, globalVars);
              const isCopied = copiedId === cmd.id;

              return (
                <div
                  key={cmd.id}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100 text-xs">{cmd.title}</span>
                      {cmd.isCustom && (
                        <span className="text-[9px] px-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          CUSTOM
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleStarCommand(cmd.id)}
                        className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                          cmd.isStarred ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                        title={cmd.isStarred ? 'Unstar' : 'Star command'}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => handleCopy(cmd.id, interpolated)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 border ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700'
                        }`}
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                  </div>

                  {cmd.description && (
                    <div className="text-[11px] text-zinc-400 line-clamp-2">
                      {cmd.description}
                    </div>
                  )}

                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs font-mono text-zinc-300 break-all select-all">
                    {interpolated}
                  </div>
                </div>
              );
            })}

            {filteredCommands.length === 0 && (
              <div className="text-center py-10 text-zinc-500 text-xs space-y-2">
                <div>No tactical snippets found matching query.</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-t border-zinc-800 text-xs text-zinc-400">
            <span>{filteredCommands.length} snippets available</span>
            <button
              onClick={() => {
                setSnippetsDrawerOpen(false);
                navigate('/cheatsheets');
              }}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline text-xs"
            >
              <span>Full Cheatsheet Matrix</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
