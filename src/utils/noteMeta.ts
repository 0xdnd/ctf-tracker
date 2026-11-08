import type { CptsNoteEntry } from './obsidianManualUtils';
import { slugifyHeading } from './workspaceLinkInterceptor';

type TitleFields = Pick<CptsNoteEntry, 'title' | 'titleEn' | 'titleHe'>;

export interface NoteOutlineItem {
  level: number;
  text: string;
  slug: string;
}

/** NFC, drop emoji and joiners, collapse whitespace, trim, lowercase. */
export function normalizeTitle(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isSameTitle(a: string, b: string): boolean {
  return normalizeTitle(a) === normalizeTitle(b);
}

export function noteTitleCandidates(n: Partial<TitleFields>): string[] {
  const out: string[] = [];
  for (const t of [n.title, n.titleEn, n.titleHe]) {
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

const FENCE = /^\s*(```|~~~)/;

/**
 * Index of the line holding the note's title heading, or -1. That is the FIRST `# ` line outside
 * fenced code, and only when its text equals a title of the note. The outline and the reading
 * body both use this, so they hide exactly the same line.
 */
export function getTitleHeadingLine(raw: string, n: Partial<TitleFields>): number {
  return getHeadingLineMatching(raw, noteTitleCandidates(n));
}

/** Same rule as getTitleHeadingLine for an explicit list of accepted titles. */
export function getHeadingLineMatching(raw: string, candidates: readonly string[]): number {
  const lines = raw.split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !lines[i].startsWith('# ')) continue;
    const text = lines[i].slice(2).trim();
    return candidates.some((c) => isSameTitle(c, text)) ? i : -1;
  }
  return -1;
}

export function getNoteOutline(raw: string, n: Partial<TitleFields>): NoteOutlineItem[] {
  const lines = raw.split(/\r?\n/);
  const skip = getTitleHeadingLine(raw, n);
  const out: NoteOutlineItem[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence || i === skip) continue;
    const m = /^(#{1,3})\s+(.+)$/.exec(lines[i]);
    if (!m) continue;
    const text = m[2].trim();
    out.push({ level: m[1].length, text, slug: slugifyHeading(text) });
  }
  return out;
}

export function countWords(raw: string): number {
  return (raw.match(/\S+/g) ?? []).length;
}

/** The first trimmed line of `source` that links to `target` through `[[title` or `[[file name`. */
export function getBacklinkSnippet(source: CptsNoteEntry, target: CptsNoteEntry): string {
  const base = (target.relPath ?? '').split(/[\\/]/).pop()?.replace(/\.(md|markdown)$/i, '') ?? '';
  const needles = [...noteTitleCandidates(target), base].filter(Boolean).map((c) => `[[${c.toLowerCase()}`);
  for (const line of (source.rawMarkdown ?? '').split(/\r?\n/)) {
    const lower = line.toLowerCase();
    if (needles.some((needle) => lower.includes(needle))) return line.trim();
  }
  return '';
}
