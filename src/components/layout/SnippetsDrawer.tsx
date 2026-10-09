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
  AlertTriangle
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { interpolateCommand, getUnresolvedTokens, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
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

﻿  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-inverse/60 transition-opacity animate-in fade-in duration-200"
        onClick={() => setSnippetsDrawerOpen(false)}
      />

      {/* Slide-over panel (intentionally dark in both color modes) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Tactical snippets cheatsheet drawer"
          className="w-screen max-w-md md:max-w-lg bg-surface-inverse text-on-inverse border-l border-inverse shadow-xl flex flex-col h-full transform transition-transform will-change-transform animate-in slide-in-from-right duration-200"
          style={{ transform: 'translate3d(0, 0, 0)', contain: 'layout paint' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-inverse-elevated border-b border-inverse">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-on-inverse-muted" />
              <span className="font-semibold text-sm text-on-inverse tracking-tight">Snippets</span>
              <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-inverse text-on-inverse-muted font-mono">
                Alt+S
              </kbd>
            </div>
            <button
              onClick={() => setSnippetsDrawerOpen(false)}
              className="p-1.5 rounded-lg text-on-inverse-muted hover:text-on-inverse hover:bg-surface-inverse-elevated transition-colors cursor-pointer [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-syntax-flag"
              title="Close Drawer (Esc)"
              aria-label="Close snippets drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search and auto-bound variables */}
          <div className="p-3 border-b border-inverse space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-on-inverse-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands, flags, tools (nmap, smb, hashcat)..."
                className="w-full pl-9 pr-8 py-1.5 bg-surface-inverse-elevated border border-inverse rounded-lg text-xs text-on-inverse placeholder:text-on-inverse-muted focus:outline-none focus:border-syntax-flag"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-on-inverse-muted hover:text-on-inverse cursor-pointer"
                  aria-label="Clear search"
                >
                  âœ•
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-on-inverse-muted overflow-x-auto pb-0.5">
              <span>Auto-bound</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-inverse-elevated border border-inverse text-on-inverse-muted">
                LHOST <strong className="font-mono tabular-nums font-medium text-on-inverse">{globalVars.lhost || '10.10.14.X'}</strong>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-inverse-elevated border border-inverse text-on-inverse-muted">
                LPORT <strong className="font-mono tabular-nums font-medium text-on-inverse">{globalVars.lport || '4444'}</strong>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-inverse-elevated border border-inverse text-on-inverse-muted">
                RHOST <strong className="font-mono tabular-nums font-medium text-on-inverse">{globalVars.targetIp || '10.10.10.X'}</strong>
              </span>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-inverse overflow-x-auto text-xs scrollbar-none">
            {[
              { id: 'all', label: `All (${cheatsheets.length})` },
              { id: 'starred', label: 'Starred' },
              ...CHEATSHEET_CATEGORIES.filter((cat) => cat.id !== 'all').map((cat) => ({ id: cat.id as string, label: cat.name })),
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-surface-inverse-elevated text-on-inverse border border-syntax-flag/60'
                    : 'text-on-inverse-muted hover:text-on-inverse hover:bg-surface-inverse-elevated border border-transparent'
                }`}
              >
                {cat.id === 'starred' && <Star className="w-3 h-3" />}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Snippet list */}
          <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
            {filteredCommands.map((cmd) => {
              const interpolated = interpolateCommand(cmd.commandTemplate, globalVars);
              const unresolved = getUnresolvedTokens(cmd.commandTemplate, globalVars);
              const isCopied = copiedId === cmd.id;

              return (
                <div
                  key={cmd.id}
                  className={`p-3 rounded-xl bg-surface-inverse-elevated border transition-colors space-y-2 group ${
                    unresolved.length > 0 ? 'border-syntax-number/50' : 'border-inverse hover:border-syntax-comment/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-medium text-on-inverse text-xs">{cmd.title}</span>
                      {cmd.isCustom && (
                        <span className="text-[11px] px-1 rounded border border-inverse text-on-inverse-muted">
                          Custom
                        </span>
                      )}
                      {unresolved.length > 0 && (
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded border border-syntax-number/50 text-syntax-number font-medium flex items-center gap-1"
                          title={`Unresolved variable: ${unresolved.join(', ')} â€” check LHOST/Target IP in cockpit header`}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                          <span>Missing: <span className="font-mono">{unresolved.join(', ')}</span></span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleStarCommand(cmd.id)}
                        className={`p-1 rounded hover:bg-surface-inverse transition-colors cursor-pointer ${
                          cmd.isStarred ? 'text-syntax-number' : 'text-on-inverse-muted hover:text-on-inverse'
                        }`}
                        title={cmd.isStarred ? 'Unstar' : 'Star command'}
                      >
                        <Star className={`w-3.5 h-3.5 ${cmd.isStarred ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleCopy(cmd.id, interpolated)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border cursor-pointer active:scale-[0.97] ${
                          isCopied
                            ? 'border-syntax-string/60 text-syntax-string'
                            : unresolved.length > 0
                            ? 'border-syntax-number/50 text-syntax-number hover:bg-surface-inverse'
                            : 'border-inverse text-on-inverse hover:bg-surface-inverse'
                        }`}
                        title={unresolved.length > 0 ? `Warning: contains unresolved tokens (${unresolved.join(', ')})` : 'Copy command'}
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {cmd.description && (
                    <div className="text-[11px] text-on-inverse-muted line-clamp-2">
                      {cmd.description}
                    </div>
                  )}

                  <div className="p-2 rounded-lg text-xs font-mono tabular-nums break-all select-all bg-surface-inverse border border-inverse text-on-inverse">
                    {interpolated}
                  </div>
                </div>
              );
            })}

            {filteredCommands.length === 0 && (
              <div className="text-center py-10 text-on-inverse-muted text-xs space-y-2">
                <div>No snippets match your search.</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-inverse-elevated border-t border-inverse text-xs text-on-inverse-muted">
            <span className="tabular-nums">{filteredCommands.length} snippets available</span>
            <button
              onClick={() => {
                setSnippetsDrawerOpen(false);
                navigate('/cheatsheets');
              }}
              className="flex items-center gap-1 text-syntax-flag hover:underline text-xs cursor-pointer"
            >
              <span>Full cheatsheet matrix</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
