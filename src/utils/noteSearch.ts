import type { CptsNoteEntry } from './obsidianManualUtils';

export interface NoteMatch {
  note: CptsNoteEntry;
  score: number;
  field: 'title' | 'path' | 'body';
}

export interface MatchSnippet {
  line: number;
  text: string;
  start: number;
  end: number;
}

const TIER_TITLE = 300;
const TIER_PATH = 200;
const TIER_BODY = 100;
const TITLE_PREFIX_BONUS = 50;
const SNIPPET_MAX_CHARS = 160;
const SNIPPET_LEAD_CHARS = 40;
const ELLIPSIS = '…';

function normalize(s: string): string {
  return s.toLocaleLowerCase();
}

function tokenize(query: string): string[] {
  return normalize(query.trim()).split(/\s+/).filter(Boolean);
}

/** True when `token` is a subsequence of `word` (code-point aware). */
function isInOrderSubsequence(token: string, word: string): boolean {
  const t = Array.from(token);
  const w = Array.from(word);
  let ti = 0;
  for (let wi = 0; wi < w.length && ti < t.length; wi++) {
    if (w[wi] === t[ti]) ti++;
  }
  return ti === t.length;
}

function tokenMatchesWord(token: string, word: string): boolean {
  return word.startsWith(token) || isInOrderSubsequence(token, word);
}

function titleMatches(tokens: string[], note: CptsNoteEntry): boolean {
  const words = [note.title, note.titleEn, note.titleHe ?? '']
    .join(' ')
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);
  return tokens.every((token) => words.some((word) => tokenMatchesWord(token, word)));
}

function pathMatches(tokens: string[], note: CptsNoteEntry): boolean {
  const path = normalize((note.relPath ?? '').replace(/\\/g, '/'));
  return tokens.every((token) => path.includes(token));
}

function bodyMatches(query: string, note: CptsNoteEntry): boolean {
  const body = note.rawMarkdown;
  if (!body) return false;
  return normalize(body).includes(normalize(query.trim()));
}

/**
 * Ranks notes against a query. Tiers: title (fuzzy) > path > body (substring).
 * Within a tier, a title that starts with the query ranks higher, then shorter
 * titles first. Empty queries return no matches (callers show recents).
 */
export function rankNoteMatches(query: string, notes: CptsNoteEntry[], limit = 20): NoteMatch[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const matches: NoteMatch[] = [];
  for (const note of notes) {
    if (titleMatches(tokens, note)) {
      const startsWith = normalize(note.title).startsWith(normalize(query.trim()));
      matches.push({
        note,
        score: TIER_TITLE + (startsWith ? TITLE_PREFIX_BONUS : 0),
        field: 'title',
      });
    } else if (pathMatches(tokens, note)) {
      matches.push({ note, score: TIER_PATH, field: 'path' });
    } else if (bodyMatches(query, note)) {
      matches.push({ note, score: TIER_BODY, field: 'body' });
    }
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.note.title.length - b.note.title.length;
  });

  return matches.slice(0, limit);
}

/** Trims a long line to a window around the match; start/end are offsets in the returned text. */
function snippetFor(line: string, lineNo: number, matchIndex: number, matchLength: number): MatchSnippet {
  if (line.length <= SNIPPET_MAX_CHARS) {
    return { line: lineNo, text: line, start: matchIndex, end: matchIndex + matchLength };
  }

  const left = Math.max(0, matchIndex - SNIPPET_LEAD_CHARS);
  const right = Math.min(line.length, left + SNIPPET_MAX_CHARS);
  const prefix = left > 0 ? ELLIPSIS : '';
  const suffix = right < line.length ? ELLIPSIS : '';
  const text = prefix + line.slice(left, right) + suffix;
  const start = prefix.length + (matchIndex - left);
  return { line: lineNo, text, start, end: start + matchLength };
}

/**
 * Returns up to `max` snippets, one per line that contains the query
 * (case-insensitive substring). Line numbers are 1-based.
 */
export function extractMatchSnippets(markdown: string, query: string, max = 3): MatchSnippet[] {
  const needle = normalize(query.trim());
  if (!needle || !markdown) return [];

  const snippets: MatchSnippet[] = [];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length && snippets.length < max; i++) {
    const line = lines[i];
    const index = normalize(line).indexOf(needle);
    if (index === -1) continue;
    snippets.push(snippetFor(line, i + 1, index, needle.length));
  }
  return snippets;
}
