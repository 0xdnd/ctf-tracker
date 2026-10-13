/** Inline markdown tokenizer: wikilinks, code, bold, links, italic (used with String.split). */
export const INLINE_TOKEN_REGEX =
  /(\[\[[^\]]+\]\]|`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\*[^*\n]+\*|(?<!\w)_[^_\n]+_(?!\w))/g;

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

export type BacklinkKind = 'note' | 'writeup' | 'lab';

export interface BacklinkDoc {
  id: string;
  title: string;
  kind: BacklinkKind;
  text: string;
}

export interface BacklinkRef {
  id: string;
  title: string;
  kind: BacklinkKind;
}

export const normalizeLinkTarget = (raw: string): string => {
  const noAlias = raw.split('|')[0];
  const noHeading = noAlias.split('#')[0];
  return noHeading.trim().toLowerCase();
};

/** Normalized (lowercased, trimmed, alias/heading stripped) wikilink targets, in order, deduped. */
export function extractWikiLinks(text: string): string[] {
  if (!text || !text.includes('[[')) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(WIKILINK_REGEX)) {
    const target = normalizeLinkTarget(m[1]);
    if (target && !seen.has(target)) {
      seen.add(target);
      out.push(target);
    }
  }
  return out;
}

/** Map of normalized target title -> docs linking to it (self-links excluded). */
export function buildBacklinkIndex(docs: BacklinkDoc[]): Map<string, BacklinkRef[]> {
  const index = new Map<string, BacklinkRef[]>();
  for (const doc of docs) {
    const selfTitle = doc.title.trim().toLowerCase();
    for (const target of extractWikiLinks(doc.text)) {
      if (target === selfTitle) continue;
      const list = index.get(target) ?? [];
      list.push({ id: doc.id, title: doc.title, kind: doc.kind });
      index.set(target, list);
    }
  }
  return index;
}
