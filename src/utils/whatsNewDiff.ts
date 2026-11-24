import type { Difficulty, Machine, OperatingSystem, Platform } from '../types';

const SEEN_RELEASE_KEY = 'zerobox_seen_release_v1';

export interface CatalogMachineSummary {
  id?: string;
  name: string;
  platform: Platform | string;
  os?: OperatingSystem | string;
  difficulty?: Difficulty | string;
  releasedAt?: string;
}

export interface ReleaseManifest {
  version: string;
  releasedAt: string | null;
  catalogAsOf: string | null;
  activePoolCount: number;
  highlights: string[];
  machines: {
    added: CatalogMachineSummary[];
    active: CatalogMachineSummary[];
    retired: CatalogMachineSummary[];
  };
}

export interface SeenReleaseSnapshot {
  version: string;
  catalogFingerprint: string;
  seenIds: string[];
  seenActiveIds: string[];
  seenAt: string;
}

export interface CatalogUpdateDiff {
  isFirstSeed: boolean;
  hasAppUpdate: boolean;
  hasCatalogUpdate: boolean;
  previousVersion: string | null;
  currentVersion: string;
  added: CatalogMachineSummary[];
  activated: CatalogMachineSummary[];
  retired: CatalogMachineSummary[];
  nextSnapshot: SeenReleaseSnapshot;
}

export interface WhatsNewPayload {
  version: string;
  previousVersion: string | null;
  releasedAt: string | null;
  catalogAsOf: string | null;
  activePoolCount: number;
  highlights: string[];
  added: CatalogMachineSummary[];
  active: CatalogMachineSummary[];
  retired: CatalogMachineSummary[];
  source: 'auto' | 'manual';
}

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function isCatalogMachine(m: Machine): boolean {
  return !m.isCustom && m.platform !== 'Custom';
}

function toSummary(m: Machine): CatalogMachineSummary {
  return {
    id: m.id,
    name: m.name,
    platform: m.platform,
    os: m.os,
    difficulty: m.difficulty,
  };
}

function fallbackSummaryFromId(id: string): CatalogMachineSummary {
  const match = /^(htb|thm|pg|vulnhub)[-_](.+)$/i.exec(id);
  const platformMap: Record<string, Platform> = {
    htb: 'HTB',
    thm: 'THM',
    pg: 'PG',
    vulnhub: 'VulnHub',
  };
  const platform = match ? platformMap[match[1].toLowerCase()] ?? 'HTB' : 'HTB';
  const rawName = match ? match[2] : id;
  const name = rawName
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return { id, name: name || id, platform };
}

export function buildCatalogSnapshot(
  machines: readonly Machine[],
  currentVersion: string,
  nowIso = new Date().toISOString(),
): SeenReleaseSnapshot {
  const catalog = machines.filter(isCatalogMachine);
  const seenIds = catalog.map((m) => m.id).sort();
  const seenActiveIds = catalog
    .filter((m) => Boolean(m.isActive))
    .map((m) => m.id)
    .sort();
  const catalogFingerprint = `${seenIds.length}:${seenActiveIds.length}:${fnv1aHash(seenIds.join(','))}:${fnv1aHash(seenActiveIds.join(','))}`;
  return {
    version: currentVersion,
    catalogFingerprint,
    seenIds,
    seenActiveIds,
    seenAt: nowIso,
  };
}

export function computeWhatsNewDiff(
  prev: SeenReleaseSnapshot | null,
  machines: readonly Machine[],
  currentVersion: string,
  nowIso = new Date().toISOString(),
): CatalogUpdateDiff {
  const nextSnapshot = buildCatalogSnapshot(machines, currentVersion, nowIso);
  if (!prev) {
    return {
      isFirstSeed: true,
      hasAppUpdate: false,
      hasCatalogUpdate: false,
      previousVersion: null,
      currentVersion,
      added: [],
      activated: [],
      retired: [],
      nextSnapshot,
    };
  }

  const catalog = machines.filter(isCatalogMachine);
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const prevIdSet = new Set(prev.seenIds);
  const prevActiveSet = new Set(prev.seenActiveIds);
  const curActiveSet = new Set(nextSnapshot.seenActiveIds);

  const added = catalog.filter((m) => !prevIdSet.has(m.id)).map(toSummary);
  const activated = catalog.filter((m) => Boolean(m.isActive) && !prevActiveSet.has(m.id)).map(toSummary);
  const retired = prev.seenActiveIds
    .filter((id) => !curActiveSet.has(id))
    .map((id) => {
      const existing = byId.get(id);
      return existing ? toSummary(existing) : fallbackSummaryFromId(id);
    });

  const hasAppUpdate = prev.version !== currentVersion;
  const hasCatalogUpdate = added.length > 0 || activated.length > 0 || retired.length > 0;

  return {
    isFirstSeed: false,
    hasAppUpdate,
    hasCatalogUpdate,
    previousVersion: prev.version,
    currentVersion,
    added,
    activated,
    retired,
    nextSnapshot,
  };
}

export function parseReleaseNotesBullets(notes: string | null | undefined, limit = 5): string[] {
  if (!notes || !notes.trim()) return [];
  const bullets: string[] = [];
  for (const rawLine of notes.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const cleaned = line
      .replace(/^[-*•]\s+/, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .trim();
    if (cleaned) bullets.push(cleaned);
    if (bullets.length >= limit) break;
  }
  return bullets;
}

export function mergeReleaseManifest(
  diff: CatalogUpdateDiff | null,
  manifest: ReleaseManifest | null,
  currentVersion: string,
  activePoolCountFallback: number,
  source: 'auto' | 'manual',
): WhatsNewPayload {
  const highlights = manifest?.highlights?.length ? manifest.highlights.slice(0, 6) : [];
  const hasLocalMachineDiff = Boolean(
    diff && (diff.added.length > 0 || diff.activated.length > 0 || diff.retired.length > 0),
  );

  const added = hasLocalMachineDiff
    ? diff!.added
    : manifest?.machines?.added ?? [];
  const active = hasLocalMachineDiff
    ? diff!.activated
    : manifest?.machines?.active ?? [];
  const retired = hasLocalMachineDiff
    ? diff!.retired
    : manifest?.machines?.retired ?? [];

  return {
    version: manifest?.version || currentVersion,
    previousVersion: diff?.previousVersion ?? null,
    releasedAt: manifest?.releasedAt ?? null,
    catalogAsOf: manifest?.catalogAsOf ?? null,
    activePoolCount: manifest?.activePoolCount ?? activePoolCountFallback,
    highlights,
    added,
    active,
    retired,
    source,
  };
}

export function readSeenRelease(): SeenReleaseSnapshot | null {
  try {
    const raw = localStorage.getItem(SEEN_RELEASE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SeenReleaseSnapshot>;
    if (
      typeof parsed.version !== 'string' ||
      typeof parsed.catalogFingerprint !== 'string' ||
      !Array.isArray(parsed.seenIds) ||
      !Array.isArray(parsed.seenActiveIds)
    ) {
      return null;
    }
    return {
      version: parsed.version,
      catalogFingerprint: parsed.catalogFingerprint,
      seenIds: parsed.seenIds.filter((v): v is string => typeof v === 'string'),
      seenActiveIds: parsed.seenActiveIds.filter((v): v is string => typeof v === 'string'),
      seenAt: typeof parsed.seenAt === 'string' ? parsed.seenAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeSeenRelease(snapshot: SeenReleaseSnapshot): void {
  try {
    localStorage.setItem(SEEN_RELEASE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage quota or private browsing mode: silently skip persistence.
  }
}

export async function fetchReleaseManifest(bypassCache = false): Promise<ReleaseManifest | null> {
  if (typeof fetch !== 'function') return null;
  try {
    const base = import.meta.env.BASE_URL || '/';
    const url = `${base.endsWith('/') ? base : `${base}/`}release-manifest.json`;
    const res = await fetch(url, bypassCache ? { cache: 'no-store' } : undefined);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ReleaseManifest>;
    if (!data || typeof data.version !== 'string') return null;
    return {
      version: data.version,
      releasedAt: typeof data.releasedAt === 'string' ? data.releasedAt : null,
      catalogAsOf: typeof data.catalogAsOf === 'string' ? data.catalogAsOf : null,
      activePoolCount: typeof data.activePoolCount === 'number' ? data.activePoolCount : 0,
      highlights: Array.isArray(data.highlights)
        ? data.highlights.filter((h): h is string => typeof h === 'string')
        : [],
      machines: {
        added: Array.isArray(data.machines?.added) ? data.machines.added : [],
        active: Array.isArray(data.machines?.active) ? data.machines.active : [],
        retired: Array.isArray(data.machines?.retired) ? data.machines.retired : [],
      },
    };
  } catch {
    return null;
  }
}
