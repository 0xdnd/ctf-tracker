import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Cpu
} from 'lucide-react';
import { GlobalVariables } from '../../types';
import { playCyberSound } from '../../utils/helpers';
import { useCtfStore } from '../../store/useCtfStore';

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
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [calloutDropdownOpen, setCalloutDropdownOpen] = useState<boolean>(false);
  const [varDropdownOpen, setVarDropdownOpen] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateNoteContent = useCtfStore((s) => s.updateNoteContent);

  // Sync initial content if noteId changes externally
  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
    setSaveStatus('saved');
  }, [noteId, initialContent]);

  // Execute debounced save to store
  const executeSave = useCallback((rawText: string) => {
    setSaveStatus('saving');
    updateNoteContent(noteId, rawText);
    if (onSave) onSave();
    setIsDirty(false);
    setSaveStatus('saved');
  }, [noteId, updateNoteContent, onSave]);

  // Handle text changes with debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setContent(nextVal);
    setIsDirty(true);
    setSaveStatus('dirty');
    onContentChange(nextVal);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      executeSave(nextVal);
    }, 600);
  };

  // Immediate manual save (Ctrl+S or click)
  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
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
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => executeSave(nextVal), 600);

    // Reposition cursor inside wrapped text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);

    if (soundEnabled) playCyberSound('click');
  }, [executeSave, onContentChange, soundEnabled]);

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
      onContentChange(nextVal);

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
    <div className={`flex flex-col rounded-xl border border-slate-300 dark:border-cyber-border bg-slate-50 dark:bg-surface-elevated overflow-hidden font-mono shadow-md ${className}`}>
      
      {/* 1. Technical Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-1.5 px-2 bg-slate-100 dark:bg-surface-sunken border-b border-slate-300 dark:border-cyber-border select-none text-xs">
        
        {/* Left Formatting Cluster */}
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          {/* Headings */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('# ', '', 'Heading 1')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
            title="Heading 1 (#)"
            aria-label="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('## ', '', 'Heading 2')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
            title="Heading 2 (##)"
            aria-label="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('### ', '', 'Heading 3')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
            title="Heading 3 (###)"
            aria-label="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-300 dark:bg-cyber-border mx-0.5" />

          {/* Inline Formats */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('**', '**', 'bold')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors font-bold"
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('*', '*', 'italic')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors italic"
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('~~', '~~', 'strikethrough')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
            title="Strikethrough (~~)"
            aria-label="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('`', '`', 'code')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
            title="Inline Code (`)"
            aria-label="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-300 dark:bg-cyber-border mx-0.5" />

          {/* Code Blocks & Terminal */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('```bash\n', '\n```\n', '# Terminal command')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-purple-600 dark:text-purple-400 transition-colors"
            title="Bash / Terminal Code Block"
            aria-label="Terminal Code Block"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          {/* Lists & Tasks */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('- ', '', 'List item')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
            title="Bullet List (- )"
            aria-label="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('1. ', '', 'Numbered item')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
            title="Numbered List (1. )"
            aria-label="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('- [ ] ', '', 'Checklist task')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
            title="Task Checklist (- [ ] )"
            aria-label="Task Checklist"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-300 dark:bg-cyber-border mx-0.5" />

          {/* Wikilink & Table */}
          <button
            type="button"
            onClick={() => insertTextAtCursor('[[', ']]', 'Note Title')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-cyan-600 dark:text-cyber-cyan transition-colors"
            title="Obsidian Wikilink [[Note Title]] (Ctrl+K)"
            aria-label="Wikilink"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data 1 | Data 2 | Data 3 |\n', '', '')}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-slate-700 dark:text-zinc-300 transition-colors"
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
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
              title="Insert Obsidian Callout Box"
              aria-label="Obsidian Callouts"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">Callout</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {calloutDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 w-44 p-1 rounded-lg bg-white dark:bg-surface-elevated border border-slate-300 dark:border-cyber-border shadow-xl z-50 text-[11px] space-y-0.5"
                onMouseLeave={() => setCalloutDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor('> [!NOTE]\n> ', '\n', 'Note title and details');
                    setCalloutDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-left text-blue-600 dark:text-blue-400"
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
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-left text-emerald-600 dark:text-emerald-400"
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
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-left text-amber-600 dark:text-amber-400"
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
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-left text-rose-600 dark:text-rose-400"
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
                  className="w-full px-2 py-1 rounded flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-left text-cyan-600 dark:text-cyan-400"
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
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-200 dark:hover:bg-cyber-cardHover text-emerald-600 dark:text-cyber-emerald transition-colors cursor-pointer"
              title="Insert Target Variables (LHOST, RHOST, LPORT)"
              aria-label="Target Variables"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">Vars</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {varDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 w-48 p-1 rounded-lg bg-white dark:bg-surface-elevated border border-slate-300 dark:border-cyber-border shadow-xl z-50 text-[11px] space-y-0.5"
                onMouseLeave={() => setVarDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor(globalVars?.lhost || '{{LHOST}}', '', '');
                    setVarDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center justify-between hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-left text-cyan-600 dark:text-cyber-cyan"
                >
                  <span>LHOST</span>
                  <span className="font-mono text-[9px] text-slate-400">{globalVars?.lhost || 'unset'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor(globalVars?.targetIp || '{{RHOST}}', '', '');
                    setVarDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center justify-between hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-left text-emerald-600 dark:text-cyber-emerald"
                >
                  <span>RHOST</span>
                  <span className="font-mono text-[9px] text-slate-400">{globalVars?.targetIp || 'unset'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertTextAtCursor(globalVars?.lport || '{{LPORT}}', '', '');
                    setVarDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1 rounded flex items-center justify-between hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-left text-purple-600 dark:text-purple-400"
                >
                  <span>LPORT</span>
                  <span className="font-mono text-[9px] text-slate-400">{globalVars?.lport || 'unset'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Save Cluster */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Status Indicator */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
            saveStatus === 'saved'
              ? 'text-emerald-600 dark:text-cyber-emerald bg-emerald-500/10'
              : saveStatus === 'saving'
              ? 'text-amber-500 dark:text-cyber-amber bg-amber-500/10 animate-pulse'
              : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
          }`}>
            {saveStatus === 'saved' && <Check className="w-2.5 h-2.5" />}
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
          </span>

          {/* Manual Save Button */}
          <button
            type="button"
            onClick={handleManualSave}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyan-700 dark:text-cyber-cyan text-xs font-bold transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer"
            title="Save Note Now (Ctrl+S)"
            aria-label="Save Note Now"
          >
            <Save className="w-3 h-3" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      {/* 2. Textarea Code Input */}
      <div className="relative flex-1 min-h-[300px]">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          data-testid="markdown-editor-textarea"
          placeholder="Type or paste Markdown notes here... (Obsidian callouts, wikilinks, code blocks supported)"
          style={{ minHeight }}
          className="w-full h-full p-4 bg-transparent text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 text-xs sm:text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-cyber-cyan/50 selection:bg-cyber-cyan/30"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      {/* 3. Footer Statistics Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-100 dark:bg-surface-sunken border-t border-slate-300 dark:border-cyber-border text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
        <div className="flex items-center gap-3">
          <span>{stats.lines} lines</span>
          <span>{stats.words} words</span>
          <span>{stats.chars} chars</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-zinc-500">
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
