import type { CptsNoteEntry } from './obsidianManualUtils';

export interface NoteIndex {
  byId: Map<string, CptsNoteEntry>;
  /** normalized key -> note id */
  titleLookup: Map<string, string>;
  /** note id -> resolved target ids (unique, no self) */
  outgoing: Map<string, string[]>;
  /** note id -> source ids (sorted by source title) */
  backlinks: Map<string, string[]>;
  /** lowercased tag (nested "a/b" kept) -> note ids */
  tags: Map<string, string[]>;
}

/** Inline tag: `#tag` preceded by start or whitespace, must begin with a letter. */
export const INLINE_TAG_RE = /(?:^|\s)#([\p{L}][\p{L}\p{N}_/-]*)/gu;
const LINK_RE = /\[\[([^\]\n]+?)\]\]/g;
const NUMERIC_PREFIX_RE = /^0*(\d+)[\s_.-]+(.*)$/;

export function normalizeNoteKey(s: string): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripCode(markdown: string): string {
  return markdown
    .replace(/(```|~~~)[\s\S]*?(?:\1|$)/g, ' ')
    // Non-whitespace placeholder: a `#` glued to inline code is not tag-initial.
    .replace(/`[^`\n]*`/g, '\u0001');
}

export function extractInlineTags(markdown: string): string[] {
  const out = new Set<string>();
  const text = stripCode(markdown || '');
  for (const m of text.matchAll(INLINE_TAG_RE)) {
    out.add(m[1].toLowerCase());
  }
  return [...out];
}

export function extractLinkTargets(markdown: string): string[] {
  const out: string[] = [];
  const text = stripCode(markdown || '');
  for (const m of text.matchAll(LINK_RE)) {
    const target = m[1].split('|')[0].split('#')[0].trim();
    if (target) out.push(target);
  }
  return out;
}

function prefixStripped(key: string): string | undefined {
  const m = NUMERIC_PREFIX_RE.exec(key);
  const rest = m ? normalizeNoteKey(m[2]) : '';
  return rest || undefined;
}

export function resolveExact(target: string, lookup: Map<string, string>): string | undefined {
  const key = normalizeNoteKey(target);
  if (!key) return undefined;
  const direct = lookup.get(key);
  if (direct) return direct;
  const rest = prefixStripped(key);
  return rest ? lookup.get(rest) : undefined;
}

function noteKeys(n: CptsNoteEntry): string[] {
  const raw: (string | undefined)[] = [n.title, n.titleEn, n.titleHe, n.filename, n.relPath];
  if (n.relPath) raw.push(n.relPath.split('/').pop());
  const keys = new Set<string>();
  for (const r of raw) {
    if (!r) continue;
    const k = normalizeNoteKey(r.replace(/\\/g, '/'));
    if (!k) continue;
    keys.add(k);
    const rest = prefixStripped(k);
    if (rest) keys.add(rest);
  }
  return [...keys];
}

export function buildNoteIndex(notes: CptsNoteEntry[]): NoteIndex {
  const byId = new Map<string, CptsNoteEntry>();
  for (const n of notes) byId.set(n.id, n);

  // Ascending id order; first writer wins, so duplicates resolve to the lowest id.
  const titleLookup = new Map<string, string>();
  const sorted = [...notes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const n of sorted) {
    for (const k of noteKeys(n)) {
      if (!titleLookup.has(k)) titleLookup.set(k, n.id);
    }
  }

  const outgoing = new Map<string, string[]>();
  const backlinkSets = new Map<string, Set<string>>();
  const tagSets = new Map<string, Set<string>>();

  for (const n of notes) {
    const md = n.rawMarkdown ?? '';

    const targets = new Set<string>();
    for (const raw of extractLinkTargets(md)) {
      const id = resolveExact(raw, titleLookup);
      if (id && id !== n.id) targets.add(id);
    }
    outgoing.set(n.id, [...targets]);
    for (const t of targets) {
      let set = backlinkSets.get(t);
      if (!set) backlinkSets.set(t, (set = new Set()));
      set.add(n.id);
    }

    const noteTags = new Set<string>();
    for (const t of n.tags ?? []) {
      const k = t.trim().replace(/^#/, '').toLowerCase();
      if (k) noteTags.add(k);
    }
    for (const t of extractInlineTags(md)) noteTags.add(t);
    for (const t of noteTags) {
      let set = tagSets.get(t);
      if (!set) tagSets.set(t, (set = new Set()));
      set.add(n.id);
    }
  }

  const backlinks = new Map<string, string[]>();
  for (const [id, set] of backlinkSets) {
    backlinks.set(
      id,
      [...set].sort((a, b) =>
        (byId.get(a)?.title ?? '').localeCompare(byId.get(b)?.title ?? '') || (a < b ? -1 : 1),
      ),
    );
  }

  const tags = new Map<string, string[]>();
  for (const [t, set] of tagSets) tags.set(t, [...set]);

  return { byId, titleLookup, outgoing, backlinks, tags };
}
