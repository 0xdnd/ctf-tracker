import React from 'react';
import { PanelRightClose } from 'lucide-react';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { getBacklinkSnippet, type NoteOutlineItem } from '../../utils/noteMeta';

export interface NotesRightPanelProps {
  note: CptsNoteEntry | null;
  backlinks: CptsNoteEntry[];
  outline: NoteOutlineItem[];
  onOpenNote: (id: string) => void;
  onSelectHeading: (slug: string) => void;
  onCollapse: () => void;
  /** Width classes of the panel body (the shell's aside clips it to its own width). */
  className?: string;
}

const sectionTitle = 'px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[.06em] text-tertiary';
const emptyText = 'px-3 py-1 text-xs text-muted';
const rowBase =
  'block w-full cursor-pointer rounded-sm text-left transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';

export const NotesRightPanel: React.FC<NotesRightPanelProps> = ({
  note,
  backlinks,
  outline,
  onOpenNote,
  onSelectHeading,
  onCollapse,
  className = 'w-[260px]',
}) => (
  <div className={`flex h-full ${className} flex-col text-[13px]`}>
    <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-subtle px-3">
      <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-tertiary">Details</span>
      <button
        type="button"
        aria-label="Collapse details"
        onClick={onCollapse}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <PanelRightClose className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto pb-4">
      <section data-testid="right-panel-backlinks" aria-label="Backlinks">
        <h2 className={sectionTitle}>Backlinks ({backlinks.length})</h2>
        {backlinks.length === 0 ? (
          <div className={emptyText}>No backlinks yet.</div>
        ) : (
          <div className="px-1">
            {backlinks.map((b) => {
              const snippet = note ? getBacklinkSnippet(b, note) : '';
              return (
                <button key={b.id} type="button" onClick={() => onOpenNote(b.id)} className={`${rowBase} p-2`}>
                  <span className="mb-0.5 block truncate text-primary">{b.titleEn || b.title}</span>
                  {snippet && <span className="line-clamp-2 block text-xs leading-normal text-muted">{snippet}</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>
      <section data-testid="right-panel-outline" aria-label="Outline">
        <h2 className={sectionTitle}>Outline</h2>
        {outline.length === 0 ? (
          <div className={emptyText}>No headings in this note.</div>
        ) : (
          <div className="px-1">
            {outline.map((o, i) => (
              <button
                key={`${i}-${o.slug}`}
                type="button"
                onClick={() => onSelectHeading(o.slug)}
                style={{ paddingLeft: 8 + (Math.max(2, o.level) - 2) * 12 }}
                className={`${rowBase} truncate py-[3px] pr-2 text-muted hover:text-primary`}
              >
                {o.text}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  </div>
);

export default NotesRightPanel;
