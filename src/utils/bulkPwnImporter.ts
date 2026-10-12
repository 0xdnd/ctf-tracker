import { Machine, PipelineStatus, Platform } from '../types';

interface BulkPwnMatch {
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
function normalizeTargetName(name: string): string {
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

/** Platform named by a candidate's prefix, e.g. "HTB - Retro", "[THM] Retro", "tryhackme: Retro". */
function platformHint(raw: string): Platform | undefined {
  const m = /^\s*\[?(htb|hackthebox|thm|tryhackme)\b/i.exec(raw);
  if (!m) return undefined;
  return /^(htb|hackthebox)$/i.test(m[1]) ? 'HTB' : 'THM';
}

/**
 * Matches candidate names against the machine catalog.
 * A name shared by several platforms (e.g. Retro on HTB and THM) resolves to the platform the
 * candidate names in its prefix, else to the first such row in catalog order.
 */
export function matchCandidateNamesToCatalog(
  candidates: string[],
  catalog: Machine[]
): BulkPwnParseResult {
  const normMap = new Map<string, Machine[]>();
  const idMap = new Map<string, Machine>();

  // Build lookup index (catalog order is kept, so "first match" is deterministic)
  for (const m of catalog) {
    idMap.set(m.id.toLowerCase(), m);
    const key = normalizeTargetName(m.name);
    const rows = normMap.get(key);
    if (rows) rows.push(m);
    else normMap.set(key, [m]);
  }
  const pick = (rows: Machine[] | undefined, hint: Platform | undefined): Machine | undefined =>
    rows && ((hint && rows.find((m) => m.platform === hint)) || rows[0]);

  const allMatches: BulkPwnMatch[] = [];
  const newSolves: BulkPwnMatch[] = [];
  const alreadySolved: BulkPwnMatch[] = [];
  const unmatched: string[] = [];
  const matchedMachineIds = new Set<string>();

  for (const raw of candidates) {
    const norm = normalizeTargetName(raw);
    if (!norm) continue;
    const hint = platformHint(raw);

    // 1. Exact catalog id (e.g. "thm-retro"), then exact normalized name match
    let match = idMap.get(raw.trim().toLowerCase()) || pick(normMap.get(norm), hint);
    let confidence = 1.0;

    // 2. Derived ID match (e.g. "Pickle Rick" -> "thm-picklerick")
    if (!match) {
      match = idMap.get(`htb-${norm}`) || idMap.get(`thm-${norm}`);
      if (match) confidence = 0.95;
    }

    // 3. Substring match fallback
    if (!match) {
      for (const [catNorm, rows] of normMap.entries()) {
        if (catNorm.length >= 4 && (catNorm.includes(norm) || norm.includes(catNorm))) {
          match = pick(rows, hint);
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
