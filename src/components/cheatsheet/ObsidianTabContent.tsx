import React, { useState, useMemo, useRef, useCallback, useEffect, useDeferredValue } from 'react';
import { 
  Check, 
  Copy, 
  Terminal, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Lightbulb, 
  Flame, 
  ShieldAlert, 
  Quote, 
  HelpCircle, 
  Info, 
  CheckCircle2, 
  BookOpen, 
  Link as LinkIcon, 
  ArrowRight, 
  Clock, 
  List, 
  FileCode,
  Search,
  Edit3 
} from 'lucide-react';
import { 
  CptsNoteEntry, 
  parseObsidianNote, 
  resolveWikilink, 
  getBacklinksForNote,
  ObsidianCallout,
  ObsidianChecklistItem
} from '../../utils/obsidianManualUtils';
import { interpolateCommand, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { sanitizeHtml, sanitizeSvg } from '../../utils/securityUtils';
import { GlobalVariables } from '../../types';
import { OpenNoteOptions } from '../../types/workspace';
import { slugifyHeading } from '../../utils/workspaceLinkInterceptor';
import { ObsidianViewMode } from '../../store/useNotesWorkspaceStore';
import { MarkdownEditor } from './MarkdownEditor';

export interface ObsidianTabContentProps {
  note: CptsNoteEntry;
  isActive: boolean;
  globalVars: GlobalVariables;
  soundEnabled: boolean;
  onNavigateToNote: (noteId: string) => void;
  onOpenNote?: (noteId: string, options?: OpenNoteOptions) => void;
  onOpenNotePicker?: (query?: string) => void;
  defaultLanguage?: 'en' | 'he';
  viewMode?: ObsidianViewMode;
  onViewModeChange?: (mode: ObsidianViewMode) => void;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  isMaximized?: boolean;
}

export const ObsidianTabContent: React.FC<ObsidianTabContentProps> = ({
  note,
  isActive,
  globalVars,
  soundEnabled,
  onNavigateToNote,
  onOpenNote,
  onOpenNotePicker,
  defaultLanguage = 'en',
  viewMode = 'reading',
  onViewModeChange,
  fontSize = 'base',
  isMaximized = false,
}) => {
  const [langMode, setLangMode] = useState<'en' | 'he'>(defaultLanguage);
  const [openCallouts, setOpenCallouts] = useState<Record<number, boolean>>({});
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync language mode if defaultLanguage changes externally
  useEffect(() => {
    setLangMode(defaultLanguage);
  }, [defaultLanguage]);

  // Real-time live editable content state
  const [liveContent, setLiveContent] = useState<string>(() => note.rawMarkdown || (note as any).content || '');

  // Defer heavy AST re-parsing in live preview during high-frequency typing
  const deferredContent = useDeferredValue(liveContent);

  // Synchronize live content when switching active notes
  useEffect(() => {
    setLiveContent(note.rawMarkdown || (note as any).content || '');
  }, [note.id, note.rawMarkdown, (note as any).content]);

  // Real-time on-the-fly markdown parse (updates preview smoothly as user types)
  const parsed = useMemo(() => parseObsidianNote(deferredContent), [deferredContent]);

  // Backlinks referencing this note
  const backlinks = useMemo(() => getBacklinksForNote(note.id), [note.id]);

  const handleCopyText = useCallback((id: string, text: string) => {
    safeCopyToClipboard(text);
    setCopiedId(id);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedId(null), 2000);
  }, [soundEnabled]);

  const toggleCallout = useCallback((idx: number) => {
    setOpenCallouts((prev) => ({
      ...prev,
      [idx]: prev[idx] !== undefined ? !prev[idx] : false, // Default is usually open, toggle flips
    }));
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  const toggleChecklist = useCallback((idx: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  const sizeClasses = useMemo(() => {
    switch (fontSize) {
      case 'sm':
        return {
          body: 'text-sm',
          callout: 'text-sm',
          table: 'text-xs sm:text-sm',
          h1: 'text-xl sm:text-2xl',
          h2: 'text-base sm:text-lg',
          h3: 'text-sm sm:text-base',
          code: 'text-xs sm:text-sm',
          bannerTitle: 'text-xl sm:text-2xl',
        };
      case 'lg':
        return {
          body: 'text-lg',
          callout: 'text-lg',
          table: 'text-base sm:text-lg',
          h1: 'text-3xl sm:text-4xl',
          h2: 'text-xl sm:text-2xl',
          h3: 'text-lg',
          code: 'text-base',
          bannerTitle: 'text-3xl sm:text-4xl',
        };
      case 'xl':
        return {
          body: 'text-xl',
          callout: 'text-xl',
          table: 'text-lg sm:text-xl',
          h1: 'text-4xl sm:text-5xl',
          h2: 'text-2xl sm:text-3xl',
          h3: 'text-xl',
          code: 'text-lg',
          bannerTitle: 'text-4xl sm:text-5xl',
        };
      case 'base':
      default:
        return {
          body: 'text-base',
          callout: 'text-base',
          table: 'text-sm sm:text-base',
          h1: 'text-2xl sm:text-3xl',
          h2: 'text-lg sm:text-xl',
          h3: 'text-base',
          code: 'text-sm sm:text-base',
          bannerTitle: 'text-2xl sm:text-3xl',
        };
    }
  }, [fontSize]);

  // Inline wikilink renderer with zero-popup navigation
  const renderWithWikilinks = (text: string) => {
    const parts: React.ReactNode[] = [];
    const wikiRegex = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = wikiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const targetRaw = match[1].trim();
      const anchor = match[2] ? match[2].trim() : undefined;
      const alias = match[3] ? match[3].trim() : undefined;
      const res = resolveWikilink(targetRaw);
      const displayText = alias || (anchor ? `${res.label} › ${anchor}` : res.label);

      if (res.exists && res.targetNoteId) {
        const targetId = res.targetNoteId;
        parts.push(
          <a
            key={match.index}
            href={`#note-${targetId}${anchor ? '#' + slugifyHeading(anchor) : ''}`}
            data-wikilink={targetId}
            data-anchor={anchor ? slugifyHeading(anchor) : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (onOpenNote) {
                onOpenNote(targetId, {
                  background: e.ctrlKey || e.metaKey || e.button === 1,
                  anchor: anchor ? slugifyHeading(anchor) : undefined,
                });
              } else {
                onNavigateToNote(targetId);
              }
            }}
            className="inline-flex items-center gap-1 font-mono font-semibold text-purple-700 dark:text-purple-300 hover:text-cyan-600 dark:hover:text-cyan-300 underline underline-offset-2 decoration-purple-400/50 hover:decoration-cyan-400 transition-colors cursor-pointer"
            title={`Open note: ${res.label}${anchor ? ' #' + anchor : ''}`}
          >
            <LinkIcon className="w-3 h-3 text-purple-500/70 dark:text-purple-400/70 inline flex-shrink-0" />
            <span>{displayText}</span>
          </a>
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={`#search-${encodeURIComponent(targetRaw)}`}
            data-wikilink={targetRaw}
            onClick={(e) => {
              e.preventDefault();
              if (onOpenNotePicker) {
                onOpenNotePicker(targetRaw);
              } else if (onNavigateToNote) {
                onNavigateToNote(targetRaw);
              }
            }}
            className="inline-flex items-center gap-1 font-mono font-medium text-purple-600 dark:text-purple-400 hover:text-cyan-600 dark:hover:text-cyan-300 underline underline-offset-2 decoration-purple-400/40 hover:decoration-cyan-400 transition-colors cursor-pointer"
            title={`Search field manual for: ${targetRaw}`}
          >
            <Search className="w-2.5 h-2.5 opacity-70 inline flex-shrink-0 text-cyan-400" />
            <span>{displayText}</span>
          </a>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Render stylized Obsidian callouts
  const renderCallout = (callout: ObsidianCallout, idx: number) => {
    const isOpen = openCallouts[idx] !== undefined 
      ? openCallouts[idx] 
      : !callout.isFoldedByDefault;

    let icon = <Info className="w-4 h-4 text-blue-700 dark:text-blue-400" />;
    let borderColor = 'border-blue-500/40';
    let bgColor = 'bg-blue-500/10';
    let titleColor = 'dark:text-blue-300 text-blue-800';

    switch (callout.type) {
      case 'tip':
        icon = <Lightbulb className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />;
        borderColor = 'border-emerald-500/40';
        bgColor = 'bg-emerald-500/10';
        titleColor = 'dark:text-emerald-300 text-emerald-800';
        break;
      case 'warning':
        icon = <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />;
        borderColor = 'border-amber-500/40';
        bgColor = 'bg-amber-500/10';
        titleColor = 'dark:text-amber-300 text-amber-800';
        break;
      case 'danger':
        icon = <Flame className="w-4 h-4 text-rose-700 dark:text-rose-400" />;
        borderColor = 'border-rose-500/40';
        bgColor = 'bg-rose-500/10';
        titleColor = 'dark:text-rose-300 text-rose-800';
        break;
      case 'important':
        icon = <ShieldAlert className="w-4 h-4 text-purple-700 dark:text-purple-400" />;
        borderColor = 'border-purple-500/40';
        bgColor = 'bg-purple-500/10';
        titleColor = 'dark:text-purple-300 text-purple-800';
        break;
      case 'cite':
        icon = <Quote className="w-4 h-4 text-slate-700 dark:text-slate-400" />;
        borderColor = 'border-slate-500/40';
        bgColor = 'bg-slate-500/10';
        titleColor = 'dark:text-slate-300 text-slate-800';
        break;
      case 'question':
        icon = <HelpCircle className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />;
        borderColor = 'border-cyan-500/40';
        bgColor = 'bg-cyan-500/10';
        titleColor = 'dark:text-cyan-300 text-cyan-800';
        break;
      case 'success':
        icon = <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />;
        borderColor = 'border-teal-500/40';
        bgColor = 'bg-teal-500/10';
        titleColor = 'dark:text-teal-300 text-teal-800';
        break;
    }

    const isRtl = /[\u0590-\u05FF]/.test(callout.title + ' ' + callout.content);

    return (
      <div
        key={`callout-${idx}`}
        className={`my-3 rounded-xl border ${borderColor} ${bgColor} overflow-hidden shadow-sm`}
      >
        <div
          onClick={() => callout.isFoldable && toggleCallout(idx)}
          className={`flex items-center justify-between px-3.5 py-2 select-none ${
            callout.isFoldable ? 'cursor-pointer hover:bg-white/5' : ''
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className={`flex items-center gap-2 font-mono font-bold ${fontSize === 'xl' || fontSize === 'lg' ? 'text-sm' : 'text-xs'}`}>
            {icon}
            <span className={titleColor}>{callout.title}</span>
          </div>
          {callout.isFoldable && (
            <div className="text-cyber-muted">
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          )}
        </div>

        {isOpen && (
          <div
            className={`px-4 py-3 pt-1 ${sizeClasses.callout || sizeClasses.body} font-sans leading-relaxed text-slate-700 dark:text-gray-200 border-t border-white/5`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {renderFormattedMarkdown(callout.content)}
          </div>
        )}
      </div>
    );
  };

  // Render markdown line-by-line with code blocks, tables, lists, and anchors
  const renderFormattedMarkdown = (raw: string) => {
    if (!raw) return null;
    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];

    let inTable = false;
    let tableBuffer: string[] = [];

    const flushCodeBlock = (idx: number) => {
      if (codeBuffer.length === 0) return;
      const rawCode = codeBuffer.join('\n');
      const interpCode = interpolateCommand(rawCode, globalVars);
      const isCopied = copiedId === `code-${idx}`;

      elements.push(
        <div
          key={`code-block-${idx}`}
          className="my-3 rounded-xl border border-purple-900/40 bg-cyber-code overflow-hidden shadow-md group"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-purple-900/30 text-[11px] font-mono text-cyber-muted">
            <span className="flex items-center gap-1.5 text-purple-300 font-semibold uppercase">
              <Terminal className="w-3 h-3 text-cyan-400" />
              <span>{codeLanguage || 'COMMAND / SCRIPT'}</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopyText(`code-${idx}`, interpCode)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-800/50 text-purple-200 hover:text-white transition-colors cursor-pointer text-[10px]"
              title="Copy interpolated code"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 text-cyber-emerald" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>
          <pre className={`p-3.5 ${sizeClasses.code} font-mono dark:text-emerald-300 text-emerald-900 overflow-x-auto select-all selection:bg-purple-700 selection:text-white leading-relaxed`}>
            {interpCode}
          </pre>
        </div>
      );
      codeBuffer = [];
      inCodeBlock = false;
    };

    const flushTable = (idx: number) => {
      if (tableBuffer.length < 2) {
        tableBuffer = [];
        return;
      }
      const headerRow = tableBuffer[0];
      const bodyRows = tableBuffer.slice(2);
      const headers = headerRow.split('|').filter(c => c.trim()).map(c => c.trim());

      elements.push(
        <div key={`table-${idx}`} className="my-4 overflow-x-auto rounded-xl border border-purple-900/40 bg-black/50 shadow-md">
          <table className={`w-full ${sizeClasses.table} text-left font-mono`}>
            <thead className="bg-purple-950/70 text-purple-200 border-b border-purple-900/50">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className={`px-4 py-2.5 font-bold ${hIdx === 0 ? 'whitespace-nowrap w-12' : ''}`}>{renderWithWikilinks(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/25 dark:text-gray-200 text-gray-900">
              {bodyRows.map((r, rIdx) => {
                const cells = r.split('|').filter(c => c.trim()).map(c => c.trim());
                return (
                  <tr key={rIdx} className="hover:bg-purple-900/25 transition-colors">
                    {cells.map((c, cIdx) => (
                      <td key={cIdx} className={`px-4 py-2.5 ${cIdx === 0 ? 'whitespace-nowrap font-bold dark:text-cyan-400 text-cyan-800' : ''}`}>
                        {renderWithWikilinks(c)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block start/end
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock(i);
        } else {
          inCodeBlock = true;
          codeLanguage = line.trim().replace(/^```/, '').trim();
          codeBuffer = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Markdown Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
        continue;
      } else if (inTable) {
        flushTable(i);
      }

      // Headings with slugified ID anchors
      if (line.startsWith('# ')) {
        const titleText = line.replace('# ', '').trim();
        const headingSlug = slugifyHeading(titleText);
        elements.push(
          <h1
            key={`h1-${i}`}
            id={`section-${headingSlug}`}
            className={`${sizeClasses.h1} font-black text-slate-900 dark:text-white tracking-tight mt-6 mb-2 pb-1 border-b border-purple-900/30 scroll-mt-6`}
          >
            {renderWithWikilinks(titleText)}
          </h1>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        const titleText = line.replace('## ', '').trim();
        const headingSlug = slugifyHeading(titleText);
        elements.push(
          <h2
            key={`h2-${i}`}
            id={`section-${headingSlug}`}
            className={`${sizeClasses.h2} font-bold text-purple-700 dark:text-purple-300 tracking-tight mt-5 mb-2 scroll-mt-6 flex items-center gap-1.5`}
          >
            <span className="text-cyan-400">#</span>
            <span>{renderWithWikilinks(titleText)}</span>
          </h2>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        const titleText = line.replace('### ', '').trim();
        const headingSlug = slugifyHeading(titleText);
        elements.push(
          <h3
            key={`h3-${i}`}
            id={`section-${headingSlug}`}
            className={`${sizeClasses.h3} font-bold text-cyan-700 dark:text-cyan-300 mt-4 mb-1 scroll-mt-6`}
          >
            {renderWithWikilinks(titleText)}
          </h3>
        );
        continue;
      }

      // Callouts > [!type]
      if (line.startsWith('> [!')) {
        const headerMatch = line.match(/^>\s*\[!([a-zA-Z_-]+)\]([+-])?\s*(.*)$/);
        if (headerMatch) {
          const rawType = headerMatch[1].toLowerCase();
          const foldChar = headerMatch[2];
          const calloutTitle = headerMatch[3].trim();

          let type: ObsidianCallout['type'] = 'note';
          if (['tip', 'hint'].includes(rawType)) type = 'tip';
          else if (['warning', 'caution', 'attention'].includes(rawType)) type = 'warning';
          else if (['danger', 'bug', 'failure', 'error'].includes(rawType)) type = 'danger';
          else if (['example', 'meta'].includes(rawType)) type = 'example';
          else if (rawType === 'important') type = 'important';
          else if (['cite', 'quote'].includes(rawType)) type = 'cite';
          else if (['success', 'check', 'done'].includes(rawType)) type = 'success';
          else if (rawType === 'question') type = 'question';

          const bodyLines: string[] = [];
          let j = i + 1;
          while (j < lines.length && (lines[j].startsWith('>') || lines[j].trim() === '')) {
            if (lines[j].startsWith('> [!')) break;
            if (lines[j].trim() === '') {
              if (j + 1 < lines.length && lines[j + 1].startsWith('>')) {
                bodyLines.push('');
                j++;
                continue;
              } else {
                break;
              }
            }
            bodyLines.push(lines[j].replace(/^>\s?/, ''));
            j++;
          }
          i = j - 1;

          elements.push(renderCallout({
            type,
            title: calloutTitle || type.toUpperCase(),
            content: bodyLines.join('\n').trim(),
            isFoldable: foldChar === '+' || foldChar === '-',
            isFoldedByDefault: foldChar === '-',
          }, i));
          continue;
        }
      }

      // Checklists - [ ] or - [x]
      if (/^[-*]\s+\[([ xX])\]\s+(.*)$/.test(line.trim())) {
        const chkMatch = line.trim().match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
        if (chkMatch) {
          const isInitialChecked = chkMatch[1].toLowerCase() === 'x';
          const itemText = chkMatch[2];
          const isChecked = checkedItems[i] !== undefined ? checkedItems[i] : isInitialChecked;

          elements.push(
            <div
              key={`chk-${i}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName.toLowerCase() !== 'input') {
                  toggleChecklist(i);
                }
              }}
              className={`flex items-start gap-2.5 my-1.5 px-2.5 py-1.5 rounded hover:bg-purple-950/30 transition-colors cursor-pointer select-none ${sizeClasses.body} font-sans`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleChecklist(i)}
                className="mt-1 w-4 h-4 rounded border-purple-500/50 bg-black/60 text-purple-600 focus:ring-purple-400 cursor-pointer flex-shrink-0"
              />
              <span className={isChecked ? 'line-through text-cyber-muted opacity-70' : 'dark:text-slate-200 text-slate-900'}>
                {renderWithWikilinks(itemText)}
              </span>
            </div>
          );
          continue;
        }
      }

      // Bullets
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().slice(2);
        elements.push(
          <div key={`bullet-${i}`} className={`flex items-start gap-2 my-1.5 ${sizeClasses.body} text-slate-700 dark:text-gray-300 font-sans`}>
            <span className="text-purple-400 mt-1">•</span>
            <div className="flex-1">{renderWithWikilinks(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Horizontal Rule
      if (['---', '***'].includes(line.trim())) {
        elements.push(<hr key={`hr-${i}`} className="my-4 border-purple-900/30" />);
        continue;
      }

      // Sanitized SVG
      if (line.trim().startsWith('<svg') && line.trim().endsWith('</svg>')) {
        const cleanSvg = sanitizeSvg(line.trim());
        if (cleanSvg) {
          elements.push(
            <div
              key={`svg-${i}`}
              className="my-3 overflow-x-auto rounded-lg border border-purple-900/30 p-2 bg-slate-950/60"
              dangerouslySetInnerHTML={{ __html: cleanSvg }}
            />
          );
          continue;
        }
      }

      // Standard Paragraph
      if (line.trim()) {
        const isRtl = /[\u0590-\u05FF]/.test(line);
        elements.push(
          <p
            key={`p-${i}`}
            dir={isRtl ? 'rtl' : 'ltr'}
            className={`my-2 ${sizeClasses.body} text-slate-700 dark:text-gray-300 leading-relaxed font-sans ${
              isRtl ? 'text-right' : 'text-left'
            }`}
          >
            {renderWithWikilinks(line)}
          </p>
        );
      }
    }

    if (inCodeBlock) flushCodeBlock(lines.length);
    if (inTable) flushTable(lines.length);

    return elements;
  };

  const renderMarkdownPreview = () => (
    <div className="space-y-6">
      {/* Table of Contents / Outline Chips */}
      {parsed.tableOfContents && parsed.tableOfContents.length > 1 && (
        <div className="sticky top-0 z-20 flex items-center gap-1.5 p-2 px-3 rounded-xl bg-slate-100/95 dark:bg-slate-950/90 backdrop-blur-md border border-slate-300 dark:border-purple-900/40 shadow-lg overflow-x-auto scrollbar-thin text-xs my-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-purple-700 dark:text-purple-300 font-bold pr-1 border-r border-slate-300 dark:border-purple-800/40 flex-shrink-0">
            <List className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>OUTLINE:</span>
          </div>
          {parsed.tableOfContents.map((toc, tIdx) => {
            const headingSlug = slugifyHeading(toc.text);
            return (
              <button
                key={tIdx}
                type="button"
                onClick={() => {
                  const el = scrollContainerRef.current?.querySelector(`#section-${headingSlug}`) ||
                             document.getElementById(`section-${toc.id}`) ||
                             document.getElementById(`section-${headingSlug}`);
                  if (el && typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    if (soundEnabled) playCyberSound('click');
                  }
                }}
                className="px-2.5 py-1 rounded bg-slate-200/80 dark:bg-purple-900/30 hover:bg-slate-300 dark:hover:bg-purple-800/50 border border-slate-300 dark:border-purple-800/30 text-slate-800 dark:text-purple-200 hover:text-black dark:hover:text-white text-xs font-mono flex-shrink-0 transition-colors cursor-pointer"
              >
                {toc.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Render Parsed Markdown Body */}
      <div className="space-y-3">
        {langMode === 'he' && parsed.hebrewSection ? (
          <div dir="rtl" className="font-sans leading-relaxed text-slate-800 dark:text-gray-200">
            {renderFormattedMarkdown(parsed.hebrewSection)}
          </div>
        ) : (
          <div dir="ltr" className="font-sans leading-relaxed text-slate-800 dark:text-gray-200">
            {renderFormattedMarkdown(parsed.englishSection || deferredContent)}
          </div>
        )}
      </div>

      {/* Obsidian Backlinks Footer */}
      {backlinks.length > 0 && (
        <div className="mt-8 pt-4 border-t border-purple-900/30">
          <div className="flex items-center gap-2 mb-3 text-xs font-mono font-bold text-purple-400">
            <LinkIcon className="w-3.5 h-3.5" />
            <span>OBSIDIAN BACKLINKS ({backlinks.length} REFERENCES)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {backlinks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  if (onOpenNote) {
                    onOpenNote(b.id);
                  } else {
                    onNavigateToNote(b.id);
                  }
                }}
                className="p-2 rounded-xl bg-purple-950/20 hover:bg-purple-900/40 border border-purple-900/30 hover:border-purple-400 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-mono font-bold text-purple-300 group-hover:text-cyan-300 truncate">
                  {b.titleEn || b.title}
                </div>
                <div className="text-[10px] font-mono text-cyber-muted truncate">
                  {b.category} {b.subCategory ? `› ${b.subCategory}` : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={scrollContainerRef}
      data-tab-content-id={note.id}
      className={`p-4 sm:p-6 lg:p-8 pb-36 space-y-6 ${isMaximized ? 'max-w-full px-6 sm:px-12' : 'max-w-6xl'} mx-auto w-full select-text transition-colors duration-150`}
    >
      {/* Title & Metadata Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-cyber-card border border-purple-500/20 shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1
            className={`${sizeClasses.bannerTitle} font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 ${
              langMode === 'he' ? 'font-sans text-right' : 'font-mono text-left'
            }`}
            dir={langMode === 'he' ? 'rtl' : 'ltr'}
          >
            <span className="text-purple-400 flex-shrink-0">🛡️</span>
            <span>{langMode === 'he' ? (note.titleHe || note.title) : (note.titleEn || note.title)}</span>
          </h1>

          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
            {note.stage && (
              <span className="px-2 py-0.5 rounded font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Stage: {note.stage}
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {note.difficulty || 'Core'}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyber-bg border border-cyber-border text-cyber-muted">
              {note.noteType || 'Field Manual'}
            </span>
            {note.dateModified && (
              <span className="px-2 py-0.5 rounded text-cyber-muted bg-black/40 border border-white/5 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {note.dateModified}
              </span>
            )}
            {onViewModeChange && viewMode === 'reading' && (
              <button
                type="button"
                onClick={() => {
                  onViewModeChange('split');
                  if (soundEnabled) playCyberSound('click');
                }}
                className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:border-purple-400 transition-colors flex items-center gap-1 cursor-pointer"
                title="Switch to Split Edit View"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>Edit Note</span>
              </button>
            )}
          </div>
        </div>

        {/* Tags & Tools */}
        {(note.tags?.length || note.tools?.length) && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-purple-900/20 flex-wrap">
            {note.tags && note.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {note.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {note.tools && note.tools.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-cyber-muted">Tools:</span>
                {note.tools.map((tool) => (
                  <span
                    key={tool}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Raw Markdown Mode: Full Interactive In-App Editor */}
      {viewMode === 'raw' && (
        <MarkdownEditor
          noteId={note.id}
          initialContent={liveContent}
          onContentChange={setLiveContent}
          globalVars={globalVars}
          soundEnabled={soundEnabled}
          minHeight="550px"
        />
      )}

      {/* Split Mode: Side-by-Side In-App Editor on Left, Live Preview on Right */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="min-w-0">
            <MarkdownEditor
              noteId={note.id}
              initialContent={liveContent}
              onContentChange={setLiveContent}
              globalVars={globalVars}
              soundEnabled={soundEnabled}
              isSplitView={true}
              minHeight="600px"
            />
          </div>
          <div className="min-w-0 rounded-xl border border-slate-300 dark:border-cyber-border bg-white dark:bg-surface-elevated/70 p-4 sm:p-5 shadow-sm overflow-y-auto max-h-[850px] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10 text-xs font-mono text-slate-500 dark:text-cyber-muted">
              <span className="font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <BookOpen className="w-3.5 h-3.5" />
                <span>LIVE PREVIEW</span>
              </span>
              <span className="text-[11px] font-medium">Auto-rendering</span>
            </div>
            {renderMarkdownPreview()}
          </div>
        </div>
      )}

      {/* Rich Reading Mode */}
      {viewMode === 'reading' && renderMarkdownPreview()}
    </div>
  );
};
