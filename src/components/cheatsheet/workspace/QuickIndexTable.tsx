import React from 'react';
import { Sparkles } from 'lucide-react';
import { CptsNoteEntry, formatNoteNumberBadge } from '../../../utils/obsidianManualUtils';
import { displayNoteMeta } from '../../../utils/noteMeta';
import { NoteMatchSnippets } from '../NoteMatchSnippets';
import type { ObsidianNavView } from './types';

interface QuickIndexTableProps {
  visibleCptsNotes: CptsNoteEntry[];
  openFromResults: (note: CptsNoteEntry, query?: string) => void;
  setObsidianNavView: (view: ObsidianNavView) => void;
  isNarrow: boolean;
  closeDrawers: () => void;
  deferredSearchQuery: string;
}

export const QuickIndexTable: React.FC<QuickIndexTableProps> = ({
  visibleCptsNotes,
  openFromResults,
  setObsidianNavView,
  isNarrow,
  closeDrawers,
  deferredSearchQuery,
}) => {
  return (
    <div className="rounded-xl border border-subtle bg-surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-sunken/95 border-b border-subtle text-muted text-[10px] sticky top-0 z-10 backdrop-blur">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">#</th>
              <th className="py-2.5 px-3 w-48">Topic / folder</th>
              <th className="py-2.5 px-3">Title / objective</th>
              <th className="py-2.5 px-3 w-28 text-center">Stage / level</th>
              <th className="py-2.5 px-3 w-32 text-center">Commands</th>
              <th className="py-2.5 px-3 w-28 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle/40">
            {visibleCptsNotes.map((note, index) => {
              return (
                <tr 
                  key={note.id}
                  id={`cpts-note-${note.id}`}
                  onClick={() => {
                    openFromResults(note);
                    setObsidianNavView('files');
                    if (isNarrow) closeDrawers();
                  }}
                  className="hover:bg-accent-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="py-2 px-3 text-center font-mono text-[11px] text-muted">
                    {formatNoteNumberBadge(note) || String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="py-2 px-3 text-muted text-[11px] truncate max-w-48">
                    {note.subCategory || note.category}
                  </td>
                  <td className="py-2 px-3 font-medium text-primary group-hover:text-accent">
                    {note.titleEn || note.title}
                    <NoteMatchSnippets markdown={note.rawMarkdown} query={deferredSearchQuery} />
                  </td>
                  <td className="py-2 px-3 text-center">
                    {displayNoteMeta(note, 'stage') && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-muted">
                        {note.stage}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-[11px] text-accent">
                    {note.commands?.length || 0}
                  </td>
                  <td className="py-2 px-3 text-right pr-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFromResults(note);
                        setObsidianNavView('files');
                        if (isNarrow) closeDrawers();
                      }}
                      className="px-2.5 py-1 rounded bg-accent text-on-accent text-[11px] font-semibold hover:bg-accent-hover transition-colors"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface NotesLoadMoreProps {
  visibleCount: number;
  totalCount: number;
  setCptsLimit: React.Dispatch<React.SetStateAction<number>>;
}

export const NotesLoadMore: React.FC<NotesLoadMoreProps> = ({ visibleCount, totalCount, setCptsLimit }) => {
  if (visibleCount >= totalCount) return null;
  return (
  <div className="p-4 rounded-xl border border-subtle bg-surface-card flex flex-wrap items-center justify-center gap-3">
    <button
      type="button"
      onClick={() => setCptsLimit((prev) => prev + 30)}
      className="px-5 py-2 rounded-lg bg-accent/20 border border-accent/50 hover:bg-accent-hover hover:text-on-accent text-accent font-semibold text-xs transition-colors flex items-center gap-2"
    >
      <Sparkles className="w-3.5 h-3.5" />
      <span>Load next 30 notes ({totalCount - visibleCount} remaining)</span>
    </button>
    <button
      type="button"
      onClick={() => setCptsLimit(totalCount)}
      className="px-4 py-2 rounded-lg bg-surface-sunken border border-subtle text-muted hover:text-primary text-xs font-semibold transition-colors"
    >
      Show all ({totalCount})
    </button>
  </div>
  );
};
