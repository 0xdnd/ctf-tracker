import cptsNotesData from '../data/cptsNotesIndex.json';
import { Machine } from '../types';
import { classifyMachine } from './categoryUtils';
import { useCtfStore } from '../store/useCtfStore';

export interface ObsidianCallout {
  type: 'abstract' | 'tip' | 'warning' | 'danger' | 'example' | 'note' | 'important' | 'cite' | 'success' | 'info' | 'question';
  title: string;
  content: string;
  isFoldable?: boolean;
  isFoldedByDefault?: boolean;
}

export interface ObsidianTocItem {
  level: number;
  text: string;
  id: string;
  isHebrew: boolean;
}

export interface ObsidianChecklistItem {
  text: string;
  checked: boolean;
  raw: string;
}

export interface ParsedObsidianNote {
  hebrewSection?: string;
  englishSection: string;
  callouts: ObsidianCallout[];
  checklist: ObsidianChecklistItem[];
  tableOfContents: ObsidianTocItem[];
  outgoingWikilinks: string[];
}

export interface CptsNoteEntry {
  id: string;
  title: string;
  titleEn: string;
  titleHe?: string;
  category: string;
  categoryOrder?: number;
  order?: number;
  rawCategory: string;
  subCategory: string;
  tags: string[];
  difficulty: string;
  noteType?: string;
  dateModified?: string;
  summary: string;
  enSummary?: string;
  heSummary?: string;
  stage?: string;
  tools?: string[];
  hasHebrew?: boolean;
  commands: string[];
  relPath: string;
  filename?: string;
  outgoingWikilinks?: string[];
  backlinks?: string[];
  rawMarkdown?: string;
}

interface CptsRawPayload {
  notes?: CptsNoteEntry[];
  wikilinkMap?: Record<string, string>;
}

const rawData = cptsNotesData as unknown as CptsRawPayload | CptsNoteEntry[];
export const CPTS_NOTES: CptsNoteEntry[] = Array.isArray(rawData) ? rawData : (rawData.notes || []);
export const WIKILINK_MAP: Record<string, string> = Array.isArray(rawData) ? {} : (rawData.wikilinkMap || {});

/**
 * Returns active CPTS field manual notes:
 * Prioritizes user's private notes from store/IndexedDB if imported,
 * falls back to static catalog bundle.
 */
export function getAllCptsNotes(): CptsNoteEntry[] {
  if (typeof window !== 'undefined') {
    try {
      const userNotes = useCtfStore.getState()?.userNotes;
      if (userNotes && userNotes.length > 0) {
        return userNotes;
      }
    } catch {}
  }
  return CPTS_NOTES;
}

/**
 * Fast lookup of a note by its unique ID
 */
export function getNoteById(id: string, notes?: CptsNoteEntry[]): CptsNoteEntry | undefined {
  const pool = notes && notes.length > 0 ? notes : getAllCptsNotes();
  return pool.find((n) => n.id === id);
}

/**
 * Resolves an Obsidian wikilink (e.g. "07 Kerberos (88)", "1 Nmap", "ffuf")
 * to the corresponding note in the CPTS Field Manual.
 */
export function resolveWikilink(rawTarget: string, notes?: CptsNoteEntry[]): { targetNoteId?: string; label: string; exists: boolean } {
  if (!rawTarget) return { label: '', exists: false };
  const target = rawTarget.trim();
  const lower = target.toLowerCase();
  const stripped = lower.replace(/^\d+[\s_.-]*/, '').trim();

  // Combine store userWikilinkMap with static WIKILINK_MAP
  let activeMap = WIKILINK_MAP;
  if (typeof window !== 'undefined') {
    try {
      const userMap = useCtfStore.getState()?.userWikilinkMap;
      if (userMap && Object.keys(userMap).length > 0) {
        activeMap = userMap;
      }
    } catch {}
  }

  // 1. Direct check in precomputed wikilinkMap
  if (activeMap[lower]) {
    return { targetNoteId: activeMap[lower], label: target, exists: true };
  }
  if (stripped && activeMap[stripped]) {
    return { targetNoteId: activeMap[stripped], label: target, exists: true };
  }

  // 2. Slug check
  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (activeMap[slug]) {
    return { targetNoteId: activeMap[slug], label: target, exists: true };
  }
  if (activeMap[`cpts-${slug}`]) {
    return { targetNoteId: activeMap[`cpts-${slug}`], label: target, exists: true };
  }

  // 3. Linear search in active notes pool
  const pool = notes && notes.length > 0 ? notes : getAllCptsNotes();
  const found = pool.find(n => 
    (n.filename && n.filename.toLowerCase() === lower) ||
    n.title.toLowerCase() === lower ||
    n.titleEn.toLowerCase() === lower ||
    (n.titleHe && n.titleHe === target) ||
    (n.filename && n.filename.replace(/^\d+[\s_.-]*/, '').toLowerCase() === stripped) ||
    n.id === `cpts-${slug}`
  );

  if (found) {
    return { targetNoteId: found.id, label: target, exists: true };
  }

  return { label: target, exists: false };
}

/**
 * Retrieves all notes that reference the given note ID (backlinks)
 */
export function getBacklinksForNote(noteId: string): CptsNoteEntry[] {
  const current = getNoteById(noteId);
  if (current && current.backlinks && current.backlinks.length > 0) {
    return current.backlinks
      .map(bId => getNoteById(bId))
      .filter((n): n is CptsNoteEntry => Boolean(n));
  }
  return [];
}

/**
 * On-the-fly zero-dependency parser for an authentic Obsidian note
 */
export function parseObsidianNote(rawMarkdown: string): ParsedObsidianNote {
  if (!rawMarkdown) {
    return { englishSection: '', callouts: [], checklist: [], tableOfContents: [], outgoingWikilinks: [] };
  }

  // 1. Extract Hebrew section if present
  let hebrewSection: string | undefined;
  const hebrewUpgradeMatch = rawMarkdown.match(/<!--\s*CPTS-HEBREW-UPGRADE:START\s*-->([\s\S]*?)<!--\s*CPTS-HEBREW-UPGRADE:END\s*-->/);
  if (hebrewUpgradeMatch) {
    hebrewSection = hebrewUpgradeMatch[1].trim();
  } else {
    // Check for "## כרטיס עבודה עברי"
    const hebrewCardMatch = rawMarkdown.match(/(##\s*כרטיס עבודה עברי[\s\S]*?)(?=\n##\s*1|\n##\s*\[|\n---|\n#\s+[^#]|$)/);
    if (hebrewCardMatch) {
      hebrewSection = hebrewCardMatch[1].trim();
    }
  }

  // 2. Extract English / Technical methodology section
  // Strip frontmatter, Hebrew upgrade blocks, and Hebrew card blocks for clean English technical view
  let englishSection = rawMarkdown
    .replace(/^---[\s\S]*?---\n*/, '')
    .replace(/<!--\s*CPTS-HEBREW-UPGRADE:START\s*-->[\s\S]*?<!--\s*CPTS-HEBREW-UPGRADE:END\s*-->\n*/, '')
    .replace(/##\s*כרטיס עבודה עברי[\s\S]*?(?=\n##\s*1|\n##\s*\[|\n---|\n#\s+[^#]|$)/, '')
    .trim();

  // 3. Extract Callouts
  const callouts: ObsidianCallout[] = [];
  const calloutRegex = /^>\s*\[!([a-zA-Z_-]+)\]([+-])?\s*(.*?)$((?:\n>\s*.*)*)/gm;
  let cMatch;
  while ((cMatch = calloutRegex.exec(rawMarkdown)) !== null) {
    const rawType = cMatch[1].toLowerCase();
    const foldChar = cMatch[2];
    const title = cMatch[3].trim();
    const bodyLines = cMatch[4]
      ? cMatch[4].split('\n').map(l => l.replace(/^>\s?/, '')).join('\n').trim()
      : '';

    let type: ObsidianCallout['type'] = 'note';
    if (rawType === 'abstract' || rawType === 'summary' || rawType === 'tldr') type = 'abstract';
    else if (rawType === 'tip' || rawType === 'hint') type = 'tip';
    else if (rawType === 'warning' || rawType === 'caution' || rawType === 'attention') type = 'warning';
    else if (rawType === 'danger' || rawType === 'bug' || rawType === 'failure' || rawType === 'error') type = 'danger';
    else if (rawType === 'example' || rawType === 'meta') type = 'example';
    else if (rawType === 'important') type = 'important';
    else if (rawType === 'cite' || rawType === 'quote') type = 'cite';
    else if (rawType === 'success' || rawType === 'check' || rawType === 'done') type = 'success';
    else if (rawType === 'info') type = 'info';
    else if (rawType === 'question' || rawType === 'help' || rawType === 'faq') type = 'question';

    callouts.push({
      type,
      title: title || type.toUpperCase(),
      content: bodyLines,
      isFoldable: foldChar === '+' || foldChar === '-',
      isFoldedByDefault: foldChar === '-'
    });
  }

  // 4. Extract Checklists
  const checklist: ObsidianChecklistItem[] = [];
  const checkRegex = /^-\s*\[([ xX])\]\s*(.+)$/gm;
  let chkMatch;
  while ((chkMatch = checkRegex.exec(rawMarkdown)) !== null) {
    checklist.push({
      checked: chkMatch[1].toLowerCase() === 'x',
      text: chkMatch[2].trim(),
      raw: chkMatch[0]
    });
  }

  // 5. Extract Table of Contents from headings
  const tableOfContents: ObsidianTocItem[] = [];
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  let hMatch;
  while ((hMatch = headingRegex.exec(rawMarkdown)) !== null) {
    const level = hMatch[1].length;
    const text = hMatch[2].trim().replace(/\{#[^}]+\}/g, '').trim();
    if (text.startsWith('---') || text.startsWith('===')) continue;
    const isHebrew = /[\u0590-\u05FF]/.test(text);
    const id = text.toLowerCase().replace(/[^a-z0-9\u0590-\u05FF]+/g, '-').replace(/^-+|-+$/g, '');
    tableOfContents.push({ level, text, id, isHebrew });
  }

  // 6. Outgoing wikilinks
  const outgoingWikilinks: string[] = [];
  const linkRegex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
  let lMatch;
  const seenLinks = new Set<string>();
  while ((lMatch = linkRegex.exec(rawMarkdown)) !== null) {
    const target = lMatch[1].trim();
    if (target && !seenLinks.has(target)) {
      seenLinks.add(target);
      outgoingWikilinks.push(target);
    }
  }

  return {
    hebrewSection,
    englishSection,
    callouts,
    checklist,
    tableOfContents,
    outgoingWikilinks
  };
}


const CANONICAL_CATEGORY_RANKS: Record<string, number> = {
  'Methodology & Exam Playbooks': 0,
  'Information Gathering & Recon': 1,
  'Pre-Exploitation & Vuln Analysis': 2,
  'Offensive Exploitation': 3,
  'Post-Exploitation & PrivEsc': 4,
  'Lateral Movement & Pivoting': 5,
  'NetExec Arsenal': 6,
  'General Methodology': 7,
};

export interface CptsTreeNode {
  id: string;
  name: string;
  fullPath: string;
  isFolder: boolean;
  children: CptsTreeNode[];
  count: number;
  note?: CptsNoteEntry;
  depth: number;
}

/**
 * Extracts a numeric prefix from a filename or directory name (e.g. "01", "1.2", "02 FTP (21)")
 */
export function extractLeadingNumber(str: string): number | null {
  if (!str) return null;
  const match = str.trim().match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Sorts two tree nodes by number, regardless of whether they are directories or files.
 * Items with numbers sort strictly in ascending numerical order.
 * Items without numbers sort alphabetically after numbered items.
 */
export function compareTreeNodesByNumber(a: CptsTreeNode, b: CptsTreeNode): number {
  const numA = extractLeadingNumber(a.name);
  const numB = extractLeadingNumber(b.name);

  if (numA !== null && numB !== null) {
    if (numA !== numB) return numA - numB;
  } else if (numA !== null) {
    return -1;
  } else if (numB !== null) {
    return 1;
  }

  const comp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  if (comp !== 0) return comp;
  return a.isFolder ? -1 : 1;
}

/**
 * Builds a recursive, multi-level directory tree from note relative paths (relPath).
 * Handles arbitrary nested depths: Category -> Sub-directory -> Sub-sub-directory -> Note.
 * Orders all items (both directories and files) strictly by number at every level.
 */
export function buildCptsFileTree(notes: CptsNoteEntry[] = getAllCptsNotes()): CptsTreeNode[] {
  interface TempFolder {
    name: string;
    fullPath: string;
    folders: Record<string, TempFolder>;
    files: CptsNoteEntry[];
    depth: number;
  }

  const root: TempFolder = {
    name: 'root',
    fullPath: '',
    folders: {},
    files: [],
    depth: 0,
  };

  for (const note of notes) {
    const normalizedPath = (note.relPath || note.title).replace(/\\/g, '/');
    const parts = normalizedPath.split('/').map((p) => p.trim()).filter(Boolean);

    if (parts.length <= 1) {
      root.files.push(note);
      continue;
    }

    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      const folderFullPath = parts.slice(0, i + 1).join('/');
      if (!current.folders[folderName]) {
        current.folders[folderName] = {
          name: folderName,
          fullPath: folderFullPath,
          folders: {},
          files: [],
          depth: i + 1,
        };
      }
      current = current.folders[folderName];
    }
    current.files.push(note);
  }

  function convertTempToNode(temp: TempFolder): CptsTreeNode {
    const childFolders = Object.values(temp.folders).map(convertTempToNode);

    const childFiles: CptsTreeNode[] = temp.files.map((n) => ({
      id: n.id,
      name: n.filename ? n.filename.replace(/\.md$/i, '') : (n.titleEn || n.title || 'Note'),
      fullPath: n.relPath || temp.fullPath,
      isFolder: false,
      children: [],
      count: 1,
      note: n,
      depth: temp.depth + 1,
    }));

    // INTERLEAVED NUMERICAL SORT: order by number no matter if directory or file!
    const children = [...childFolders, ...childFiles].sort(compareTreeNodesByNumber);
    const totalCount = children.reduce((acc, c) => acc + c.count, 0);

    return {
      id: `folder-${temp.fullPath || 'root'}`,
      name: temp.name,
      fullPath: temp.fullPath,
      isFolder: true,
      children,
      count: totalCount,
      depth: temp.depth,
    };
  }

  const convertedRoot = convertTempToNode(root);
  return convertedRoot.children;
}

/**
 * Recursively collect all notes within a tree node and all its nested children
 */
export function getAllNotesInTreeNode(node: CptsTreeNode): CptsNoteEntry[] {
  if (!node.isFolder && node.note) {
    return [node.note];
  }
  const result: CptsNoteEntry[] = [];
  for (const child of node.children) {
    result.push(...getAllNotesInTreeNode(child));
  }
  return result;
}

/**
 * Get aggregated category counts across the field manual notes,
 * sorted in canonical offensive lifecycle order (00 Methodology -> 01 Recon -> ... -> 06 NetExec)
 */
export function getCptsCategories(notes: CptsNoteEntry[] = getAllCptsNotes()): { category: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const n of notes) {
    counts[n.category] = (counts[n.category] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => {
      const orderA = CANONICAL_CATEGORY_RANKS[a.category] ?? 99;
      const orderB = CANONICAL_CATEGORY_RANKS[b.category] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return b.count - a.count;
    });
}

/**
 * Filter notes by primary category
 */
export function getNotesByCategory(category: string, notes: CptsNoteEntry[] = getAllCptsNotes()): CptsNoteEntry[] {
  if (!category || category === 'ALL') return notes;
  return notes.filter((n) => n.category === category);
}

export interface CptsTopicLeaf {
  leaf: string;
  rawSub: string;
  count: number;
}

export interface CptsTopicGroup {
  group: string;
  count: number;
  leaves: CptsTopicLeaf[];
}

export function cleanSubCategorySegment(s: string): string {
  return s.replace(/^\d+[\s_.-]*/, '').replace(/_/g, ' ').trim();
}

export function parseSubCategory(sub?: string): { group: string; leaf: string; full: string } {
  if (!sub) return { group: 'Overview & Index', leaf: 'General Notes', full: '' };
  const parts = sub.split(' / ').map(cleanSubCategorySegment).filter(Boolean);
  const group = parts[0] || 'Overview';
  const leaf = parts.slice(1).join(' > ') || group;
  return { group, leaf, full: sub };
}

/**
 * Get hierarchical topic groups for a category (or across all notes)
 */
export function getCategoryTopicGroups(category: string = 'ALL', notes: CptsNoteEntry[] = getAllCptsNotes()): CptsTopicGroup[] {
  const pool = category === 'ALL' ? notes : notes.filter((n) => n.category === category);
  const groupMap: Record<string, { group: string; count: number; leafMap: Record<string, CptsTopicLeaf> }> = {};

  for (const n of pool) {
    const { group, leaf, full } = parseSubCategory(n.subCategory);
    if (!groupMap[group]) {
      groupMap[group] = { group, count: 0, leafMap: {} };
    }
    groupMap[group].count++;
    if (!groupMap[group].leafMap[leaf]) {
      groupMap[group].leafMap[leaf] = { leaf, rawSub: full, count: 0 };
    }
    groupMap[group].leafMap[leaf].count++;
  }

  return Object.values(groupMap)
    .map((g) => ({
      group: g.group,
      count: g.count,
      leaves: Object.values(g.leafMap).sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Fast search and filter across note titles (EN & HE), subcategories, topic groups, tags, summaries, and commands
 */
export function searchCptsNotes(
  query: string, 
  category: string = 'ALL',
  subCategoryFilter?: string | null,
  notes: CptsNoteEntry[] = getAllCptsNotes()
): CptsNoteEntry[] {
  const q = query.trim().toLowerCase();
  let pool = notes;

  if (category && category !== 'ALL') {
    pool = pool.filter((n) => n.category === category);
  }

  if (subCategoryFilter && subCategoryFilter !== 'ALL') {
    const filterLower = subCategoryFilter.toLowerCase();
    pool = pool.filter((n) => {
      if (!n.subCategory) {
        return filterLower === 'overview & index' || filterLower === 'general notes' || filterLower === '';
      }
      const { group, leaf } = parseSubCategory(n.subCategory);
      return (
        n.subCategory.toLowerCase() === filterLower ||
        group.toLowerCase() === filterLower ||
        leaf.toLowerCase() === filterLower ||
        n.subCategory.toLowerCase().includes(filterLower)
      );
    });
  }

  if (!q) return pool;

  return pool.filter((n) => {
    if (n.title.toLowerCase().includes(q)) return true;
    if (n.titleEn && n.titleEn.toLowerCase().includes(q)) return true;
    if (n.titleHe && n.titleHe.toLowerCase().includes(q)) return true;
    if (n.subCategory.toLowerCase().includes(q)) return true;
    if (n.tags.some((t) => t.toLowerCase().includes(q))) return true;
    if (n.summary.toLowerCase().includes(q)) return true;
    if (n.enSummary && n.enSummary.toLowerCase().includes(q)) return true;
    if (n.heSummary && n.heSummary.toLowerCase().includes(q)) return true;
    if (n.stage && n.stage.toLowerCase().includes(q)) return true;
    if (n.tools && n.tools.some((t) => t.toLowerCase().includes(q))) return true;
    if (n.commands.some((c) => c.toLowerCase().includes(q))) return true;
    if (n.rawMarkdown && n.rawMarkdown.toLowerCase().includes(q)) return true;
    return false;
  });
}

/**
 * Retrieve recommended offensive methodology notes and commands tailored for a specific CTF target
 */
export function getRecommendedNotesForMachine(machine: Machine, limit: number = 6, notes: CptsNoteEntry[] = getAllCptsNotes()): CptsNoteEntry[] {
  const { isAD, categories } = classifyMachine(machine);
  const machineTags = machine.tags.map((t) => t.toLowerCase());

  const scoredNotes = notes.map((note) => {
    let score = 0;
    const noteLowerTags = note.tags.map((t) => t.toLowerCase());
    const noteTitleLower = note.title.toLowerCase();

    // Active Directory match
    if (isAD && (note.category.includes('Active Directory') || note.rawCategory.includes('Active Directory') || noteLowerTags.includes('active-directory') || noteLowerTags.includes('kerberos'))) {
      score += 15;
    }

    // Direct tag overlap
    for (const mt of machineTags) {
      if (noteLowerTags.includes(mt)) score += 8;
      if (noteTitleLower.includes(mt)) score += 10;
    }

    // Vulnerability Archetype Category matching
    for (const cat of categories) {
      const catLower = cat.toLowerCase();
      if (noteLowerTags.some((nt) => nt.includes(catLower)) || noteTitleLower.includes(catLower)) {
        score += 6;
      }
    }

    // OS matching
    if (machine.os === 'Linux' && (note.rawCategory.includes('Linux') || noteLowerTags.includes('linux'))) {
      score += 3;
    } else if (machine.os === 'Windows' && (note.rawCategory.includes('Windows') || noteLowerTags.includes('windows'))) {
      score += 3;
    }

    return { note, score };
  });

  return scoredNotes
    .filter((sn) => sn.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((sn) => sn.note);
}

export type CptsSortOrder = 'topic' | 'number' | 'title';

/**
 * Extracts a hierarchical array of integers for sorting notes by number across all folders.
 * Uses Infinity for unnumbered segments to avoid NaN sort instabilities per Fable Advisor doctrine.
 */
export function extractNoteSortTuple(note: CptsNoteEntry): number[] {
  const rel = note.relPath || '';
  const parts = rel.split('/');
  const nums: number[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    // 1. Check start of segment (e.g. "01 Information Gathering", "02 FTP")
    const matchStart = trimmed.match(/^(\d+)/);
    if (matchStart) {
      nums.push(parseInt(matchStart[1], 10));
      continue;
    }
    // 2. Check anywhere inside segment (e.g. "1 Service Enumeration")
    const matchAny = trimmed.match(/(\d+)/);
    if (matchAny) {
      nums.push(parseInt(matchAny[1], 10));
      continue;
    }
    // Fallback: unnumbered segment gets Infinity to sort predictably at the end of its level
    nums.push(Infinity);
  }

  // Pad to at least 4 depth levels
  while (nums.length < 4) {
    nums.push(0);
  }
  return nums;
}

/**
 * Formats a clean human-readable numerical badge for a note, e.g. "01.01.02" or "00.01"
 */
export function formatNoteNumberBadge(note: CptsNoteEntry): string {
  const tuple = extractNoteSortTuple(note);
  const valid = tuple
    .filter((n) => n !== Infinity)
    .map((n) => (n < 10 ? `0${n}` : String(n)));
  
  return valid.length > 0 ? valid.join('.') : '';
}

/**
 * Sorts notes by their extracted numerical prefix across all categories and directories.
 */
export function sortNotesByNumber(notes: CptsNoteEntry[]): CptsNoteEntry[] {
  return [...notes].sort((a, b) => {
    const tupleA = extractNoteSortTuple(a);
    const tupleB = extractNoteSortTuple(b);

    for (let i = 0; i < Math.max(tupleA.length, tupleB.length); i++) {
      const valA = tupleA[i] !== undefined ? tupleA[i] : 0;
      const valB = tupleB[i] !== undefined ? tupleB[i] : 0;
      if (valA !== valB) {
        return valA - valB;
      }
    }

    const titleA = a.titleEn || a.title || '';
    const titleB = b.titleEn || b.title || '';
    return titleA.localeCompare(titleB);
  });
}
