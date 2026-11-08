import React, { useState, useMemo, useRef, useEffect, useDeferredValue, useCallback } from 'react';
import { BookOpen, Link as LinkIcon, Clock, List, Edit3, Copy, Download, FileCheck2 } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { copyNoteMarkdown, downloadNoteMarkdown, sendNoteToReport } from '../../utils/noteActions';
import { noteTitleCandidates } from '../../utils/noteMeta';
import { CptsNoteEntry, parseObsidianNote, getBacklinksForNote } from '../../utils/obsidianManualUtils';
import { playCyberSound } from '../../utils/helpers';
import { GlobalVariables } from '../../types';
import { OpenNoteOptions } from '../../types/workspace';
import { scrollToHeadingAnchor, slugifyHeading } from '../../utils/workspaceLinkInterceptor';
import { ObsidianViewMode } from '../../store/useNotesWorkspaceStore';
import { useNoteIndex } from '../../hooks/useNoteIndex';
import { MarkdownEditor } from './MarkdownEditor';
import { ObsidianMarkdownBody, getObsidianSizeClasses } from './ObsidianMarkdownBody';

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
  onTagClick?: (tag: string) => void;
  /** Marks the first match of this text in the rendered body and scrolls to it, once per note and query. */
  highlightQuery?: string;
  /**
   * 'dock' (default) keeps the inline outline chips and backlinks footer, for the global notes dock.
   * 'shell' leaves both to the full-screen workspace's right sidebar.
   */
  variant?: 'dock' | 'shell';
  /**
   * Scroll to this heading (an outline click). Acted on once per larger nonce; a request older than this
   * mount counts as handled. An editor-only view switches back to reading first.
   */
  headingRequest?: { slug: string; nonce: number };
}

export const ObsidianTabContent: React.FC<ObsidianTabContentProps> = ({
  note,
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
  onTagClick,
  highlightQuery,
  variant = 'dock',
  headingRequest,
}) => {
  const [langMode, setLangMode] = useState<'en' | 'he'>(defaultLanguage);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync language mode if defaultLanguage changes externally
  useEffect(() => {
    setLangMode(defaultLanguage);
  }, [defaultLanguage]);

  // Real-time live editable content state
  const [liveContent, setLiveContent] = useState<string>(() => note.rawMarkdown || (note as any).content || '');
  const updateNoteContent = useCtfStore((s) => s.updateNoteContent);

  const handleToggleCheckbox = useCallback((lineIndex: number, newChecked: boolean) => {
    const lines = liveContent.split('\n');
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const updatedLine = newChecked
        ? line.replace(/^([-*]\s+\[)[ ](\])/, '$1x$2')
        : line.replace(/^([-*]\s+\[)[xX](\])/, '$1 $2');
      lines[lineIndex] = updatedLine;
      const newText = lines.join('\n');
      setLiveContent(newText);
      Promise.resolve(updateNoteContent(note.id, newText)).catch((e) => console.warn('[ZeroBox] Could not save note', e));
    }
  }, [liveContent, note.id, updateNoteContent]);

  const handleCopyNote = useCallback(() => copyNoteMarkdown(liveContent, soundEnabled), [liveContent, soundEnabled]);

  const handleDownloadNote = useCallback(
    () => downloadNoteMarkdown(note, liveContent, soundEnabled),
    [liveContent, note, soundEnabled],
  );

  const handleOpenWriteupReport = useCallback(
    () => sendNoteToReport(liveContent, soundEnabled, note),
    [liveContent, note, soundEnabled],
  );

  // Defer heavy AST re-parsing in live preview during high-frequency typing
  const deferredContent = useDeferredValue(liveContent);

  // The note's text in the store (it changes on our own saves and when another tab saves the note).
  const storeText: string = note.rawMarkdown || (note as any).content || '';
  const editorOpen = viewMode === 'raw' || viewMode === 'split';
  const syncedNoteIdRef = useRef(note.id);

  // Synchronize live content when switching active notes, and with store changes while no editor is open. An open
  // editor decides itself (via storeContent): pushing the text in here would overwrite its unsaved edits.
  useEffect(() => {
    const switched = syncedNoteIdRef.current !== note.id;
    syncedNoteIdRef.current = note.id;
    if (!switched && editorOpen) return;
    setLiveContent(storeText);
  }, [note.id, storeText, editorOpen]);

  // Real-time on-the-fly markdown parse (updates preview smoothly as user types)
  const parsed = useMemo(() => parseObsidianNote(deferredContent), [deferredContent]);

  // Backlinks referencing this note, from the live index
  const noteIndex = useNoteIndex();
  const backlinks = useMemo(() => getBacklinksForNote(note.id, noteIndex), [note.id, noteIndex]);

  const sizeClasses = useMemo(() => getObsidianSizeClasses(fontSize), [fontSize]);
  const titleCandidates = useMemo(
    () => noteTitleCandidates(note),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note.title, note.titleEn, note.titleHe],
  );

  // Highlight the first match once per (note id, query), after the body has rendered.
  const highlightedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const query = highlightQuery?.trim();
    const root = scrollContainerRef.current;
    if (!query || !root) return;
    const key = `${note.id}::${query}`;
    if (highlightedKeyRef.current === key) return;
    const body = root.querySelector('[data-note-body]');
    if (!body) return;
    highlightedKeyRef.current = key;

    const needle = query.toLowerCase();
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let firstAny: { node: Text; index: number } | null = null;
    let firstPlain: { node: Text; index: number } | null = null;
    for (let n = walker.nextNode(); n && !firstPlain; n = walker.nextNode()) {
      const text = n as Text;
      const index = (text.nodeValue ?? '').toLowerCase().indexOf(needle);
      if (index === -1) continue;
      if (!firstAny) firstAny = { node: text, index };
      if (!text.parentElement?.closest('pre, code')) firstPlain = { node: text, index };
    }
    const hit = firstPlain ?? firstAny;
    if (!hit) return;

    const range = document.createRange();
    range.setStart(hit.node, hit.index);
    range.setEnd(hit.node, hit.index + needle.length);
    // CSS Custom Highlight API: paints the range without touching React-owned DOM.
    if (typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined') {
      CSS.highlights.set('search-hit', new Highlight(range));
    }
    const target = range.startContainer.parentElement;
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center' });
  }, [note.id, highlightQuery, viewMode, parsed]);

  const lastHeadingNonce = useRef(headingRequest?.nonce ?? 0);
  const [pendingHeading, setPendingHeading] = useState<string | null>(null);
  const headingNonce = headingRequest?.nonce;
  const headingSlug = headingRequest?.slug;
  useEffect(() => {
    if (headingNonce === undefined || headingSlug === undefined) return;
    if (headingNonce <= lastHeadingNonce.current) return;
    lastHeadingNonce.current = headingNonce;
    if (viewMode === 'raw') onViewModeChange?.('reading');
    setPendingHeading(headingSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingNonce, headingSlug]);
  // Runs once the rendered body exists (never in raw mode), scoped to this tab's own content.
  useEffect(() => {
    if (!pendingHeading || viewMode === 'raw') return;
    const frame = requestAnimationFrame(() => {
      if (scrollContainerRef.current) scrollToHeadingAnchor(scrollContainerRef.current, pendingHeading);
      setPendingHeading(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingHeading, viewMode]);

  // Clear the highlight when the note or query changes, and on unmount.
  useEffect(() => {
    return () => {
      highlightedKeyRef.current = null;
      if (typeof CSS !== 'undefined' && 'highlights' in CSS) CSS.highlights.delete('search-hit');
    };
  }, [note.id, highlightQuery]);

  const renderFormattedMarkdown = (raw: string) => (
    <ObsidianMarkdownBody
      content={raw}
      globalVars={globalVars}
      soundEnabled={soundEnabled}
      fontSize={fontSize}
      onNavigateToNote={onNavigateToNote}
      onOpenNote={onOpenNote}
      onOpenNotePicker={onOpenNotePicker}
      onToggleCheckbox={handleToggleCheckbox}
      onTagClick={onTagClick}
      hideTitleHeading={variant === 'shell' ? titleCandidates : undefined}
    />
  );

  const renderMarkdownPreview = () => (
    <div className="space-y-6">
      {/* Table of Contents / Outline Chips */}
      {variant === 'dock' && parsed.tableOfContents && parsed.tableOfContents.length > 1 && (
        <div className="sticky top-0 z-20 flex items-center gap-1.5 p-2 px-3 rounded-xl bg-surface-sunken backdrop-blur-md border border-strong overflow-x-auto scrollbar-thin text-xs my-2">
          <div className="flex items-center gap-1 text-[11px] text-accent font-semibold pr-1 border-r border-strong flex-shrink-0">
            <List className="w-3.5 h-3.5 text-accent" />
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
                className="active:scale-[0.97] px-2.5 py-1 rounded bg-surface-hover hover:bg-surface-hover border border-strong text-primary hover:text-on-accent text-xs flex-shrink-0 transition-interactive cursor-pointer"
              >
                {toc.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Render Parsed Markdown Body */}
      <div className="space-y-3" data-note-body>
        {langMode === 'he' && parsed.hebrewSection ? (
          <div dir="rtl" className="font-sans leading-relaxed text-primary">
            {renderFormattedMarkdown(parsed.hebrewSection)}
          </div>
        ) : (
          <div dir="ltr" className="font-sans leading-relaxed text-primary">
            {renderFormattedMarkdown(parsed.englishSection || deferredContent)}
          </div>
        )}
      </div>

      {/* Obsidian Backlinks Footer */}
      {variant === 'dock' && backlinks.length > 0 && (
        <div className="mt-8 pt-4 border-t border-accent/30">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-accent">
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
                className="active:scale-[0.97] p-2 rounded-xl bg-accent-muted hover:bg-accent-muted border border-accent/30 hover:border-accent text-left transition-interactive cursor-pointer group"
              >
                <div className="text-xs font-semibold text-accent group-hover:text-accent truncate">
                  {b.titleEn || b.title}
                </div>
                <div className="text-[10px] text-muted truncate">
                  {b.category} {b.subCategory ? `› ${b.subCategory}` : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const isShell = variant === 'shell';
  const columnWidth = isShell ? (viewMode === 'split' ? 'max-w-[1440px]' : 'max-w-[720px]') : isMaximized ? 'max-w-full px-6 sm:px-12' : 'max-w-6xl';
  const columnPadding = isShell
    ? 'px-4 pb-[100px] pt-6 md:px-6 md:pb-[120px] md:pt-10'
    : 'p-4 sm:p-6 lg:p-8 pb-36';

  return (
    <div
      ref={scrollContainerRef}
      data-tab-content-id={note.id}
      className={`${columnPadding} space-y-6 ${columnWidth} mx-auto w-full select-text transition-colors duration-150 motion-reduce:transition-none`}
    >
      {isShell ? (
        <>
        {/* One title, then a quiet meta line (no card, no actions: they live in the note's menu) */}
        <div>
          <h1
            data-testid="note-title"
            dir={langMode === 'he' ? 'rtl' : 'ltr'}
            className={`mb-3 text-[2.1em] font-bold leading-[1.2] tracking-[-0.01em] text-primary ${
              langMode === 'he' ? 'text-right' : 'text-left'
            }`}
          >
            {langMode === 'he' ? (note.titleHe || note.title) : (note.titleEn || note.title)}
          </h1>
          <div data-testid="note-meta" className="mb-7 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-tertiary">
            {note.tags?.map((t) => {
              const chipClass = 'rounded-sm bg-accent-muted px-2 py-0.5 text-accent';
              return onTagClick ? (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTagClick(t.toLowerCase())}
                  className={`${chipClass} cursor-pointer transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent`}
                >
                  #{t}
                </button>
              ) : (
                <span key={t} className={chipClass}>
                  #{t}
                </span>
              );
            })}
            {note.stage && <span>Stage: {note.stage}</span>}
            {note.difficulty && <span>{note.difficulty}</span>}
            {note.noteType && <span>{note.noteType}</span>}
            {note.dateModified && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {note.dateModified}
              </span>
            )}
            {note.tools?.map((tool) => (
              <span key={tool} className="rounded-sm bg-surface-sunken px-2 py-0.5 font-mono text-secondary">
                {tool}
              </span>
            ))}
          </div>
        </div>

        </>
      ) : (
        <>
        {/* Title & Metadata Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-accent/20 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1
              className={`${sizeClasses.bannerTitle} font-semibold text-primary tracking-tight flex items-center gap-2 ${
                langMode === 'he' ? 'font-sans text-right' : 'font-sans text-left'
              }`}
              dir={langMode === 'he' ? 'rtl' : 'ltr'}
            >
              <span className="text-accent flex-shrink-0">🛡️</span>
              <span>{langMode === 'he' ? (note.titleHe || note.title) : (note.titleEn || note.title)}</span>
            </h1>

            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              {note.stage && (
                <span className="px-2 py-0.5 rounded font-semibold bg-surface-sunken text-accent border border-accent/30">
                  Stage: {note.stage}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-accent-muted text-accent border border-accent/30">
                {note.difficulty || 'Core'}
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-sunken border border-subtle text-muted">
                {note.noteType || 'Field Manual'}
              </span>
              {note.dateModified && (
                <span className="px-2 py-0.5 rounded text-muted bg-surface-sunken border border-subtle flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {note.dateModified}
                </span>
              )}
              <button
                type="button"
                onClick={handleCopyNote}
                className="active:scale-[0.97] px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-sunken hover:bg-surface-hover text-secondary hover:text-primary border border-subtle transition-interactive flex items-center gap-1 cursor-pointer"
                title="Copy entire note markdown"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadNote}
                className="active:scale-[0.97] px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-sunken hover:bg-surface-hover text-secondary hover:text-primary border border-subtle transition-interactive flex items-center gap-1 cursor-pointer"
                title="Download note as .md"
              >
                <Download className="w-2.5 h-2.5" />
                <span>.md</span>
              </button>
              <button
                type="button"
                onClick={handleOpenWriteupReport}
                data-testid="export-writeup-report-btn"
                aria-label="Generate full writeup report"
                className="active:scale-[0.97] px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-sunken hover:bg-surface-hover text-callout-success-fg border border-callout-success-border transition-interactive flex items-center gap-1 cursor-pointer"
                title="Sync note to engaged target & open full Pentest Writeup Report"
              >
                <FileCheck2 className="w-2.5 h-2.5" />
                <span>Report</span>
              </button>
              {onViewModeChange && viewMode === 'reading' && (
                <button
                  type="button"
                  onClick={() => {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                    onViewModeChange(isMobile ? 'raw' : 'split');
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="active:scale-[0.97] px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-muted hover:bg-accent-muted text-accent border border-accent/40 hover:border-accent transition-interactive flex items-center gap-1 cursor-pointer"
                  title="Switch to Edit View"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>Edit Note</span>
                </button>
              )}
            </div>
          </div>

          {/* Tags & Tools */}
          {(note.tags?.length || note.tools?.length) && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-accent/20 flex-wrap">
              {note.tags && note.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {note.tags.map((t) => {
                    const chipClass = 'text-[10px] px-2 py-0.5 rounded bg-accent-muted border border-accent/40 text-accent';
                    return onTagClick ? (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onTagClick(t.toLowerCase())}
                        className={`${chipClass} cursor-pointer hover:bg-accent/20 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none`}
                      >
                        #{t}
                      </button>
                    ) : (
                      <span key={t} className={chipClass}>
                        #{t}
                      </span>
                    );
                  })}
                </div>
              )}
              {note.tools && note.tools.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted">Tools:</span>
                  {note.tools.map((tool) => (
                    <span
                      key={tool}
                      className="text-[10px] px-2 py-0.5 rounded bg-callout-success-bg text-callout-success-fg border border-callout-success-fg/30 font-mono font-semibold"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        </>
      )}

      {/* Raw Markdown Mode: Full Interactive In-App Editor */}
      {viewMode === 'raw' && (
        <MarkdownEditor
          noteId={note.id}
          initialContent={liveContent}
          storeContent={storeText}
          onContentChange={setLiveContent}
          globalVars={globalVars}
          soundEnabled={soundEnabled}
          minHeight={typeof window !== 'undefined' && window.innerWidth < 768 ? '300px' : '550px'}
        />
      )}

      {/* Split Mode: Side-by-Side In-App Editor on Left, Live Preview on Right */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="min-w-0">
            <MarkdownEditor
              noteId={note.id}
              initialContent={liveContent}
              storeContent={storeText}
              onContentChange={setLiveContent}
              globalVars={globalVars}
              soundEnabled={soundEnabled}
              isSplitView={true}
              minHeight={typeof window !== 'undefined' && window.innerWidth < 768 ? '260px' : '600px'}
            />
          </div>
          <div className="min-w-0 rounded-xl border border-strong bg-surface-card p-4 sm:p-5 overflow-y-auto max-h-[850px] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-subtle text-xs text-muted">
              <span className="font-semibold flex items-center gap-1.5 text-accent">
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
