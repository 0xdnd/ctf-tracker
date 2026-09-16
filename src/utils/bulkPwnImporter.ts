import { Machine, PipelineStatus, Platform } from '../types';

export interface BulkPwnMatch {
  rawInput: string;
  machineId: string;
  machineName: string;
  platform: Platform;
  difficulty: string;
  currentStatus: PipelineStatus;
  confidence: number;
}

export interface BulkPwnParseResult {
  allMatches: BulkPwnMatch[];
  newSolves: BulkPwnMatch[];
  alreadySolved: BulkPwnMatch[];
  unmatched: string[];
  totalInputTokens: number;
}

/**
 * Normalizes a machine name for high-accuracy fuzzy matching.
 * e.g. "HTB - Pickle Rick (Retired)" -> "picklerick"
 */
export function normalizeTargetName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(\[?(htb|thm|hackthebox|tryhackme)\]?[\s\-_:]*)/i, '')
    .replace(/\s*\(retired\)/i, '')
    .replace(/\s*\(active\)/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Parses raw user input (CSV, JSON, line-separated, or comma-separated)
 * and extracts candidate machine names.
 */
export function extractCandidateNames(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  const trimmed = raw.trim();

  // 1. Try parsing as JSON array
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const names: string[] = [];
        for (const item of parsed) {
          if (typeof item === 'string') {
            names.push(item);
          } else if (item && typeof item === 'object') {
            const val = (item as any).name || (item as any).machine || (item as any).target || (item as any).title || (item as any).room || (item as any).id;
            if (typeof val === 'string') names.push(val);
          }
        }
        if (names.length > 0) return names;
      }
    } catch {
      // Fall through to text/CSV parser
    }
  }

  // 2. CSV / Tab / Line Delimited parsing
  const lines = trimmed.split(/[\r\n]+/);
  const candidates = new Set<string>();

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Check if line is CSV header (e.g. "Name,OS,Difficulty" or "Machine,Status")
    if (/^(name|machine|target|room|title)\s*[,;\t]/i.test(cleanLine)) {
      continue;
    }

    // Split by comma or tab if it looks like CSV
    if (cleanLine.includes(',') || cleanLine.includes('\t') || cleanLine.includes(';')) {
      const parts = cleanLine.split(/[,;\t]+/).map(p => p.trim().replace(/^[\"\']|[\"\']$/g, ''));
      // Pick first non-empty alphanumeric part that isn't a status or number
      for (const part of parts) {
        if (part && !/^(easy|medium|hard|insane|completed|foothold|root|linux|windows|htb|thm|\d+)$/i.test(part)) {
          candidates.add(part);
          break;
        }
      }
    } else {
      candidates.add(cleanLine);
    }
  }

  return Array.from(candidates);
}

/**
 * Matches candidate names against the catalog of 931 targets.
 */
export function matchCandidateNamesToCatalog(
  candidates: string[],
  catalog: Machine[]
): BulkPwnParseResult {
  const normMap = new Map<string, Machine>();
  const idMap = new Map<string, Machine>();

  // Build lookup index
  for (const m of catalog) {
    idMap.set(m.id.toLowerCase(), m);
    normMap.set(normalizeTargetName(m.name), m);
  }

  const allMatches: BulkPwnMatch[] = [];
  const newSolves: BulkPwnMatch[] = [];
  const alreadySolved: BulkPwnMatch[] = [];
  const unmatched: string[] = [];
  const matchedMachineIds = new Set<string>();

  for (const raw of candidates) {
    const norm = normalizeTargetName(raw);
    if (!norm) continue;

    // 1. Exact normalized name match
    let match = normMap.get(norm);
    let confidence = 1.0;

    // 2. Exact ID match (e.g. "htb-lame" or "thm-pickle-rick")
    if (!match) {
      match = idMap.get(raw.toLowerCase()) || idMap.get(`htb-${norm}`) || idMap.get(`thm-${norm}`);
      if (match) confidence = 0.95;
    }

    // 3. Substring match fallback
    if (!match) {
      for (const [catNorm, m] of normMap.entries()) {
        if (catNorm.length >= 4 && (catNorm.includes(norm) || norm.includes(catNorm))) {
          match = m;
          confidence = 0.85;
          break;
        }
      }
    }

    if (match) {
      // Prevent duplicate matches for the same catalog machine in one batch
      if (matchedMachineIds.has(match.id)) continue;
      matchedMachineIds.add(match.id);

      const pwnMatch: BulkPwnMatch = {
        rawInput: raw,
        machineId: match.id,
        machineName: match.name,
        platform: match.platform,
        difficulty: match.difficulty,
        currentStatus: match.status,
        confidence,
      };

      allMatches.push(pwnMatch);
      if (match.status === 'root' || match.status === 'completed') {
        alreadySolved.push(pwnMatch);
      } else {
        newSolves.push(pwnMatch);
      }
    } else {
      unmatched.push(raw);
    }
  }

  return {
    allMatches,
    newSolves,
    alreadySolved,
    unmatched,
    totalInputTokens: candidates.length,
  };
}
