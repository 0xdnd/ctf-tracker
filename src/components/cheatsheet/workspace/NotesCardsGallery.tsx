import React from 'react';
import { CptsNoteEntry, formatNoteNumberBadge } from '../../../utils/obsidianManualUtils';
import { NoteMatchSnippets } from '../NoteMatchSnippets';
import type { ObsidianNavView } from './types';

interface NotesCardsGalleryProps {
  visibleCptsNotes: CptsNoteEntry[];
  openFromResults: (note: CptsNoteEntry, query?: string) => void;
  setObsidianNavView: (view: ObsidianNavView) => void;
  isNarrow: boolean;
  closeDrawers: () => void;
  deferredSearchQuery: string;
}

export const NotesCardsGallery: React.FC<NotesCardsGalleryProps> = ({
  visibleCptsNotes,
  openFromResults,
  setObsidianNavView,
  isNarrow,
  closeDrawers,
  deferredSearchQuery,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {visibleCptsNotes.map((note) => (
        <div
          key={note.id}
          id={`cpts-note-${note.id}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
            e.preventDefault();
            openFromResults(note);
            setObsidianNavView('files');
            if (isNarrow) closeDrawers();
          }}
          onClick={() => {
            openFromResults(note);
            setObsidianNavView('files');
            if (isNarrow) closeDrawers();
          }}
          className="p-4 rounded-xl border border-subtle bg-surface-card hover:border-accent transition-colors cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm text-primary group-hover:text-accent transition-colors">
                {note.titleEn || note.title}
              </h4>
              {formatNoteNumberBadge(note) && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken text-muted border border-subtle flex-shrink-0">
                  #{formatNoteNumberBadge(note)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted line-clamp-2">
              {note.summary || 'Playbook documentation and operational commands.'}
            </p>
            <NoteMatchSnippets markdown={note.rawMarkdown} query={deferredSearchQuery} />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-subtle/50 text-[11px]">
            <span className="text-muted">
              📁 {note.subCategory || note.category.split(' ')[0]}
            </span>
            <div className="flex items-center gap-2">
              {note.commands && note.commands.length > 0 && (
                <span className="font-mono text-accent">
                  {note.commands.length} cmds
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold group-hover:bg-accent group-hover:text-on-accent transition-colors">
                Read ›
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
