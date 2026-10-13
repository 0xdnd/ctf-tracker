import React, { useState, useCallback, useMemo } from 'react';
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
  Link as LinkIcon,
  Search,
} from 'lucide-react';
import { resolveWikilink, ObsidianCallout } from '../../utils/obsidianManualUtils';
import { interpolateCommand, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { useEffectiveGlobalVars } from '../../hooks/useActiveTargetIp';
import { sanitizeSvg } from '../../utils/securityUtils';
import { GlobalVariables } from '../../types';
import { OpenNoteOptions } from '../../types/workspace';
import { slugifyHeading } from '../../utils/workspaceLinkInterceptor';
import { renderPlaceholderChips } from '../common/PlaceholderChip';

export type ObsidianFontSize = 'sm' | 'base' | 'lg' | 'xl';

export function getObsidianSizeClasses(fontSize: ObsidianFontSize) {
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
}

export interface ObsidianMarkdownBodyProps {
  /** Raw Obsidian-flavoured markdown. */
  content: string;
  globalVars: GlobalVariables;
  soundEnabled: boolean;
  fontSize?: ObsidianFontSize;
  onNavigateToNote?: (noteId: string) => void;
  onOpenNote?: (noteId: string, options?: OpenNoteOptions) => void;
  onOpenNotePicker?: (query?: string) => void;
  /**
   * Pin `{TARGET}` to this IP (machine-scoped notes). Without it the engaged
   * target's IP wins over the global RHOST.
   */
  targetIp?: string;
}

/**
 * Obsidian markdown renderer shared by the notes workspace and machine quick
 * notes: callouts, tables, checklists, wikilinks, inline code and fenced code
 * blocks (with Copy of the resolved command and placeholder chips).
 */
export const ObsidianMarkdownBody: React.FC<ObsidianMarkdownBodyProps> = ({
  content,
  globalVars,
  soundEnabled,
  fontSize = 'base',
  onNavigateToNote,
  onOpenNote,
  onOpenNotePicker,
  targetIp,
}) => {
  const [openCallouts, setOpenCallouts] = useState<Record<number, boolean>>({});
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Engaged target's IP wins over the global RHOST (shared precedence helper).
  const engagedVars = useEffectiveGlobalVars(globalVars);
  const effectiveVars = useMemo(
    () => (targetIp ? { ...globalVars, targetIp } : engagedVars),
    [targetIp, globalVars, engagedVars]
  );
  const sizeClasses = getObsidianSizeClasses(fontSize);

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

  // Inline `code` spans render as <code> with placeholder chips; the rest
  // of the line goes through the wikilink renderer.
  const renderWithWikilinks = (text: string): React.ReactNode => {
    if (!text.includes('`')) return renderWikilinks(text);
    const chunks = text.split('`');
    // An unmatched trailing backtick stays literal text.
    if (chunks.length % 2 === 0) chunks[chunks.length - 2] += '`' + chunks.pop();
    return chunks.map((chunk, idx) =>
      idx % 2 === 1 && chunk ? (
        <code
          key={`code-${idx}`}
          className="rounded border border-subtle bg-surface-sunken px-1 py-px font-mono tabular-nums text-[0.9em] text-primary"
        >
          {renderPlaceholderChips(chunk, effectiveVars)}
        </code>
      ) : (
        <React.Fragment key={`txt-${idx}`}>{renderWikilinks(idx % 2 === 1 ? '``' : chunk)}</React.Fragment>
      )
    );
  };

  // Inline wikilink renderer with zero-popup navigation
  const renderWikilinks = (text: string) => {
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
                onNavigateToNote?.(targetId);
              }
            }}
            className="inline-flex items-center gap-1 font-semibold text-accent rounded-sm underline underline-offset-2 decoration-accent/50 hover:decoration-accent transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            title={`Open note: ${res.label}${anchor ? ' #' + anchor : ''}`}
          >
            <LinkIcon className="w-3 h-3 text-accent/70 inline flex-shrink-0" />
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
            className="inline-flex items-center gap-1 font-medium text-accent rounded-sm underline underline-offset-2 decoration-accent/40 hover:decoration-accent transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            title={`Search field manual for: ${targetRaw}`}
          >
            <Search className="w-2.5 h-2.5 opacity-70 inline flex-shrink-0 text-accent" />
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

    let icon = <Info className="w-4 h-4 text-muted" />;
    let variant = 'callout-info';
    let borderColor = 'border-subtle';
    let bgColor = 'bg-surface-sunken';
    let titleColor = 'text-secondary';

    const VARIANTS = {
      info: { variant: 'callout-info', border: 'border-subtle', bg: 'bg-surface-sunken', fg: 'text-secondary' },
      tip: { variant: 'callout-tip', border: 'border-subtle', bg: 'bg-surface-sunken', fg: 'text-secondary' },
      warn: { variant: 'callout-warn', border: 'border-callout-warn-border', bg: 'bg-callout-warn-bg', fg: 'text-callout-warn-fg' },
      danger: { variant: 'callout-danger', border: 'border-callout-danger-border', bg: 'bg-callout-danger-bg', fg: 'text-callout-danger-fg' },
      success: { variant: 'callout-success', border: 'border-callout-success-border', bg: 'bg-callout-success-bg', fg: 'text-callout-success-fg' },
    } as const;
    const setVariant = (v: keyof typeof VARIANTS) => {
      variant = VARIANTS[v].variant;
      borderColor = VARIANTS[v].border;
      bgColor = VARIANTS[v].bg;
      titleColor = VARIANTS[v].fg;
    };

    switch (callout.type) {
      case 'tip':
        icon = <Lightbulb className="w-4 h-4 text-muted" />;
        setVariant('tip');
        break;
      case 'warning':
        icon = <AlertTriangle className="w-4 h-4 text-callout-warn-fg" />;
        setVariant('warn');
        break;
      case 'danger':
        icon = <Flame className="w-4 h-4 text-callout-danger-fg" />;
        setVariant('danger');
        break;
      case 'important':
        icon = <ShieldAlert className="w-4 h-4 text-callout-warn-fg" />;
        setVariant('warn');
        break;
      case 'cite':
        icon = <Quote className="w-4 h-4 text-secondary" />;
        variant = 'callout-cite';
        borderColor = 'border-strong';
        bgColor = 'bg-surface-sunken';
        titleColor = 'text-secondary';
        break;
      case 'question':
        icon = <HelpCircle className="w-4 h-4 text-muted" />;
        setVariant('info');
        break;
      case 'success':
        icon = <CheckCircle2 className="w-4 h-4 text-callout-success-fg" />;
        setVariant('success');
        break;
    }

    const isRtl = /[\u0590-\u05FF]/.test(callout.title + ' ' + callout.content);

    return (
      <div
        key={`callout-${idx}`}
        className={`my-3 rounded-lg border border-l-2 ${variant} ${borderColor} ${bgColor} overflow-hidden`}
      >
        <div
          onClick={() => callout.isFoldable && toggleCallout(idx)}
          className={`flex items-center justify-between px-3.5 py-2 select-none ${
            callout.isFoldable ? 'cursor-pointer hover:bg-surface-hover' : ''
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className={`flex items-center gap-2 font-semibold ${fontSize === 'xl' || fontSize === 'lg' ? 'text-sm' : 'text-xs'}`}>
            {icon}
            <span className={titleColor}>{callout.title}</span>
          </div>
          {callout.isFoldable && (
            <div className="text-muted">
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          )}
        </div>

        {isOpen && (
          <div
            className={`px-4 py-3 pt-1 ${sizeClasses.callout || sizeClasses.body} font-sans leading-relaxed text-secondary border-t border-subtle`}
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
      const interpCode = interpolateCommand(rawCode, effectiveVars);
      const isCopied = copiedId === `code-${idx}`;

      elements.push(
        <div
          key={`code-block-${idx}`}
          className="my-3 rounded-xl border border-subtle bg-surface-inverse text-on-inverse overflow-hidden group"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-inverse-elevated text-[11px] text-on-inverse-muted">
            <span className="flex items-center gap-1.5 font-medium">
              <Terminal className="w-3 h-3" />
              <span>{codeLanguage || 'Command / script'}</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopyText(`code-${idx}`, interpCode)}
              className="active:scale-[0.97] flex items-center gap-1 px-2 py-0.5 rounded text-on-inverse-muted hover:bg-surface-inverse hover:text-on-inverse transition-interactive cursor-pointer text-[11px]"
              title="Copy interpolated code"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 text-syntax-string" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className={`p-3.5 ${sizeClasses.code} font-mono tabular-nums text-on-inverse overflow-x-auto select-all selection:bg-accent-muted selection:text-primary leading-relaxed`}>
            {renderPlaceholderChips(rawCode, effectiveVars, 'inverse')}
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
        <div key={`table-${idx}`} className="my-4 overflow-x-auto rounded-xl border border-accent/40 bg-surface-sunken">
          <table className={`w-full ${sizeClasses.table} text-left`}>
            <thead className="bg-accent-muted text-accent border-b border-accent/50">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className={`px-4 py-2.5 font-semibold ${hIdx === 0 ? 'whitespace-nowrap w-12' : ''}`}>{renderWithWikilinks(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle text-primary">
              {bodyRows.map((r, rIdx) => {
                const cells = r.split('|').filter(c => c.trim()).map(c => c.trim());
                return (
                  <tr key={rIdx} className="hover:bg-accent-muted transition-colors">
                    {cells.map((c, cIdx) => (
                      <td key={cIdx} className={`px-4 py-2.5 ${cIdx === 0 ? 'whitespace-nowrap font-semibold text-accent' : ''}`}>
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
            className={`${sizeClasses.h1} font-semibold text-primary tracking-tight mt-6 mb-2 pb-1 border-b border-accent/30 scroll-mt-6`}
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
            className={`${sizeClasses.h2} font-semibold text-accent tracking-tight mt-5 mb-2 scroll-mt-6 flex items-center gap-1.5`}
          >
            <span className="text-accent">#</span>
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
            className={`${sizeClasses.h3} font-semibold text-accent mt-4 mb-1 scroll-mt-6`}
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
              className={`flex items-start gap-2.5 my-1.5 px-2.5 py-1.5 rounded hover:bg-accent-muted transition-colors cursor-pointer select-none ${sizeClasses.body} font-sans`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleChecklist(i)}
                className="mt-1 w-4 h-4 rounded border-accent/50 bg-surface-sunken text-accent focus:ring-accent cursor-pointer flex-shrink-0"
              />
              <span className={isChecked ? 'line-through text-muted opacity-70' : 'text-primary'}>
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
          <div key={`bullet-${i}`} className={`flex items-start gap-2 my-1.5 ${sizeClasses.body} text-secondary font-sans`}>
            <span className="text-accent mt-1">•</span>
            <div className="flex-1">{renderWithWikilinks(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Horizontal Rule
      if (['---', '***'].includes(line.trim())) {
        elements.push(<hr key={`hr-${i}`} className="my-4 border-accent/30" />);
        continue;
      }

      // Sanitized SVG
      if (line.trim().startsWith('<svg') && line.trim().endsWith('</svg>')) {
        const cleanSvg = sanitizeSvg(line.trim());
        if (cleanSvg) {
          elements.push(
            <div
              key={`svg-${i}`}
              className="my-3 overflow-x-auto rounded-lg border border-accent/30 p-2 bg-surface-sunken"
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
            className={`my-2 ${sizeClasses.body} text-secondary leading-relaxed font-sans ${
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

  return <>{renderFormattedMarkdown(content)}</>;
};
