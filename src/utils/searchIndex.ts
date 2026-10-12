/**
 * Pure, dependency-free full-text index for the command palette.
 *
 * Secret safety: documents are built from an explicit whitelist of fields. Credential secrets, hashes,
 * flag values, loot values/notes, machine flags and AI keys are never read, so they cannot be matched
 * or displayed. Do not add fields here without checking they are not secret-bearing.
 */
import type { CptsNoteEntry } from './obsidianManualUtils';
import type { Credential, LootItem, Machine } from '../types';

export type SearchSection = 'notes' | 'writeups' | 'vault';

export type SearchRef =
  | { kind: 'note'; id: string }
  | { kind: 'machine-note'; id: string }
  | { kind: 'writeup'; id: string }
  | { kind: 'loot'; id: string }
  | { kind: 'credential'; id: string };

export interface SearchDoc {
  id: string;
  section: SearchSection;
  /** Display title. */
  title: string;
  /** Lowercased title used for matching. */
  titleNorm: string;
  /** When false the title is display-only (machine-derived docs match on body only). */
  titleSearchable: boolean;
  /** Display body (markdown stripped, whitespace collapsed). */
  body: string;
  /** Lowercased body used for matching; same length as `body`. */
  bodyNorm: string;
  ref: SearchRef;
}

export interface SearchIndex {
  docs: SearchDoc[];
}

export type Range = [start: number, end: number];

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  snippet: string;
  /** Highlight ranges inside `snippet`. */
  snippetRanges: Range[];
  /** Highlight ranges inside `doc.title`. */
  titleRanges: Range[];
}

export interface SearchInput {
  machines?: readonly Pick<Machine, 'id' | 'name' | 'quickNotes' | 'writeupMarkdown'>[];
  customNotes?: readonly CptsNoteEntry[];
  userNotes?: readonly CptsNoteEntry[];
  lootItems?: readonly Pick<LootItem, 'id' | 'title' | 'category'>[];
  credentials?: readonly Pick<Credential, 'id' | 'type' | 'username' | 'domain'>[];
}

/** Strips markdown syntax and collapses whitespace. Code content is kept, fences/markers are dropped. */
export function stripMarkdown(src: string): string {
  if (!src) return '';
  return src
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ' ') // frontmatter
    .replace(/```[^\n]*\n?/g, ' ') // fence lines
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
    .replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, a: string, b: string) => b || a) // wikilinks
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links
    .replace(/<[^>\n]+>/g, ' ') // html tags
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/gm, '') // list markers
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ') // rules
    .replace(/\|/g, ' ') // table pipes
    .replace(/(\*\*|__|~~|\*|`)/g, '') // emphasis / inline code
    .replace(/\s+/g, ' ')
    .trim();
}

function makeDoc(
  id: string,
  section: SearchSection,
  title: string,
  rawBody: string,
  ref: SearchRef,
  titleSearchable = true
): SearchDoc {
  const stripped = stripMarkdown(rawBody);
  const lower = stripped.toLowerCase();
  // toLowerCase can change length for exotic characters; fall back so ranges always line up.
  const body = lower.length === stripped.length ? stripped : lower;
  return {
    id,
    section,
    title,
    titleNorm: title.toLowerCase(),
    titleSearchable,
    body,
    bodyNorm: lower,
    ref,
  };
}

function noteBody(n: CptsNoteEntry): string {
  return [n.summary, n.enSummary, n.rawMarkdown].filter(Boolean).join(' ');
}

export function buildSearchIndex(input: SearchInput): SearchIndex {
  const docs: SearchDoc[] = [];
  const seen = new Set<string>();

  const addNotes = (list: readonly CptsNoteEntry[] | undefined) => {
    if (!list) return;
    for (const n of list) {
      if (!n || seen.has(n.id)) continue;
      seen.add(n.id);
      docs.push(makeDoc(`note-${n.id}`, 'notes', n.titleEn || n.title, noteBody(n), { kind: 'note', id: n.id }));
    }
  };
  // Order matters for dedupe: authored notes shadow imported notes with the same id.
  addNotes(input.customNotes);
  addNotes(input.userNotes);

  for (const m of input.machines ?? []) {
    if (m.quickNotes?.trim()) {
      docs.push(makeDoc(`mnote-${m.id}`, 'notes', m.name, m.quickNotes, { kind: 'machine-note', id: m.id }, false));
    }
    if (m.writeupMarkdown?.trim()) {
      docs.push(makeDoc(`writeup-${m.id}`, 'writeups', m.name, m.writeupMarkdown, { kind: 'writeup', id: m.id }, false));
    }
  }

  // Vault: titles and types only. Never value, secret, notes, hash material.
  for (const l of input.lootItems ?? []) {
    docs.push(makeDoc(`loot-${l.id}`, 'vault', l.title, l.category, { kind: 'loot', id: l.id }));
  }
  for (const c of input.credentials ?? []) {
    const title = c.domain ? `${c.domain}\\${c.username}` : c.username;
    docs.push(makeDoc(`cred-${c.id}`, 'vault', title, `credential ${c.type}`, { kind: 'credential', id: c.id }));
  }

  return { docs };
}

let lastKey: unknown[] | null = null;
let lastIndex: SearchIndex | null = null;

/** Memoized on the identity of every input array, so unchanged state never rebuilds. */
export function getSearchIndex(input: SearchInput): SearchIndex {
  const key = [input.machines, input.customNotes, input.userNotes, input.lootItems, input.credentials];
  if (lastIndex && lastKey && key.every((k, i) => k === lastKey![i])) return lastIndex;
  lastIndex = buildSearchIndex(input);
  lastKey = key;
  return lastIndex;
}

function tokenize(query: string): string[] {
  return Array.from(new Set(query.toLowerCase().split(/\s+/).filter(Boolean)));
}

function findRanges(haystack: string, tokens: string[], limit = 8): Range[] {
  const ranges: Range[] = [];
  for (const t of tokens) {
    let from = 0;
    while (ranges.length < limit * tokens.length) {
      const at = haystack.indexOf(t, from);
      if (at < 0) break;
      ranges.push([at, at + t.length]);
      from = at + t.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

const SNIPPET_BEFORE = 36;
const SNIPPET_LENGTH = 120;

function buildSnippet(doc: SearchDoc, tokens: string[]): { snippet: string; ranges: Range[] } {
  let anchor = -1;
  for (const t of tokens) {
    const at = doc.bodyNorm.indexOf(t);
    if (at >= 0 && (anchor < 0 || at < anchor)) anchor = at;
  }
  if (anchor < 0) {
    return { snippet: doc.body.slice(0, SNIPPET_LENGTH), ranges: [] };
  }
  let start = Math.max(0, anchor - SNIPPET_BEFORE);
  if (start > 0) {
    const space = doc.body.indexOf(' ', start);
    if (space >= 0 && space < anchor) start = space + 1;
  }
  const end = Math.min(doc.body.length, start + SNIPPET_LENGTH);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < doc.body.length ? '…' : '';
  const text = doc.body.slice(start, end);
  const ranges = findRanges(doc.bodyNorm.slice(start, end), tokens).map(
    ([a, b]) => [a + prefix.length, b + prefix.length] as Range
  );
  return { snippet: prefix + text + suffix, ranges };
}

/**
 * Ranks docs: exact title (100) > title prefix (80) > title substring (60) > body only (30).
 * Every whitespace-separated token must match the title or body. Ties keep index order.
 */
export function searchDocs(index: SearchIndex, query: string, limitPerSection = 6): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const whole = tokens.join(' ');
  const hits: SearchHit[] = [];

  for (const doc of index.docs) {
    let allMatch = true;
    let inTitle = 0;
    for (const t of tokens) {
      const titleHit = doc.titleSearchable && doc.titleNorm.includes(t);
      if (titleHit) inTitle++;
      else if (!doc.bodyNorm.includes(t)) {
        allMatch = false;
        break;
      }
    }
    if (!allMatch) continue;

    let score = 30;
    if (doc.titleSearchable && inTitle === tokens.length) {
      if (doc.titleNorm === whole) score = 100;
      else if (doc.titleNorm.startsWith(whole)) score = 80;
      else score = 60;
    } else if (inTitle > 0) {
      score = 40;
    }

    const { snippet, ranges } = buildSnippet(doc, tokens);
    hits.push({
      doc,
      score,
      snippet,
      snippetRanges: ranges,
      titleRanges:
        doc.titleSearchable && doc.title.length === doc.titleNorm.length ? findRanges(doc.titleNorm, tokens) : [],
    });
  }

  hits.sort((a, b) => b.score - a.score); // Array.prototype.sort is stable
  const counts: Record<string, number> = {};
  return hits.filter((h) => {
    const n = (counts[h.doc.section] = (counts[h.doc.section] ?? 0) + 1);
    return n <= limitPerSection;
  });
}
