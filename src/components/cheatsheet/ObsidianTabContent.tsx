import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { BookOpen, Link as LinkIcon, Clock, List, Edit3 } from 'lucide-react';
import { CptsNoteEntry, parseObsidianNote, getBacklinksForNote } from '../../utils/obsidianManualUtils';
import { playCyberSound } from '../../utils/helpers';
import { GlobalVariables } from '../../types';
import { OpenNoteOptions } from '../../types/workspace';
import { slugifyHeading } from '../../utils/workspaceLinkInterceptor';
import { ObsidianViewMode } from '../../store/useNotesWorkspaceStore';
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
}) => {
  const [langMode, setLangMode] = useState<'en' | 'he'>(defaultLanguage);
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

  const sizeClasses = useMemo(() => getObsidianSizeClasses(fontSize), [fontSize]);

  const renderFormattedMarkdown = (raw: string) => (
    <ObsidianMarkdownBody
      content={raw}
      globalVars={globalVars}
      soundEnabled={soundEnabled}
      fontSize={fontSize}
      onNavigateToNote={onNavigateToNote}
      onOpenNote={onOpenNote}
      onOpenNotePicker={onOpenNotePicker}
    />
  );

  const renderMarkdownPreview = () => (
    <div className="space-y-6">
      {/* Table of Contents / Outline Chips */}
      {parsed.tableOfContents && parsed.tableOfContents.length > 1 && (
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
      <div className="space-y-3">
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
      {backlinks.length > 0 && (
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

  return (
    <div
      ref={scrollContainerRef}
      data-tab-content-id={note.id}
      className={`p-4 sm:p-6 lg:p-8 pb-36 space-y-6 ${isMaximized ? 'max-w-full px-6 sm:px-12' : 'max-w-6xl'} mx-auto w-full select-text transition-colors duration-150`}
    >
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
                {note.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded bg-accent-muted border border-accent/40 text-accent"
                  >
                    #{t}
                  </span>
                ))}
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

      {/* Raw Markdown Mode: Full Interactive In-App Editor */}
      {viewMode === 'raw' && (
        <MarkdownEditor
          noteId={note.id}
          initialContent={liveContent}
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
