import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Server, Link2 } from 'lucide-react';
import type { Machine } from '../../types';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import {
  buildBacklinkIndex,
  normalizeLinkTarget,
  type BacklinkDoc,
  type BacklinkKind,
  type BacklinkRef,
} from '../../utils/backlinks';

const KIND_LABEL: Record<BacklinkKind, string> = {
  note: 'Note',
  writeup: 'Writeup',
  lab: 'Lab notes',
};

const KIND_ICON: Record<BacklinkKind, React.ReactNode> = {
  note: <BookOpen className="w-3 h-3" />,
  writeup: <FileText className="w-3 h-3" />,
  lab: <Server className="w-3 h-3" />,
};

/** In-app route for a backlink entry. */
export const backlinkRoute = (ref: BacklinkRef): string => {
  switch (ref.kind) {
    case 'note':
      return `/field-manual?note=${encodeURIComponent(ref.id)}`;
    case 'writeup':
      return `/writeup/${encodeURIComponent(ref.id)}`;
    default:
      return `/target/${encodeURIComponent(ref.id)}`;
  }
};

/**
 * Searchable text of everything that can hold a wikilink: notes, writeups and lab quick notes.
 * Active HTB machines are skipped (their writeup and notes are never surfaced).
 */
export const buildBacklinkDocs = (
  notes: readonly CptsNoteEntry[],
  machines: readonly Machine[]
): BacklinkDoc[] => {
  const docs: BacklinkDoc[] = [];
  for (const n of notes) {
    docs.push({ id: n.id, title: n.title, kind: 'note', text: n.rawMarkdown ?? n.summary ?? '' });
  }
  for (const m of machines) {
    if (m.isActive) continue;
    if (m.writeupMarkdown) docs.push({ id: m.id, title: m.name, kind: 'writeup', text: m.writeupMarkdown });
    if (m.quickNotes) docs.push({ id: m.id, title: m.name, kind: 'lab', text: m.quickNotes });
  }
  return docs;
};

/** Entries that link to `title`, in index order. */
export const getBacklinks = (docs: BacklinkDoc[], title: string): BacklinkRef[] =>
  buildBacklinkIndex(docs).get(normalizeLinkTarget(title)) ?? [];

interface BacklinksPanelProps {
  backlinks: BacklinkRef[];
  /** Title of the entry being viewed, shown in the empty state. */
  title: string;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ backlinks, title }) => (
  <section
    aria-label="Backlinks"
    data-testid="writeup-backlinks"
    className="rounded-xl border border-subtle bg-surface-card machined-edge-subtle overflow-hidden"
  >
    <div className="flex items-center justify-between border-b border-subtle px-4 py-2.5 bg-surface-sunken text-xs">
      <span className="font-semibold text-primary flex items-center gap-2">
        <Link2 className="w-4 h-4 text-muted" /> Backlinks
      </span>
      <span className="text-[11px] text-muted font-mono tabular-nums">{backlinks.length}</span>
    </div>
    {backlinks.length === 0 ? (
      <p className="px-4 py-3 text-xs text-muted">
        Nothing links to <span className="font-mono">[[{title}]]</span> yet.
      </p>
    ) : (
      <ul>
        {backlinks.map((ref) => (
          <li key={`${ref.kind}:${ref.id}`} className="border-t border-subtle first:border-t-0">
            <Link
              to={backlinkRoute(ref)}
              className="flex items-center justify-between gap-3 px-4 py-2 text-xs text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
            >
              <span className="truncate font-medium">{ref.title}</span>
              <span className="flex items-center gap-1 text-[11px] text-muted flex-shrink-0">
                {KIND_ICON[ref.kind]}
                {KIND_LABEL[ref.kind]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </section>
);
