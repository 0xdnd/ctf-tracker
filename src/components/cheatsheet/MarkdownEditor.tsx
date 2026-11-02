import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Terminal, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Heading1, 
  Heading2, 
  Heading3, 
  Link as LinkIcon, 
  Table, 
  AlertTriangle, 
  Save, 
  Check, 
  ChevronDown, 
  Info, 
  Lightbulb, 
  Flame, 
  HelpCircle,
  Cpu,
  Columns,
  Sparkles,
  Zap,
  Search,
  Radar
} from 'lucide-react';
import { GlobalVariables } from '../../types';
import { interpolateCommand, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { useEffectiveGlobalVars } from '../../hooks/useActiveTargetIp';
import { useCtfStore } from '../../store/useCtfStore';
import { sanitizeHtml } from '../../utils/securityUtils';
import { parseMarkdownToHtml } from '../../utils/writeupHtmlExporter';
import { NOTE_TEMPLATES } from '../../data/noteTemplates';
import { useToastStore } from '../../store/useToastStore';

export interface MarkdownEditorProps {
  noteId: string;
  initialContent: string;
  onContentChange: (newContent: string) => void;
  onSave?: () => void;
  globalVars?: GlobalVariables;
  soundEnabled?: boolean;
  className?: string;
  isSplitView?: boolean;
  minHeight?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  noteId,
  initialContent,
  onContentChange,
  onSave,
  globalVars,
  soundEnabled = true,
  className = '',
  isSplitView = false,
  minHeight = '400px',
}) => {
  const [content, setContent] = useState<string>(initialContent);
  const [, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [calloutDropdownOpen, setCalloutDropdownOpen] = useState<boolean>(false);
  const [varDropdownOpen, setVarDropdownOpen] = useState<boolean>(false);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState<boolean>(false);
  const [snippetDropdownOpen, setSnippetDropdownOpen] = useState<boolean>(false);
  const [snippetQuery, setSnippetQuery] = useState<string>('');
  const [nmapDropdownOpen, setNmapDropdownOpen] = useState<boolean>(false);
  const [rawNmapInput, setRawNmapInput] = useState<string>('');
  const [showSplitPreview, setShowSplitPreview] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateNoteContent = useCtfStore((s) => s.updateNoteContent);
  const storeGlobalVars = useCtfStore((s) => s.globalVars);
  const cheatsheets = useCtfStore((s) => s.cheatsheets);
  const filteredSnippets = useMemo(() => {
    const q = snippetQuery.trim().toLowerCase();
    if (!q) return cheatsheets.slice(0, 8);
    return cheatsheets
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.commandTemplate.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [cheatsheets, snippetQuery]);
  // Engaged target's IP wins over the global RHOST (shared precedence helper).
  const effectiveVars = useEffectiveGlobalVars(globalVars ?? storeGlobalVars);
  const previewHtml = useMemo(() => sanitizeHtml(parseMarkdownToHtml(content)), [content]);
  const showPreview = showSplitPreview && !isSplitView;

  // Give every <pre> in the sanitized preview a Copy button. React never
  // reconciles inside dangerouslySetInnerHTML, so decorating the DOM here is
  // safe; it re-runs whenever the preview HTML is replaced.
  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    root.querySelectorAll('pre').forEach((pre) => {
      if (pre.parentElement?.hasAttribute('data-code-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-code-wrapper', '');
      wrapper.className = 'relative';
      pre.replaceWith(wrapper);
      wrapper.appendChild(pre);
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-copy-code', '');
      button.setAttribute('aria-label', 'Copy resolved command');
      button.title = 'Copy with variables filled in';
      button.textContent = 'Copy';
      button.className =
        'absolute top-1 right-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-subtle bg-surface-card px-2 text-[11px] font-medium text-secondary hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer';
      wrapper.appendChild(button);
    });
  }, [previewHtml, showPreview]);

  // Delegated click handler for those buttons; reads the latest vars via a ref.
  const copyVarsRef = useRef({ effectiveVars, soundEnabled });
  copyVarsRef.current = { effectiveVars, soundEnabled };
  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const button = (e.target as Element | null)?.closest?.('button[data-copy-code]');
      const pre = button?.parentElement?.querySelector('pre');
      if (!button || !pre) return;
      const { effectiveVars: vars, soundEnabled: sound } = copyVarsRef.current;
      safeCopyToClipboard(interpolateCommand(pre.textContent || '', vars));
      if (sound) playCyberSound('copy');
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = 'Copy';
      }, 2000);
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [showPreview]);

  // Sync initial content if noteId changes externally
  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
    setSaveStatus('saved');
  }, [noteId, initialContent]);

  // Execute debounced save to store
  const executeSave = useCallback((rawText: string) => {
    setSaveStatus('saving');
    // updateNoteContent is async (promoting a catalog note lazy-loads its chunk): only report "saved"
    // once it resolves, and keep the edit marked dirty if it rejects.
    Promise.resolve(updateNoteContent(noteId, rawText))
      .then(() => {
        if (onSave) onSave();
        setIsDirty(false);
        setSaveStatus('saved');
      })
      .catch((err) => {
        console.warn('[ZeroBox] Could not save note', err);
        setIsDirty(true);
        setSaveStatus('dirty');
      });
  }, [noteId, updateNoteContent, onSave]);

  // The save the pending debounce timer would run (bound to the note it was typed into).
  const pendingSaveRef = useRef<(() => void) | null>(null);

  const scheduleSave = useCallback((nextVal: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const save = () => {
      saveTimeoutRef.current = null;
      pendingSaveRef.current = null;
      executeSave(nextVal);
    };
    pendingSaveRef.current = save;
    saveTimeoutRef.current = setTimeout(save, 600);
  }, [executeSave]);

  // Run a pending debounced save now: on unmount, when the tab is hidden and when the page is unloaded.
  useEffect(() => {
    const flushPending = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      pendingSaveRef.current?.();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushPending);
    window.addEventListener('beforeunload', flushPending);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushPending);
      window.removeEventListener('beforeunload', flushPending);
      flushPending();
    };
  }, []);

  // Handle text changes with debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setContent(nextVal);
    setIsDirty(true);
    setSaveStatus('dirty');
    onContentChange(nextVal);
    scheduleSave(nextVal);
  };

  // Immediate manual save (Ctrl+S or click)
  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    pendingSaveRef.current = null;
    executeSave(content);
    if (soundEnabled) playCyberSound('copy');
  }, [content, executeSave, soundEnabled]);

  // Helper to insert or wrap markdown at cursor position
  const insertTextAtCursor = useCallback((prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end) || defaultPlaceholder;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    setContent(nextVal);
    setIsDirty(true);
    setSaveStatus('dirty');
    onContentChange(nextVal);

    // Schedule debounced save
    scheduleSave(nextVal);

    // Reposition cursor inside wrapped text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);

    if (soundEnabled) playCyberSound('click');
  }, [scheduleSave, onContentChange, soundEnabled]);

  // Keyboard shortcuts handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S / Cmd+S: Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleManualSave();
      return;
    }

    // Ctrl+B / Cmd+B: Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertTextAtCursor('**', '**', 'bold text');
      return;
    }

    // Ctrl+I / Cmd+I: Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertTextAtCursor('*', '*', 'italic text');
      return;
    }

    // Ctrl+K / Cmd+K: Wikilink
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      insertTextAtCursor('[[', ']]', 'Note Title');
      return;
    }

    // Tab: Indent 2 spaces without losing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentVal = textarea.value;

      const nextVal = currentVal.substring(0, start) + '  ' + currentVal.substring(end);
      setContent(nextVal);
      setIsDirty(true);
      setSaveStatus('dirty');
      onContentChange(nextVal);
      scheduleSave(nextVal);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Line, character, and word statistics
  const stats = {
    lines: content ? content.split('\n').length : 0,
    words: content ? content.trim().split(/\s+/).filter(Boolean).length : 0,
    chars: content ? content.length : 0,
  };

  return (
    <div className={`flex flex-col rounded-xl border border-strong bg-surface-sunken overflow-hidden machined-edge ${className}`}>
      
      {/* 1. Technical Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-1.5 px-2 bg-surface-sunken border-b border-strong select-none text-xs">
        
        {/* Left Formatting Cluster */}
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          {/* Headings */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('# ', '', 'Heading 1')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Heading 1 (#)"
            aria-label="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('## ', '', 'Heading 2')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Heading 2 (##)"
            aria-label="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('### ', '', 'Heading 3')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Heading 3 (###)"
            aria-label="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-surface-hover mx-0.5" />

          {/* Inline Formats */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('**', '**', 'bold')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors font-semibold"
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('*', '*', 'italic')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors italic"
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('~~', '~~', 'strikethrough')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Strikethrough (~~)"
            aria-label="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('`', '`', 'code')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Inline Code (`)"
            aria-label="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-surface-hover mx-0.5" />

          {/* Code Blocks & Terminal */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('```bash\n', '\n```\n', '# Terminal command')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-accent transition-colors"
            title="Bash / Terminal Code Block"
            aria-label="Terminal Code Block"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          {/* Lists & Tasks */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('- ', '', 'List item')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Bullet List (- )"
            aria-label="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('1. ', '', 'Numbered item')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Numbered List (1. )"
            aria-label="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('- [ ] ', '', 'Checklist task')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Task Checklist (- [ ] )"
            aria-label="Task Checklist"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-surface-hover mx-0.5" />

          {/* Wikilink & Table */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('[[', ']]', 'Note Title')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-accent transition-colors"
            title="Obsidian Wikilink [[Note Title]] (Ctrl+K)"
            aria-label="Wikilink"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data 1 | Data 2 | Data 3 |\n', '', '')}
            className="p-1 sm:p-1.5 rounded hover:bg-surface-hover text-secondary transition-colors"
            title="Markdown Table"
            aria-label="Markdown Table"
          >
            <Table className="w-3.5 h-3.5" />
          </button>

          {/* Obsidian Callouts Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalloutDropdownOpen(!calloutDropdownOpen)}
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-callout-warn-fg transition-colors cursor-pointer"
              title="Insert Obsidian Callout Box"
              aria-label="Obsidian Callouts"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold hidden sm:inline">Callout</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {calloutDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 w-44 p-1 rounded-lg bg-surface-card border border-strong shadow-xl z-50 text-[11px] space-y-0.5"
                onMouseLeave={() => setCalloutDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor('> [!NOTE]\n> ', '\n', 'Note title and details');
                    setCalloutDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-surface-sunken text-left text-accent"
                >
                  <Info className="w-3 h-3" />
                  <span>Note ([!NOTE])</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor('> [!TIP]\n> ', '\n', 'Pro-tip instructions');
                    setCalloutDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-surface-sunken text-left text-callout-success-fg"
                >
                  <Lightbulb className="w-3 h-3" />
                  <span>Tip ([!TIP])</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor('> [!WARNING]\n> ', '\n', 'Warning alert');
                    setCalloutDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-surface-sunken text-left text-callout-warn-fg"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Warning ([!WARNING])</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor('> [!DANGER]\n> ', '\n', 'Danger / critical caveat');
                    setCalloutDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-surface-sunken text-left text-callout-danger-fg"
                >
                  <Flame className="w-3 h-3" />
                  <span>Danger ([!DANGER])</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor('> [!QUESTION]\n> ', '\n', 'Question context');
                    setCalloutDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-surface-sunken text-left text-accent"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Question ([!QUESTION])</span>
                </button>
              </div>
            )}
          </div>

          {/* Tactical Target Variables Inserter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setVarDropdownOpen(!varDropdownOpen)}
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-callout-success-fg transition-colors cursor-pointer"
              title="Insert Target Variables (LHOST, RHOST, LPORT)"
              aria-label="Target Variables"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold hidden sm:inline">Vars</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {varDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 w-48 p-1 rounded-lg bg-surface-card border border-strong shadow-xl z-50 text-[11px] space-y-0.5"
                onMouseLeave={() => setVarDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor(globalVars?.lhost || '{{LHOST}}', '', '');
                    setVarDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center justify-between hover:bg-surface-sunken text-left text-accent"
                >
                  <span>LHOST</span>
                  <span className="font-mono text-[9px] text-muted">{globalVars?.lhost || 'unset'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor(globalVars?.targetIp || '{{RHOST}}', '', '');
                    setVarDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center justify-between hover:bg-surface-sunken text-left text-callout-success-fg"
                >
                  <span>RHOST</span>
                  <span className="font-mono text-[9px] text-muted">{globalVars?.targetIp || 'unset'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor(globalVars?.lport || '{{LPORT}}', '', '');
                    setVarDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center justify-between hover:bg-surface-sunken text-left text-accent"
                >
                  <span>LPORT</span>
                  <span className="font-mono text-[9px] text-muted">{globalVars?.lport || 'unset'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Tactical Templates Inserter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-accent transition-colors cursor-pointer"
              title="Insert Offensive Note Templates (Recon, Web, Foothold, PrivEsc, Loot)"
              aria-label="Note Templates"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold hidden sm:inline">Templates</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {templateDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 w-64 p-1.5 rounded-lg bg-surface-card border border-strong shadow-2xl z-50 text-[11px] space-y-1"
                onMouseLeave={() => setTemplateDropdownOpen(false)}
              >
                <div className="text-[10px] font-semibold text-muted px-2 py-0.5 uppercase tracking-wider">
                  Offensive Templates
                </div>
                {NOTE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      const separator = content.trim() ? '\n\n---\n\n' : '';
                      const newContent = content + separator + tmpl.content;
                      setContent(newContent);
                      setIsDirty(true);
                      setSaveStatus('dirty');
                      onContentChange(newContent);
                      scheduleSave(newContent);
                      setTemplateDropdownOpen(false);
                      if (soundEnabled) playCyberSound('root');
                      useToastStore.getState().addToast({
                        type: 'success',
                        message: `Inserted ${tmpl.title} template`,
                      });
                    }}
                    className="w-full px-2 py-1.5 rounded flex flex-col text-left hover:bg-surface-sunken transition-colors group cursor-pointer"
                  >
                    <span className="font-semibold text-accent group-hover:text-primary">{tmpl.title}</span>
                    <span className="text-[10px] text-muted line-clamp-1">{tmpl.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Tier 1 Upgrade #3: Quick Cheatsheet Snippet Dropper */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSnippetDropdownOpen((prev) => !prev);
                setSnippetQuery('');
              }}
              data-testid="snippets-dropdown-btn"
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-accent transition-colors cursor-pointer"
              title="Drop Pentest Command Snippet from 85+ Cheatsheets"
              aria-label="Insert Cheatsheet Snippet"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold hidden sm:inline">Snippets</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {snippetDropdownOpen && (
              <div
                data-testid="snippets-dropdown-panel"
                className="absolute left-0 top-full mt-1 w-80 p-2 rounded-lg bg-surface-card border border-strong shadow-2xl z-50 text-[11px] space-y-1.5"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Command Snippets ({cheatsheets.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSnippetDropdownOpen(false)}
                    className="text-[10px] text-muted hover:text-primary cursor-pointer"
                  >
                    Esc
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-3 h-3 text-muted absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={snippetQuery}
                    onChange={(e) => setSnippetQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setSnippetDropdownOpen(false);
                      }
                    }}
                    placeholder="Search nmap, ffuf, BloodHound, SUID..."
                    aria-label="Search cheatsheet snippets"
                    autoFocus
                    className="w-full h-7 pl-6 pr-2 rounded border border-subtle bg-surface-sunken text-[11px] text-primary placeholder-muted focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                  {filteredSnippets.length === 0 ? (
                    <div className="py-3 text-center text-muted text-[10px]">No matching commands</div>
                  ) : (
                    filteredSnippets.map((cmd) => (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => {
                          insertTextAtCursor(`\n\`\`\`bash\n# ${cmd.title}\n${cmd.commandTemplate}\n\`\`\`\n`, '', '');
                          setSnippetDropdownOpen(false);
                          setSnippetQuery('');
                          useToastStore.getState().addToast({
                            type: 'success',
                            message: `Dropped snippet: ${cmd.title}`,
                          });
                        }}
                        className="w-full px-2 py-1.5 rounded flex flex-col text-left hover:bg-surface-sunken transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-accent group-hover:text-primary truncate">{cmd.title}</span>
                          <span className="text-[9px] text-muted rounded border border-subtle px-1 flex-shrink-0">{cmd.category}</span>
                        </div>
                        <code className="text-[10px] text-secondary font-mono truncate mt-0.5">{cmd.commandTemplate}</code>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Phase 2 Power Tool: Raw Nmap Output to Markdown Table & Port Sync */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNmapDropdownOpen((prev) => !prev)}
              data-testid="nmap-parser-btn"
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-callout-success-fg transition-colors cursor-pointer"
              title="Paste Nmap Output -> Convert to Markdown Table & Sync Open Ports"
              aria-label="Parse Nmap Output to Markdown Table"
            >
              <Radar className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold hidden sm:inline">Parse Nmap</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {nmapDropdownOpen && (
              <div
                data-testid="nmap-parser-panel"
                className="absolute left-0 top-full mt-1 w-80 p-2.5 rounded-lg bg-surface-card border border-strong shadow-2xl z-50 text-[11px] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-callout-success-fg uppercase tracking-wider">
                    Paste Raw Nmap Output
                  </span>
                  <button
                    type="button"
                    onClick={() => setNmapDropdownOpen(false)}
                    className="text-[10px] text-muted hover:text-primary cursor-pointer"
                  >
                    Esc
                  </button>
                </div>
                <textarea
                  value={rawNmapInput}
                  onChange={(e) => setRawNmapInput(e.target.value)}
                  placeholder={"22/tcp open  ssh     OpenSSH 8.9p1\n80/tcp open  http    Apache httpd 2.4.52\n445/tcp open microsoft-ds"}
                  aria-label="Raw Nmap output"
                  rows={4}
                  className="w-full p-2 rounded border border-subtle bg-surface-sunken font-mono text-[10px] text-primary placeholder-muted focus:outline-none focus:border-accent resize-y"
                />
                <button
                  type="button"
                  disabled={!rawNmapInput.trim()}
                  onClick={() => {
                    const hints: Record<number, string> = {
                      21: 'Check anonymous login & ftp-anon',
                      22: 'Test captured creds / SSH key auth',
                      53: 'Run dig axfr @{TARGET} zone transfer',
                      80: 'Run ffuf dir/vhost & inspect source',
                      88: 'Kerberos: AS-REP Roast (GetNPUsers) & Kerberoast',
                      135: 'RPC: enumdomusers / rpcdump.py',
                      139: 'SMB: check null session & shares',
                      389: 'LDAP: domain dump & BloodHound collection',
                      443: 'Check TLS cert CN/SANs & vhosts',
                      445: 'SMB: nxc smb {TARGET} --shares & RID brute',
                      1433: 'MSSQL: check xp_cmdshell & service auth',
                      3306: 'MySQL: check default creds / UDF / file read',
                      3389: 'RDP: verify creds with nxc rdp {TARGET}',
                      5985: 'WinRM: evil-winrm -i {TARGET} -u {USER} -p {PASS}',
                      8080: 'Web proxy/app: ffuf & check actuator/admin',
                    };
                    const lines = rawNmapInput.split(/\r?\n/);
                    const parsedRows: string[] = [];
                    const portNums: number[] = [];
                    for (const line of lines) {
                      const m = line.trim().match(/^(\d+)\/(tcp|udp)\s+(open|filtered)\s+(\S+)(?:\s+(.*))?$/i);
                      if (m) {
                        const portNum = parseInt(m[1], 10);
                        const proto = m[2].toLowerCase();
                        const service = m[4];
                        const version = (m[5] || '-').trim();
                        const noteHint = hints[portNum] || 'Enumerate service banner & CVEs';
                        portNums.push(portNum);
                        parsedRows.push(`| ${portNum}/${proto} | ${service} | ${version} | ${noteHint} |`);
                      }
                    }
                    if (parsedRows.length === 0) {
                      useToastStore.getState().addToast({
                        type: 'warning',
                        message: 'No open port lines (e.g. "80/tcp open http") found in pasted text',
                      });
                      return;
                    }
                    const tableMd = `\n### Parsed Nmap Scan (${portNums.length} Open Ports)\n| Port | Service | Version | Tactical Next Step |\n| :--- | :--- | :--- | :--- |\n${parsedRows.join('\n')}\n`;
                    insertTextAtCursor(tableMd, '', '');
                    const st = useCtfStore.getState();
                    if (st.activeTargetId && portNums.length > 0) {
                      st.setMachineOpenPorts(st.activeTargetId, Array.from(new Set(portNums)));
                    }
                    setRawNmapInput('');
                    setNmapDropdownOpen(false);
                    useToastStore.getState().addToast({
                      type: 'success',
                      message: `Inserted ${portNums.length} ports table${st.activeTargetId ? ' & synced to target checklist' : ''}`,
                    });
                  }}
                  className="w-full h-7 rounded bg-callout-success-bg hover:bg-surface-hover border border-callout-success-border text-callout-success-fg font-semibold text-[11px] cursor-pointer disabled:opacity-40"
                >
                  Convert to Table & Sync Ports
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Save Cluster & Split Toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Dual-Pane Split Preview Toggle (available when not already wrapped in external split container) */}
          {!isSplitView && (
            <button
              type="button"
              onClick={() => {
                setShowSplitPreview((prev) => !prev);
                if (soundEnabled) playCyberSound('toggle');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors active:scale-[0.97] cursor-pointer ${
                showSplitPreview
                  ? 'bg-accent-muted text-accent border border-accent'
                  : 'bg-surface-sunken hover:bg-surface-hover text-secondary border border-strong'
              }`}
              title="Toggle Dual-Pane Split Preview"
              aria-label="Toggle Dual-Pane Split Preview"
            >
              <Columns className="w-3 h-3" />
              <span className="hidden sm:inline">Dual-Pane</span>
            </button>
          )}

          {/* Status Indicator */}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
            saveStatus === 'saved'
              ? 'text-callout-success-fg bg-callout-success-bg'
              : saveStatus === 'saving'
              ? 'text-callout-warn-fg bg-callout-warn-bg animate-pulse'
              : 'text-callout-warn-fg bg-callout-warn-bg'
          }`}>
            {saveStatus === 'saved' && <Check className="w-2.5 h-2.5" />}
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
          </span>

          {/* Manual Save Button */}
          <button
            type="button"
            onClick={handleManualSave}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent-muted hover:bg-callout-info-bg border border-callout-info-border text-accent text-xs font-semibold transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
            title="Save Note Now (Ctrl+S)"
            aria-label="Save Note Now"
          >
            <Save className="w-3 h-3" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      {/* 2. Textarea Code Input & Dual-Pane Live Sanitized Preview */}
      <div className="relative flex-1 min-h-[300px]">
        {showPreview ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full p-2.5">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              data-testid="markdown-editor-textarea"
              placeholder="Type or paste Markdown notes here... (Obsidian callouts, wikilinks, code blocks supported)"
              style={{ minHeight }}
              className="w-full h-full p-3.5 bg-surface-sunken text-primary placeholder-muted text-xs sm:text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-accent selection:bg-callout-info-bg border border-subtle rounded-lg"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div className="rounded-lg border border-subtle bg-surface-sunken p-4 overflow-y-auto max-h-[700px] machined-edge">
              <div className="text-[10px] font-semibold text-accent mb-2.5 pb-1.5 border-b border-subtle flex items-center justify-between">
                <span className="">MARKDOWN PREVIEW</span>
                <span className="text-[9px] text-callout-success-fg flex items-center gap-1">
                  ✓ DOMPurify Neutralized
                </span>
              </div>
              <div
                ref={previewRef}
                data-testid="markdown-split-preview"
                className="prose prose-sm dark:prose-invert max-w-none font-sans text-xs sm:text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            data-testid="markdown-editor-textarea"
            placeholder="Type or paste Markdown notes here... (Obsidian callouts, wikilinks, code blocks supported)"
            style={{ minHeight }}
            className="w-full h-full p-4 bg-transparent text-primary placeholder-muted text-xs sm:text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-accent selection:bg-callout-info-bg"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        )}
      </div>

      {/* 3. Footer Statistics Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-surface-sunken border-t border-strong text-[10px] text-muted font-mono tabular-nums">
        <div className="flex items-center gap-3">
          <span>{stats.lines} lines</span>
          <span>{stats.words} words</span>
          <span>{stats.chars} chars</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted">
          <span>Ctrl+S Save</span>
          <span>•</span>
          <span>Ctrl+B Bold</span>
          <span>•</span>
          <span>Ctrl+K Wikilink</span>
        </div>
      </div>
    </div>
  );
};
