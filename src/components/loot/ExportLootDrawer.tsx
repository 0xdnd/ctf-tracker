import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileJson, 
  FileSpreadsheet, 
  FileText, 
  Layers,
  Database
} from 'lucide-react';
import { VaultEvidenceItem } from '../../pages/EvidenceVaultPage';
import { DRAWER_SLIDE_TRANSITION, DRAWER_RIGHT_VARIANTS } from '../../utils/motionTokens';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';

export interface ExportLootDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: VaultEvidenceItem[];
  filteredItems: VaultEvidenceItem[];
  soundEnabled?: boolean;
}

export const ExportLootDrawer: React.FC<ExportLootDrawerProps> = ({
  isOpen,
  onClose,
  items,
  filteredItems,
  soundEnabled = false,
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeItems = exportScope === 'filtered' ? filteredItems : items;

  // Generate JSON format
  const generateJson = () => {
    return JSON.stringify(
      {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        totalItems: activeItems.length,
        evidence: activeItems,
      },
      null,
      2
    );
  };

  // Generate RFC 4180 CSV format
  const generateCsv = () => {
    const headers = [
      'Target Name',
      'Target IP',
      'Platform',
      'Category',
      'Type Label',
      'Username / Identity',
      'Secret / Key',
      'Discovered At',
      'Tactical Notes',
    ];

    const escapeCsv = (val: string | undefined | null) => {
      const s = String(val || '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = activeItems.map((item) =>
      [
        escapeCsv(item.targetName),
        escapeCsv(item.targetIp),
        escapeCsv(item.platform),
        escapeCsv(item.category),
        escapeCsv(item.typeLabel),
        escapeCsv(item.username),
        escapeCsv(item.secret),
        escapeCsv(item.discoveredAt),
        escapeCsv(item.notes),
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  // Generate Markdown Pentest Table
  const generateMarkdown = () => {
    const lines = [
      `# ZeroBox Intelligence Vault Export`,
      ``,
      `*Exported: ${new Date().toISOString()} | Total Artifacts: ${activeItems.length}*`,
      ``,
      `| Target | IP | Category | Identity | Secret | Discovered At | Notes |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`,
    ];

    activeItems.forEach((it) => {
      const escapeMd = (s: string) => (s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      lines.push(
        `| **${escapeMd(it.targetName)}** | \`${escapeMd(it.targetIp)}\` | ${escapeMd(it.typeLabel)} | \`${escapeMd(it.username || 'N/A')}\` | \`${escapeMd(it.secret)}\` | ${escapeMd(it.discoveredAt.substring(0, 10))} | ${escapeMd(it.notes || '-')} |`
      );
    });

    return lines.join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (soundEnabled) playCyberSound('root');
  };

  const handleDownload = (format: 'json' | 'csv' | 'markdown') => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      downloadFile(generateJson(), `zerobox-loot-${dateStr}.json`, 'application/json');
    } else if (format === 'csv') {
      downloadFile(generateCsv(), `zerobox-loot-${dateStr}.csv`, 'text/csv');
    } else if (format === 'markdown') {
      downloadFile(generateMarkdown(), `zerobox-loot-${dateStr}.md`, 'text/markdown');
    }
  };

  const handleCopy = (format: 'json' | 'csv' | 'markdown') => {
    let content = '';
    if (format === 'json') content = generateJson();
    else if (format === 'csv') content = generateCsv();
    else if (format === 'markdown') content = generateMarkdown();

    safeCopyToClipboard(content);
    setCopiedFormat(format);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => {
      setCopiedFormat((prev) => (prev === format ? null : prev));
    }, 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="export-loot-drawer"
          variants={DRAWER_RIGHT_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-y-0 right-0 z-[120] w-full max-w-md bg-surface-elevated border-l border-subtle shadow-2xl flex flex-col font-sans machined-edge"
          role="dialog"
          aria-label="Evidence Vault Exporter"
        >
          {/* Header */}
          <div className="p-4 border-b border-subtle flex items-center justify-between bg-surface-card/90 backdrop-blur-sm machined-edge">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-sunken border border-subtle text-secondary">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  Export evidence
                </h3>
                <p className="text-[11px] text-muted">
                  Package artifacts as portable reports and tables
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 max-sm:p-3 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors active:scale-[0.97] cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Scope Selection Box */}
            <div className="p-3 rounded-xl bg-surface-sunken border border-subtle space-y-2 machined-edge">
              <div className="text-[11px] font-semibold text-muted flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>Export scope</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-interactive active:scale-[0.97] cursor-pointer text-left ${
 exportScope === 'all'
 ? 'bg-accent/15 border-accent text-accent shadow-xs'
 : 'bg-surface-card border-subtle text-secondary hover:text-primary'
 }`}
                >
                  <div className="font-semibold">All artifacts</div>
                  <div className="text-[11px] font-mono tabular-nums opacity-75 mt-0.5">
                    {items.length} records
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('filtered')}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-interactive active:scale-[0.97] cursor-pointer text-left ${
 exportScope === 'filtered'
 ? 'bg-accent/15 border-accent text-accent shadow-xs'
 : 'bg-surface-card border-subtle text-secondary hover:text-primary'
 }`}
                >
                  <div className="font-semibold">Filtered scope</div>
                  <div className="text-[11px] font-mono tabular-nums opacity-75 mt-0.5">
                    {filteredItems.length} records
                  </div>
                </button>
              </div>
            </div>

            {/* Format 1: JSON */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-subtle space-y-2.5 machined-edge">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-surface-sunken border border-subtle text-secondary">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-primary">JSON package (.json)</h4>
                    <p className="text-[11px] text-muted">Complete ZeroBox vault schema</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownload('json')}
                  className="flex-1 py-1.5 max-sm:py-3 px-3 rounded-lg bg-surface-elevated border border-strong text-primary hover:bg-surface-hover font-semibold text-xs transition-interactive flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('json')}
                  className="py-1.5 max-sm:py-3 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-subtle text-secondary hover:text-primary font-semibold text-xs transition-interactive flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
                >
                  {copiedFormat === 'json' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFormat === 'json' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Format 2: CSV */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-subtle space-y-2.5 machined-edge">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-surface-sunken border border-subtle text-secondary">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-primary">CSV spreadsheet (.csv)</h4>
                    <p className="text-[11px] text-muted">RFC 4180, opens in Excel or Sheets</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownload('csv')}
                  className="flex-1 py-1.5 max-sm:py-3 px-3 rounded-lg bg-surface-elevated border border-strong text-primary hover:bg-surface-hover font-semibold text-xs transition-interactive flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('csv')}
                  className="py-1.5 max-sm:py-3 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-subtle text-secondary hover:text-primary font-semibold text-xs transition-interactive flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
                >
                  {copiedFormat === 'csv' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFormat === 'csv' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Format 3: Markdown */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-subtle space-y-2.5 machined-edge">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-surface-sunken border border-subtle text-secondary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-primary">Markdown table (.md)</h4>
                    <p className="text-[11px] text-muted">For Obsidian, GitBook and writeups</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownload('markdown')}
                  className="flex-1 py-1.5 max-sm:py-3 px-3 rounded-lg bg-surface-elevated border border-strong text-primary hover:bg-surface-hover font-semibold text-xs transition-interactive flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('markdown')}
                  className="py-1.5 max-sm:py-3 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-subtle text-secondary hover:text-primary font-semibold text-xs transition-interactive flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
                >
                  {copiedFormat === 'markdown' ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFormat === 'markdown' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-subtle bg-surface-card/60 flex items-center justify-end machined-edge">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-primary text-xs font-semibold transition-colors active:scale-[0.97] cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
