/**
 * syntaxSearchUtils.ts
 * Tactical Tokenized Syntax Search Engine & Bidirectional WikiLinks Graph.
 * Supports port:, os:, diff:, platform:, status:, cert:, track:, tag:, has:, and negation (-).
 * Extracts forward links and backlinks across CTF targets and Obsidian notes.
 * 100% Client-Side, Deterministic, and Offline-First.
 */

import { Machine } from '../types';

export interface ParsedSearchQuery {
  freeTextTokens: string[];
  ports: number[];
  os?: string;
  diff?: string;
  platform?: string;
  status?: string;
  cert?: string;
  track?: string;
  tags: string[];
  hasConditions: ('flags' | 'notes' | 'writeup' | 'ports')[];
  negatedTokens: string[];
  negatedTags: string[];
}

export interface WikiLinkReference {
  raw: string;
  target: string;
  subSection?: string;
  alias?: string;
}

export interface BacklinksGraphResult {
  forwardLinks: Record<string, string[]>;
  backlinks: Record<string, string[]>;
  totalLinksCount: number;
}

/**
 * Parses a raw search query string into structured query tokens and modifiers.
 */
export function parseSyntaxQuery(query: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    freeTextTokens: [],
    ports: [],
    tags: [],
    hasConditions: [],
    negatedTokens: [],
    negatedTags: [],
  };

  if (!query || !query.trim()) return result;

  // Split on whitespace while preserving quoted strings
  const tokenRegex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(query)) !== null) {
    const rawToken = match[0];
    const cleanToken = (match[1] ?? match[2] ?? match[0]).trim();
    if (!cleanToken) continue;

    // Negation handling (e.g. -os:windows, -tag:kernel, -web)
    if (rawToken.startsWith('-') && rawToken.length > 1) {
      const withoutMinus = rawToken.slice(1);
      if (withoutMinus.startsWith('tag:')) {
        result.negatedTags.push(withoutMinus.slice(4).toLowerCase());
      } else {
        result.negatedTokens.push(withoutMinus.toLowerCase());
      }
      continue;
    }

    const lower = cleanToken.toLowerCase();

    if (lower.startsWith('port:')) {
      const p = parseInt(lower.slice(5), 10);
      if (!isNaN(p)) result.ports.push(p);
    } else if (lower.startsWith('os:')) {
      result.os = lower.slice(3);
    } else if (lower.startsWith('diff:')) {
      result.diff = lower.slice(5);
    } else if (lower.startsWith('platform:')) {
      result.platform = lower.slice(9);
    } else if (lower.startsWith('status:')) {
      result.status = lower.slice(7);
    } else if (lower.startsWith('cert:')) {
      result.cert = lower.slice(5);
    } else if (lower.startsWith('track:')) {
      result.track = lower.slice(6);
    } else if (lower.startsWith('tag:')) {
      result.tags.push(lower.slice(4));
    } else if (lower.startsWith('has:')) {
      const cond = lower.slice(4);
      if (['flags', 'notes', 'writeup', 'ports'].includes(cond)) {
        result.hasConditions.push(cond as 'flags' | 'notes' | 'writeup' | 'ports');
      }
    } else {
      result.freeTextTokens.push(cleanToken.toLowerCase());
    }
  }

  return result;
}

/**
 * Evaluates whether a machine satisfies a structured parsed query.
 */
export function matchesSyntaxQuery(machine: Machine, parsed: ParsedSearchQuery): boolean {
  // 1. Port condition
  if (parsed.ports.length > 0) {
    const openPorts = machine.openPorts || [];
    const hasAllPorts = parsed.ports.every((p) => openPorts.includes(p));
    if (!hasAllPorts) return false;
  }

  // 2. OS condition
  if (parsed.os && machine.os.toLowerCase() !== parsed.os) {
    return false;
  }

  // 3. Difficulty condition
  if (parsed.diff && machine.difficulty.toLowerCase() !== parsed.diff) {
    return false;
  }

  // 4. Platform condition
  if (parsed.platform && machine.platform.toLowerCase() !== parsed.platform) {
    return false;
  }

  // 5. Status condition
  if (parsed.status && machine.status.toLowerCase() !== parsed.status) {
    return false;
  }

  // 6. Certification condition
  if (parsed.cert) {
    const certs = (machine.certifications || []).map((c) => c.toLowerCase());
    if (!certs.includes(parsed.cert)) return false;
  }

  // 7. Tags condition
  if (parsed.tags.length > 0) {
    const lowerTags = (machine.tags || []).map((t) => t.toLowerCase());
    const hasAllTags = parsed.tags.every((req) => lowerTags.some((t) => t.includes(req)));
    if (!hasAllTags) return false;
  }

  // 8. Has conditions
  for (const cond of parsed.hasConditions) {
    if (cond === 'flags' && !machine.userFlag && !machine.rootFlag) return false;
    if (cond === 'notes' && !machine.quickNotes) return false;
    if (cond === 'writeup' && !machine.writeupMarkdown && !machine.writeupUrl) return false;
    if (cond === 'ports' && (!machine.openPorts || machine.openPorts.length === 0)) return false;
  }

  // 9. Negated conditions
  const searchableText = `${machine.name} ${machine.tags.join(' ')} ${machine.ip} ${machine.os} ${machine.platform} ${machine.hint || ''}`.toLowerCase();

  for (const neg of parsed.negatedTokens) {
    if (searchableText.includes(neg)) return false;
  }

  if (parsed.negatedTags.length > 0) {
    const lowerTags = (machine.tags || []).map((t) => t.toLowerCase());
    for (const negTag of parsed.negatedTags) {
      if (lowerTags.some((t) => t.includes(negTag))) return false;
    }
  }

  // 10. Free text tokens
  if (parsed.freeTextTokens.length > 0) {
    for (const token of parsed.freeTextTokens) {
      if (!searchableText.includes(token)) return false;
    }
  }

  return true;
}

/**
 * Filter an array of machines using a raw syntax query string.
 */
export function filterMachinesBySyntax(machines: Machine[], queryString: string): Machine[] {
  if (!queryString || !queryString.trim()) return machines;
  const parsed = parseSyntaxQuery(queryString);
  return machines.filter((m) => matchesSyntaxQuery(m, parsed));
}

/**
 * Parses all WikiLinks from a markdown string (e.g. [[Target Name]] or [[Target#Section|Alias]]).
 */
export function extractWikiLinks(markdown: string): WikiLinkReference[] {
  if (!markdown) return [];
  const wikiRegex = /\[\[([^[\]]+)\]\]/g;
  const links: WikiLinkReference[] = [];
  let match: RegExpExecArray | null;

  while ((match = wikiRegex.exec(markdown)) !== null) {
    const rawContent = match[1].trim();
    let target = rawContent;
    let alias: string | undefined;
    let subSection: string | undefined;

    // Check alias e.g. [[Target|Alias]]
    if (target.includes('|')) {
      const parts = target.split('|');
      target = parts[0].trim();
      alias = parts[1].trim();
    }

    // Check subSection e.g. [[Target#Section]]
    if (target.includes('#')) {
      const parts = target.split('#');
      target = parts[0].trim();
      subSection = parts[1].trim();
    }

    if (target) {
      links.push({
        raw: match[0],
        target,
        subSection,
        alias,
      });
    }
  }

  return links;
}

/**
 * Builds a bidirectional backlinks graph across a set of named documents or notes.
 */
export function buildBacklinksGraph(
  documents: { id: string; content: string }[]
): BacklinksGraphResult {
  const forwardLinks: Record<string, string[]> = {};
  const backlinks: Record<string, string[]> = {};
  let totalLinksCount = 0;

  for (const doc of documents) {
    const extracted = extractWikiLinks(doc.content);
    const targets = Array.from(new Set(extracted.map((l) => l.target)));
    forwardLinks[doc.id] = targets;

    for (const target of targets) {
      if (!backlinks[target]) {
        backlinks[target] = [];
      }
      backlinks[target].push(doc.id);
      totalLinksCount++;
    }
  }

  return {
    forwardLinks,
    backlinks,
    totalLinksCount,
  };
}
