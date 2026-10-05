import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Plus, Terminal, Code, Sparkles, Folder } from 'lucide-react';
import { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';

const STAGE_OPTIONS: CyberSelectOption[] = [
  { value: '0 — Methodology', label: '0 — Methodology', color: 'rgb(var(--text-tertiary))' },
  { value: '1 — Enumeration', label: '1 — Enumeration', color: 'rgb(var(--cat-1-fg))' },
  { value: '2 — Foothold', label: '2 — Foothold', color: 'rgb(var(--cat-3-fg))' },
  { value: '3 — PrivEsc', label: '3 — PrivEsc', color: 'rgb(var(--cat-5-fg))' },
  { value: '4 — Lateral Movement', label: '4 — Lateral Movement', color: 'rgb(var(--cat-2-fg))' },
  { value: '5 — Active Directory', label: '5 — Active Directory', color: 'rgb(var(--cat-4-fg))' },
];

export interface NewCptsNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<CptsNoteEntry> & { title: string }) => void;
  existingDirectories: string[];
  initialDirectory?: string;
}

export const NewCptsNoteModal: React.FC<NewCptsNoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingDirectories,
  initialDirectory,
}) => {
  const [titleEn, setTitleEn] = useState('');
  const [titleHe, setTitleHe] = useState('');
  const [selectedDir, setSelectedDir] = useState(
    initialDirectory || existingDirectories[0] || '01 Information Gathering/1 Service Enumeration'
  );
  const [customDir, setCustomDir] = useState('');
  const [useCustomDir, setUseCustomDir] = useState(false);
  const [stage, setStage] = useState('1 — Enumeration');
  const [tools, setTools] = useState('');
  const [tags, setTags] = useState('custom, field-manual');
  const [enSummary, setEnSummary] = useState('');
  const [heSummary, setHeSummary] = useState('');
  const [rawCommands, setRawCommands] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');

  // Sync initialDirectory when modal opens
  React.useEffect(() => {
    if (isOpen && initialDirectory) {
      setSelectedDir(initialDirectory);
      setUseCustomDir(false);
    }
  }, [isOpen, initialDirectory]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim()) return;

    const activeDir = useCustomDir ? customDir.trim() || 'General' : selectedDir;
    const dirParts = activeDir.split('/').map((s) => s.trim()).filter(Boolean);
    const category = dirParts[0] || 'General';
    const subCategory = dirParts.slice(1).join(' / ') || '';
    const cleanFileName = `${titleEn.trim().replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    const relPath = `${activeDir}/${cleanFileName}`;

    const commandsList = rawCommands
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && !c.startsWith('#'));

    const parsedTools = tools
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    onSave({
      title: titleEn.trim(),
      titleEn: titleEn.trim(),
      titleHe: titleHe.trim() || undefined,
      category,
      rawCategory: activeDir,
      subCategory,
      relPath,
      filename: cleanFileName,
      stage,
      tools: parsedTools.length > 0 ? parsedTools : undefined,
      tags: parsedTags.length > 0 ? parsedTags : ['custom'],
      summary: enSummary.trim(),
      enSummary: enSummary.trim() || undefined,
      heSummary: heSummary.trim() || undefined,
      hasHebrew: Boolean(titleHe.trim() || heSummary.trim()),
      commands: commandsList,
      rawMarkdown: markdownContent.trim() || enSummary.trim(),
      difficulty: 'Custom',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-subtle bg-surface-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-subtle p-4 bg-surface-sunken">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-muted" />
            <div>
              <h3 className="text-base font-semibold text-primary flex items-center gap-2">
                <span>New field manual note</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary">
                  OBSIDIAN COMPATIBLE
                </span>
              </h3>
              <p className="text-[11px] text-muted">
                Create a new note into any directory depth with commands and bilingual summaries.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded bg-surface-sunken text-muted hover:text-primary border border-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs scrollbar-thin">
          {/* Titles: EN & HE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-secondary font-semibold mb-1 text-[11px]">
                Note Title (English) *
              </label>
              <input
                id="new-cpts-note-title-en"
                name="new-cpts-note-title-en"
                aria-label="Note Title in English"
                type="text"
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Kerberoasting via Rubeus & Impacket"
                className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-secondary font-semibold mb-1 text-[11px]">
                Note Title (Hebrew - אופציונלי)
              </label>
              <input
                id="new-cpts-note-title-he"
                name="new-cpts-note-title-he"
                aria-label="Note Title in Hebrew"
                type="text"
                dir="rtl"
                value={titleHe}
                onChange={(e) => setTitleHe(e.target.value)}
                placeholder="למשל: מתקפת קרברוסטינג ופיצוח טיקטים"
                className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent font-sans transition-colors"
              />
            </div>
          </div>

          {/* Directory & Path Selection */}
          <div className="space-y-1.5 p-3 rounded-lg bg-surface-sunken/70 border border-subtle">
            <div className="flex items-center justify-between">
              <label className="block text-primary font-semibold text-[11px] flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-muted" />
                <span>Target Directory / Sub-folder Depth</span>
              </label>
              <button
                type="button"
                onClick={() => setUseCustomDir(!useCustomDir)}
                className="text-[10px] text-callout-info-fg hover:text-callout-info-fg underline font-semibold"
              >
                {useCustomDir ? '← Choose Existing Directory' : '+ Create New Sub-directory'}
              </button>
            </div>

            {useCustomDir ? (
              <div>
                <input
                  id="new-cpts-note-custom-dir"
                  name="new-cpts-note-custom-dir"
                  aria-label="Custom directory path"
                  type="text"
                  value={customDir}
                  onChange={(e) => setCustomDir(e.target.value)}
                  placeholder="e.g. 03 Offensive Exploitation/01 Linux Exploitation/05 Kernel Exploits"
                  className="w-full bg-surface-card px-3 py-2 rounded-lg border border-subtle text-primary text-xs focus:outline-none focus:border-accent font-mono"
                />
                <span className="text-[10px] text-muted block mt-1">
                  Use slashes (/) to create nested sub-folders and sub-sub-folders.
                </span>
              </div>
            ) : (
              <CyberSelect
                value={selectedDir}
                onChange={setSelectedDir}
                options={existingDirectories.map((dir) => ({
                  value: dir,
                  label: dir,
                  icon: <Folder className="w-3.5 h-3.5 text-muted" />,
                }))}
                searchable
                searchPlaceholder="Search folder paths..."
                variant="card"
                className="w-full"
                triggerClassName="w-full bg-surface-card border-subtle focus:border-accent"
              />
            )}
          </div>

          {/* Attack Stage, Tools, Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-muted font-semibold mb-1 text-[10px]">
                Offensive Stage
              </label>
              <CyberSelect
                value={stage}
                onChange={setStage}
                options={STAGE_OPTIONS}
                variant="default"
                size="xs"
                className="w-full"
                triggerClassName="w-full bg-surface-sunken border-subtle focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-muted font-semibold mb-1 text-[10px]">
                Tools (comma-separated)
              </label>
              <input
                id="new-cpts-note-tools"
                name="new-cpts-note-tools"
                aria-label="Tools used"
                type="text"
                value={tools}
                onChange={(e) => setTools(e.target.value)}
                placeholder="e.g. impacket, mimikatz, hashcat"
                className="w-full bg-surface-sunken px-2.5 py-1.5 rounded-lg border border-subtle text-primary text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-muted font-semibold mb-1 text-[10px]">
                Tags (comma-separated)
              </label>
              <input
                id="new-cpts-note-tags"
                name="new-cpts-note-tags"
                aria-label="Tags and categories"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. kerberos, tgs, offline-crack"
                className="w-full bg-surface-sunken px-2.5 py-1.5 rounded-lg border border-subtle text-primary text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Commands Textarea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-secondary font-semibold text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-muted" />
                <span>Commands & Payloads (One per line)</span>
              </label>
              <span className="text-[10px] text-muted">
                Supports &#x7B;TARGET_IP&#x7D;, &#x7B;LHOST&#x7D;, &#x7B;LPORT&#x7D;
              </span>
            </div>
            <textarea
              id="new-cpts-note-commands"
              name="new-cpts-note-commands"
              aria-label="Commands and Payloads"
              rows={4}
              value={rawCommands}
              onChange={(e) => setRawCommands(e.target.value)}
              placeholder="GetUserSPNs.py {DOMAIN}/{USER}:{PASSWORD} -dc-ip {TARGET_IP} -request&#10;hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt"
              className="w-full bg-surface-inverse text-on-inverse p-3 rounded-lg border border-subtle text-secondary text-xs font-mono focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* Summaries: English & Hebrew */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-muted font-semibold mb-1 text-[10px]">
                Practical Objective (English Summary)
              </label>
              <textarea
                id="new-cpts-note-en-summary"
                name="new-cpts-note-en-summary"
                aria-label="Practical objective English summary"
                rows={2}
                value={enSummary}
                onChange={(e) => setEnSummary(e.target.value)}
                placeholder="Brief explanation of what this technique does and key flags..."
                className="w-full bg-surface-sunken p-2 rounded-lg border border-subtle text-primary text-xs focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-muted font-semibold mb-1 text-[10px]">
                מטרה מעשית (תקציר בעברית)
              </label>
              <textarea
                id="new-cpts-note-he-summary"
                name="new-cpts-note-he-summary"
                aria-label="מטרה מעשית תקציר בעברית"
                rows={2}
                dir="rtl"
                value={heSummary}
                onChange={(e) => setHeSummary(e.target.value)}
                placeholder="הסבר קצר על הטכניקה, אופן השימוש ודגשים מעשיים..."
                className="w-full bg-surface-sunken p-2 rounded-lg border border-subtle text-primary text-xs focus:outline-none focus:border-accent font-sans resize-none"
              />
            </div>
          </div>

          {/* Full Markdown (Optional) */}
          <div>
            <label className="block text-muted font-semibold mb-1 text-[10px]">
              Full Obsidian Markdown Content (Optional)
            </label>
            <textarea
              id="new-cpts-note-markdown"
              name="new-cpts-note-markdown"
              aria-label="Full Obsidian Markdown content"
              rows={3}
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              placeholder="Detailed methodology notes, markdown tables, code walkthroughs, etc."
              className="w-full bg-surface-sunken p-2.5 rounded-lg border border-subtle text-primary text-xs font-mono focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* Actions Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-sunken border border-subtle text-muted hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="px-5 py-2 rounded-lg bg-accent hover:brightness-105 text-on-accent font-semibold transition-[box-shadow,background-color,border-color,color] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Field Note</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
