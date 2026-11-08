import React, { useMemo } from 'react';
import { extractMatchSnippets } from '../../utils/noteSearch';

interface NoteMatchSnippetsProps {
  markdown?: string;
  query: string;
  max?: number;
}

/** Matching lines for a search result row, with the match wrapped in <mark>. */
export const NoteMatchSnippets: React.FC<NoteMatchSnippetsProps> = ({ markdown, query, max = 3 }) => {
  const snippets = useMemo(
    () => (markdown ? extractMatchSnippets(markdown, query, max) : []),
    [markdown, query, max],
  );
  if (snippets.length === 0) return null;

  return (
    <ul data-testid="note-match-snippets" className="mt-1 space-y-0.5 font-normal">
      {snippets.map((s) => (
        <li key={s.line} className="flex gap-2 text-[11px] text-muted font-mono">
          <span className="flex-shrink-0 tabular-nums opacity-70">{s.line}</span>
          <span className="min-w-0 truncate">
            {s.text.slice(0, s.start)}
            <mark className="rounded bg-accent-muted px-0.5 text-primary">{s.text.slice(s.start, s.end)}</mark>
            {s.text.slice(s.end)}
          </span>
        </li>
      ))}
    </ul>
  );
};
