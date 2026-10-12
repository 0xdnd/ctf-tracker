/**
 * syncMerge.ts
 * Pure merge of two ZeroBox workspaces (this device + an imported sync file). No store, no storage, no clock
 * except the optional `now` used for tombstone pruning, so every rule here is unit tested in isolation.
 *
 * Baselines (the "lastSyncedAt" of the design) are kept per peer device and per clock, so a skewed clock on
 * one device cannot hide a genuine edit:
 *   - remoteBase: the `syncedAt` (REMOTE clock) of the last file from that device merged here. A remote
 *     machine is "changed" when its updatedAt (remote clock) is later.
 *   - localBase:  the `syncedAt` (LOCAL clock) of the last file from this device that the remote merged; the
 *     remote file carries it in `syncPeers[localDeviceId]`. A local machine is "changed" when its updatedAt
 *     (local clock) is later.
 * An unknown base counts as "changed" (conservative: it can only turn an automatic pick into a conflict).
 * After a merge the caller stores `machineBase` (a fingerprint hash of each machine in the peer's file) as the
 * common ancestor for that peer. On the next merge with the same peer, any machine with a recorded base is
 * judged by content: local changed = local differs from the base, incoming changed = incoming differs from
 * it. That makes repeated one-way sync (A exports, B only merges) exact, independent of both clocks.
 * A plain backup without sync metadata (`lastSyncedAt === null`) merges as a union: no deletions and no
 * conflicts, except where both sides hold different non-empty text (rule 3).
 *
 * Machine rules, for an id present on both sides whose progress differs:
 *   1. incoming has no user progress            -> keep local
 *   2. local has no user progress (pristine)     -> take incoming
 *   3. legacy file: incoming covers local -> take it; local covers incoming -> keep; a flag/notes/writeup/scan
 *      text that is non-empty on both sides and differs -> CONFLICT (a union would drop the incoming text);
 *      otherwise a field union (status max, empty text filled from the file, time max, ports/services/checklist union)
 *   4. incoming unchanged since remoteBase       -> keep local (this device already saw that version)
 *   5. only incoming changed                     -> take it, unless that would lose local progress: CONFLICT
 *   6. both changed                              -> incoming covers local ? take it
 *                                                  : local covers incoming ? keep local : CONFLICT
 * Machines on one side only are added, unless the other side holds a tombstone later than their updatedAt.
 * A tombstone removes a local machine only when its deletedAt is later than the local updatedAt.
 * Redacted values ('[REDACTED]') in the file never replace a real local value.
 */
import type {
  ActivitySession,
  AttackGraphEdge,
  CredAttempt,
  Credential,
  LootItem,
  Machine,
  MachineTombstone,
} from '../types';
import type { CptsNoteEntry } from './obsidianManualUtils';
import { hasUserProgress, isGenuineCustom } from '../store/machineNormalization';
import { mergeImportedLoot, REDACTED } from '../store/lootPersistence';
import { normalizeMachineTombstones, pruneMachineTombstones } from './machineTombstones';

export interface SyncWorkspace {
  deviceId?: string;
  syncedAt?: string;
  /** deviceId -> syncedAt of the last file from that device merged by the exporter (that device's clock). */
  syncPeers?: Record<string, string>;
  isRedacted?: boolean;
  machines: Machine[];
  deletedMachineIds?: MachineTombstone[];
  customNotes?: CptsNoteEntry[];
  userNotes?: CptsNoteEntry[];
  userWikilinkMap?: Record<string, string>;
  deletedNoteIds?: string[];
  activitySessions?: ActivitySession[];
  graphEdges?: AttackGraphEdge[];
  credentials?: Credential[];
  credAttempts?: CredAttempt[];
  lootItems?: LootItem[];
}

export interface SyncBaseline {
  /** LOCAL clock: local edits after this were not seen by the remote. null = unknown. */
  localBase: string | null;
  /** REMOTE clock: remote edits after this were not merged here yet. null = unknown. */
  remoteBase: string | null;
  /**
   * Fingerprint hash of each machine as this peer's last merged file had it (the common ancestor). When an
   * id is present, "changed" is decided by comparing fingerprints with it on both sides: no clocks involved.
   */
  machineBase?: Record<string, string>;
}

export type ConflictChoice = 'local' | 'incoming';

export interface MachineSideSummary {
  status: string;
  userFlag: boolean;
  rootFlag: boolean;
  notesChars: number;
  writeupChars: number;
  timeSpentSeconds: number;
  updatedAt: string;
}

export interface SyncConflict {
  id: string;
  name: string;
  local: MachineSideSummary;
  incoming: MachineSideSummary;
}

export interface SyncMergeSummary {
  added: number;
  updated: number;
  removed: number;
  conflictsResolved: number;
  notesAdded: number;
  sessionsAdded: number;
  edgesAdded: number;
  lootAdded: number;
}

export interface MergedWorkspace {
  machines: Machine[];
  deletedMachineIds: MachineTombstone[];
  customNotes: CptsNoteEntry[];
  userNotes: CptsNoteEntry[];
  userWikilinkMap: Record<string, string>;
  deletedNoteIds: string[];
  activitySessions: ActivitySession[];
  graphEdges: AttackGraphEdge[];
  credentials: Credential[];
  credAttempts: CredAttempt[];
  lootItems: LootItem[];
}

export interface SyncMergeResult {
  merged: MergedWorkspace;
  /** Unresolved conflicts. While non-empty the caller must not write `merged`. */
  conflicts: SyncConflict[];
  summary: SyncMergeSummary;
  /** Store as the remote device's `machineBase` after writing `merged` (fingerprints of its machines). */
  machineBase: Record<string, string>;
}

export interface SyncMergeOptions {
  resolutions?: Record<string, ConflictChoice>;
  now?: number;
}

/** Reads the per-peer baselines; null for a plain backup without sync metadata (legacy union mode). */
export function resolveSyncBaseline(
  local: {
    deviceId?: string;
    syncPeers?: Record<string, string>;
    /** peer deviceId -> machineBase recorded after the last merge of that peer's file. */
    peerMachineBases?: Record<string, Record<string, string>>;
  },
  remote: Pick<SyncWorkspace, 'deviceId' | 'syncPeers'>
): SyncBaseline | null {
  if (typeof remote.deviceId !== 'string' || !remote.deviceId) return null;
  const pick = (map: Record<string, string> | undefined, key: string | undefined) => {
    const v = key && map && typeof map === 'object' ? map[key] : undefined;
    return typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null;
  };
  const machineBase = local.peerMachineBases?.[remote.deviceId];
  return {
    remoteBase: pick(local.syncPeers, remote.deviceId),
    localBase: pick(remote.syncPeers, local.deviceId),
    ...(machineBase && typeof machineBase === 'object' ? { machineBase } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Value normalization and machine fingerprints
// ---------------------------------------------------------------------------------------------------------

const ms = (iso: unknown): number => {
  const n = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const after = (iso: unknown, base: string | null): boolean => base === null || ms(iso) > ms(base);

/** Empty-equivalent values ('' / [] / {} / 0 / false / null) collapse to undefined so storage shapes compare equal. */
function norm(v: unknown): unknown {
  if (v === null || v === undefined || v === '' || v === 0 || v === false) return undefined;
  if (Array.isArray(v)) {
    const out = v.map(norm).filter((x) => x !== undefined);
    return out.length ? out : undefined;
  }
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      const n = norm((v as Record<string, unknown>)[k]);
      if (n !== undefined) out[k] = n;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v;
}

const stable = (v: unknown): string => JSON.stringify(norm(v)) ?? '';

const PROGRESS_KEYS = [
  'status', 'userFlag', 'rootFlag', 'userPwnedAt', 'rootPwnedAt', 'timeSpentSeconds', 'timeToUserSeconds',
  'timeToRootSeconds', 'perceivedDifficulty', 'rating', 'quickNotes', 'writeupMarkdown', 'openPorts', 'services',
  'scanSummary', 'rawScanOutput', 'checklist', 'ip', 'tags',
] as const satisfies readonly (keyof Machine)[];

/** Descriptive fields that only the operator sets on their own machines. */
const CUSTOM_KEYS = [
  'name', 'os', 'difficulty', 'platform', 'roomUrl', 'writeupUrl', 'hint', 'certifications',
  'skillsLearned', 'isActive',
] as const satisfies readonly (keyof Machine)[];

/** Tags are a set: order and duplicates never count as a change. */
const tagSet = (m: Machine): string[] => Array.from(new Set((m.tags || []).filter((t) => typeof t === 'string'))).sort();

const unionTags = (a: Machine, b: Machine): string[] => Array.from(new Set([...(a.tags || []), ...(b.tags || [])]));

/** `m` with the other side's tags added (a tag edit on either device is never dropped). */
const withUnionTags = (m: Machine, other: Machine): Machine => {
  const tags = unionTags(m, other);
  return tags.length === new Set(m.tags || []).size ? m : { ...m, tags };
};

const keysFor = (m: Machine): readonly (keyof Machine)[] =>
  isGenuineCustom(m) ? [...PROGRESS_KEYS, ...CUSTOM_KEYS] : PROGRESS_KEYS;

/** cyrb53: short, fast, synchronous; collisions only cost a spurious conflict or auto-pick of equal content. */
function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const fingerprintHash = (m: Machine): string => hashString(machineFingerprint(m));

export function machineFingerprint(m: Machine, options: { tags?: boolean } = {}): string {
  const pick: Record<string, unknown> = {};
  for (const k of keysFor(m)) {
    if (k === 'tags') {
      if (options.tags !== false) pick.tags = tagSet(m);
    } else {
      pick[k] = k === 'status' && (m.status as string) === 'unsolved' ? 'backlog' : m[k];
    }
  }
  return stable(pick);
}

const STATUS_RANK: Record<string, number> = { backlog: 0, unsolved: 0, recon: 1, foothold: 2, root: 3, completed: 4 };
const rank = (s: unknown) => STATUS_RANK[String(s)] ?? 0;
const CHECK_RANK: Record<string, number> = { todo: 0, in_progress: 1, na: 2, done: 2 };
const checkRank = (s: unknown) => CHECK_RANK[String(s)] ?? 0;

const filled = (v: unknown): boolean => norm(v) !== undefined;

const TEXT_KEYS = [
  'userFlag', 'rootFlag', 'userPwnedAt', 'rootPwnedAt', 'quickNotes', 'writeupMarkdown', 'scanSummary', 'rawScanOutput',
] as const;
/** Scalars where two different non-empty values are a divergence, not a superset. */
const SCALAR_KEYS = [...TEXT_KEYS, 'perceivedDifficulty', 'rating', 'ip'] as const;

const serviceKey = (s: { port?: number; protocol?: string }) => `${s.port}/${s.protocol ?? 'tcp'}`;

/**
 * Operator-written text where a union would silently drop the incoming value. The pwned-at timestamps are
 * TEXT_KEYS too but deliberately left out: two devices recording different capture times is not lost work.
 */
const LOSSY_TEXT_KEYS = ['userFlag', 'rootFlag', 'quickNotes', 'writeupMarkdown', 'scanSummary', 'rawScanOutput'] as const;

/** True when some text is non-empty on both sides and different. */
export const textDiverges = (a: Machine, b: Machine): boolean =>
  LOSSY_TEXT_KEYS.some((k) => filled(a[k]) && filled(b[k]) && a[k] !== b[k]);

/** True when `to` lacks progress that `from` has (a downgrade). Plain text edits are not losses. */
export function losesProgress(from: Machine, to: Machine): boolean {
  if (rank(to.status) < rank(from.status)) return true;
  for (const k of TEXT_KEYS) if (filled(from[k]) && !filled(to[k])) return true;
  if ((to.timeSpentSeconds || 0) < (from.timeSpentSeconds || 0)) return true;
  if (filled(from.rating) && !filled(to.rating)) return true;
  const toPorts = new Set(to.openPorts || []);
  if ((from.openPorts || []).some((p) => !toPorts.has(p))) return true;
  const toServices = new Set((to.services || []).map(serviceKey));
  if ((from.services || []).some((s) => !toServices.has(serviceKey(s)))) return true;
  const fromItems = from.checklist?.itemsState || {};
  const toItems = to.checklist?.itemsState || {};
  for (const [id, item] of Object.entries(fromItems)) {
    const other = toItems[id];
    if (checkRank(item?.status) === 0 && !filled(item?.notes)) continue;
    if (!other || checkRank(other.status) < checkRank(item?.status)) return true;
    if (filled(item?.notes) && !filled(other.notes)) return true;
  }
  return false;
}

/** True when `a` already contains everything `b` has, so choosing `a` loses nothing of `b`. */
export function coversMachine(a: Machine, b: Machine): boolean {
  if (losesProgress(b, a)) return false;
  for (const k of SCALAR_KEYS) if (filled(b[k]) && stable(a[k]) !== stable(b[k])) return false;
  const aItems = a.checklist?.itemsState || {};
  for (const [id, item] of Object.entries(b.checklist?.itemsState || {})) {
    if (filled(item?.notes) && aItems[id]?.notes !== item?.notes) return false;
  }
  const aServices = new Map((a.services || []).map((s) => [serviceKey(s), stable(s)]));
  for (const s of b.services || []) if (aServices.get(serviceKey(s)) !== stable(s)) return false;
  if (isGenuineCustom(a) || isGenuineCustom(b)) {
    for (const k of CUSTOM_KEYS) if (filled(b[k]) && stable(a[k]) !== stable(b[k])) return false;
  }
  return true;
}

const latest = (a: string | undefined, b: string | undefined) => (ms(a) >= ms(b) ? a : b) || a || b || '';

/** Field-level union used for legacy files: never drops progress from either side; local wins on divergence. */
export function unionMachine(local: Machine, incoming: Machine): Machine {
  const out: Machine = { ...incoming, ...local };
  if (rank(incoming.status) > rank(local.status)) out.status = incoming.status;
  for (const k of [...SCALAR_KEYS, 'timeToUserSeconds', 'timeToRootSeconds'] as const) {
    if (!filled(local[k]) && filled(incoming[k])) (out as unknown as Record<string, unknown>)[k] = incoming[k];
  }
  out.timeSpentSeconds = Math.max(local.timeSpentSeconds || 0, incoming.timeSpentSeconds || 0);
  const ports = [...(local.openPorts || [])];
  for (const p of incoming.openPorts || []) if (!ports.includes(p)) ports.push(p);
  if (ports.length) out.openPorts = ports;
  const services = [...(local.services || [])];
  const seen = new Set(services.map(serviceKey));
  for (const s of incoming.services || []) if (!seen.has(serviceKey(s))) services.push(s);
  if (services.length) out.services = services;
  const tags = Array.from(new Set([...(local.tags || []), ...(incoming.tags || [])]));
  out.tags = tags;
  if (local.checklist || incoming.checklist) {
    const lItems = local.checklist?.itemsState || {};
    const rItems = incoming.checklist?.itemsState || {};
    const itemsState: NonNullable<Machine['checklist']>['itemsState'] = { ...rItems };
    for (const [id, item] of Object.entries(lItems)) {
      const other = rItems[id];
      if (!other) itemsState[id] = item;
      else {
        const base = checkRank(other.status) > checkRank(item.status) ? other : item;
        itemsState[id] = { ...base, notes: filled(item.notes) ? item.notes : other.notes };
      }
    }
    const clPorts = Array.from(new Set([...(local.checklist?.openPorts || []), ...(incoming.checklist?.openPorts || [])]));
    out.checklist = {
      openPorts: clPorts,
      activeItemId: local.checklist?.activeItemId ?? incoming.checklist?.activeItemId ?? null,
      itemsState,
    };
  }
  out.updatedAt = latest(local.updatedAt, incoming.updatedAt);
  return out;
}

/** Replaces redacted placeholders in an incoming machine with the local value (or drops them). */
function unredact(incoming: Machine, local: Machine | undefined): Machine {
  let out = incoming;
  for (const k of ['userFlag', 'rootFlag'] as const) {
    if (incoming[k] === REDACTED) {
      if (out === incoming) out = { ...incoming };
      if (local && filled(local[k]) && local[k] !== REDACTED) out[k] = local[k];
      else delete out[k];
    }
  }
  return out;
}

export function summarizeMachine(m: Machine): MachineSideSummary {
  return {
    status: (m.status as string) === 'unsolved' ? 'backlog' : m.status,
    userFlag: filled(m.userFlag) || filled(m.userPwnedAt),
    rootFlag: filled(m.rootFlag) || filled(m.rootPwnedAt),
    notesChars: (m.quickNotes || '').length,
    writeupChars: (m.writeupMarkdown || '').length,
    timeSpentSeconds: m.timeSpentSeconds || 0,
    updatedAt: m.updatedAt,
  };
}

type Decision = { pick: 'local' } | { pick: 'incoming' } | { pick: 'union'; machine: Machine } | { pick: 'conflict' };

function decideMachine(local: Machine, incoming: Machine, baseline: SyncBaseline | null): Decision {
  if (machineFingerprint(local) === machineFingerprint(incoming)) return { pick: 'local' };
  const base = baseline?.machineBase?.[local.id];
  const remoteChanged = () =>
    base !== undefined ? fingerprintHash(incoming) !== base : after(incoming.updatedAt, baseline?.remoteBase ?? null);
  const localChanged = () =>
    base !== undefined ? fingerprintHash(local) !== base : after(local.updatedAt, baseline?.localBase ?? null);
  // Tags-only difference (tags can be edited on catalog machines too): one side changed -> take its tags,
  // both changed or no baseline -> union, never a conflict.
  if (machineFingerprint(local, { tags: false }) === machineFingerprint(incoming, { tags: false })) {
    if (baseline !== null && !remoteChanged()) return { pick: 'local' };
    if (baseline !== null && !localChanged()) return { pick: 'incoming' };
    return { pick: 'union', machine: withUnionTags(local, incoming) };
  }
  if (!hasUserProgress(incoming) && !isGenuineCustom(incoming)) return { pick: 'local' };
  if (!hasUserProgress(local) && !isGenuineCustom(local)) return { pick: 'union', machine: withUnionTags(incoming, local) };
  if (baseline === null) {
    if (coversMachine(incoming, local)) return { pick: 'union', machine: withUnionTags(incoming, local) };
    if (coversMachine(local, incoming)) return { pick: 'union', machine: withUnionTags(local, incoming) };
    // The union keeps local text and the pre-sync snapshot only holds local data: two different non-empty
    // texts would lose the incoming one for good, so the user decides.
    if (textDiverges(local, incoming)) return { pick: 'conflict' };
    return { pick: 'union', machine: unionMachine(local, incoming) };
  }
  // With a recorded common ancestor, compare content against it (exact, clock-free). Otherwise fall back to
  // the per-clock timestamps.
  if (!remoteChanged()) return { pick: 'local' };
  if (!localChanged()) return losesProgress(local, incoming) ? { pick: 'conflict' } : { pick: 'incoming' };
  // Both changed: a superset wins, carrying the other side's tags along (tags union, never lost).
  if (coversMachine(incoming, local)) return { pick: 'union', machine: withUnionTags(incoming, local) };
  if (coversMachine(local, incoming)) return { pick: 'union', machine: withUnionTags(local, incoming) };
  return { pick: 'conflict' };
}

// ---------------------------------------------------------------------------------------------------------
// Workspace merge
// ---------------------------------------------------------------------------------------------------------

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isMachine = (m: unknown): m is Machine =>
  Boolean(m && typeof m === 'object' && typeof (m as Machine).id === 'string' && (m as Machine).id);

function unionById<T extends { id: string }>(local: T[], incoming: T[], keep?: (x: T) => boolean): { list: T[]; added: number } {
  const ids = new Set(local.map((x) => x.id));
  const list = [...local];
  let added = 0;
  for (const x of incoming) {
    if (!x || typeof x.id !== 'string' || ids.has(x.id) || (keep && !keep(x))) continue;
    ids.add(x.id);
    list.push(x);
    added++;
  }
  return { list, added };
}

function mergeTombstones(a: MachineTombstone[], b: MachineTombstone[], alive: Set<string>, now: number): MachineTombstone[] {
  const merged = normalizeMachineTombstones([...a, ...b]).filter((t) => !alive.has(t.id));
  return pruneMachineTombstones(merged, now);
}

const noteChanged = (note: CptsNoteEntry, base: string | null) =>
  base === null ? filled(note.dateModified) : ms(note.dateModified) > ms(base);

export function mergeWorkspaces(
  local: SyncWorkspace,
  remote: SyncWorkspace,
  lastSyncedAt: SyncBaseline | string | null,
  options: SyncMergeOptions = {}
): SyncMergeResult {
  const baseline: SyncBaseline | null =
    typeof lastSyncedAt === 'string' ? { localBase: lastSyncedAt, remoteBase: lastSyncedAt } : lastSyncedAt;
  const now = options.now ?? Date.now();
  const resolutions = options.resolutions ?? {};
  const summary: SyncMergeSummary = {
    added: 0, updated: 0, removed: 0, conflictsResolved: 0, notesAdded: 0, sessionsAdded: 0, edgesAdded: 0, lootAdded: 0,
  };
  const conflicts: SyncConflict[] = [];

  // --- machines -----------------------------------------------------------------------------------------
  const localMachines = asArray<Machine>(local.machines).filter(isMachine);
  const remoteMachines = asArray<Machine>(remote.machines).filter(isMachine);
  const localTombs = normalizeMachineTombstones(local.deletedMachineIds);
  const remoteTombs = normalizeMachineTombstones(remote.deletedMachineIds);
  const remoteTombById = new Map(remoteTombs.map((t) => [t.id, t]));
  const localTombById = new Map(localTombs.map((t) => [t.id, t]));
  const remoteById = new Map(remoteMachines.map((m) => [m.id, m]));
  const localIds = new Set(localMachines.map((m) => m.id));

  const machines: Machine[] = [];
  for (const l of localMachines) {
    const raw = remoteById.get(l.id);
    if (!raw) {
      const tomb = remoteTombById.get(l.id);
      if (tomb && ms(tomb.deletedAt) > ms(l.updatedAt)) {
        summary.removed++;
        continue;
      }
      machines.push(l);
      continue;
    }
    const r = unredact(raw, l);
    const decision = decideMachine(l, r, baseline);
    let chosen: Machine = l;
    if (decision.pick === 'incoming') chosen = r;
    else if (decision.pick === 'union') chosen = decision.machine;
    else if (decision.pick === 'conflict') {
      const choice = resolutions[l.id];
      if (choice === 'local' || choice === 'incoming') {
        summary.conflictsResolved++;
        chosen = choice === 'incoming' ? r : l;
      } else {
        conflicts.push({ id: l.id, name: l.name || r.name || l.id, local: summarizeMachine(l), incoming: summarizeMachine(r) });
      }
    }
    if (chosen !== l && decision.pick !== 'conflict' && machineFingerprint(chosen) !== machineFingerprint(l)) summary.updated++;
    machines.push(chosen);
  }
  for (const raw of remoteMachines) {
    if (localIds.has(raw.id)) continue;
    const tomb = localTombById.get(raw.id);
    if (tomb && ms(tomb.deletedAt) > ms(raw.updatedAt)) continue;
    // Pristine catalog rows are not "new work": the local catalog already provides them.
    if (!isGenuineCustom(raw) && !raw.isCustom && !hasUserProgress(raw)) continue;
    machines.push(unredact(raw, undefined));
    localIds.add(raw.id);
    summary.added++;
  }
  const alive = new Set(machines.map((m) => m.id));
  const deletedMachineIds = mergeTombstones(localTombs, remoteTombs, alive, now);

  // Common ancestor for the next merge with this peer: what its file had for every machine with work in it.
  const localById = new Map(localMachines.map((m) => [m.id, m]));
  const machineBase: Record<string, string> = {};
  for (const raw of remoteMachines) {
    if (!isGenuineCustom(raw) && !raw.isCustom && !hasUserProgress(raw)) continue;
    machineBase[raw.id] = fingerprintHash(unredact(raw, localById.get(raw.id)));
  }

  // --- notes ---------------------------------------------------------------------------------------------
  const localDeleted = new Set(asArray<string>(local.deletedNoteIds).filter((x) => typeof x === 'string'));
  const remoteDeleted = new Set(asArray<string>(remote.deletedNoteIds).filter((x) => typeof x === 'string'));
  const deleted = new Set([...localDeleted, ...remoteDeleted]);
  const keepAlive = new Set<string>();
  const localCustom = asArray<CptsNoteEntry>(local.customNotes).filter((n) => n && typeof n.id === 'string');
  const remoteCustom = asArray<CptsNoteEntry>(remote.customNotes).filter((n) => n && typeof n.id === 'string');
  const remoteCustomById = new Map(remoteCustom.map((n) => [n.id, n]));

  const customNotes: CptsNoteEntry[] = [];
  for (const n of localCustom) {
    // Deleted on the other device: honoured unless this device edited the note since the last sync.
    if (remoteDeleted.has(n.id) && !localDeleted.has(n.id)) {
      if (!noteChanged(n, baseline?.localBase ?? null)) continue;
      keepAlive.add(n.id);
    }
    const r = remoteCustomById.get(n.id);
    customNotes.push(r && ms(r.dateModified) > ms(n.dateModified) && stable(r) !== stable(n) ? r : n);
  }
  const customIds = new Set(customNotes.map((n) => n.id));
  for (const r of remoteCustom) {
    if (customIds.has(r.id)) continue;
    if (remoteDeleted.has(r.id)) continue;
    if (localDeleted.has(r.id)) {
      // Deleted here: only an edit made on the other device after the last sync revives it (never for legacy files).
      if (baseline === null || !noteChanged(r, baseline.remoteBase)) continue;
      keepAlive.add(r.id);
    }
    customNotes.push(r);
    customIds.add(r.id);
    summary.notesAdded++;
  }
  for (const id of keepAlive) deleted.delete(id);

  // Imported-vault notes are only ever added; deletions hide them through deletedNoteIds (restorable).
  const userNotesMerge = unionById(
    asArray<CptsNoteEntry>(local.userNotes).filter((n) => n && typeof n.id === 'string'),
    asArray<CptsNoteEntry>(remote.userNotes),
    (n) => !deleted.has(n.id)
  );
  summary.notesAdded += userNotesMerge.added;
  const userWikilinkMap = {
    ...(remote.userWikilinkMap && typeof remote.userWikilinkMap === 'object' ? remote.userWikilinkMap : {}),
    ...(local.userWikilinkMap && typeof local.userWikilinkMap === 'object' ? local.userWikilinkMap : {}),
  };

  // --- sessions, edges, loot -----------------------------------------------------------------------------
  const sessions = unionById(asArray<ActivitySession>(local.activitySessions), asArray<ActivitySession>(remote.activitySessions));
  summary.sessionsAdded = sessions.added;
  const edges = unionById(
    asArray<AttackGraphEdge>(local.graphEdges),
    asArray<AttackGraphEdge>(remote.graphEdges),
    (e) => typeof e.sourceId === 'string' && typeof e.targetId === 'string'
  );
  summary.edgesAdded = edges.added;

  const localLoot = {
    credentials: asArray<Credential>(local.credentials),
    credAttempts: asArray<CredAttempt>(local.credAttempts),
    lootItems: asArray<LootItem>(local.lootItems),
  };
  const loot = mergeImportedLoot(localLoot, remote) ?? localLoot;
  summary.lootAdded =
    loot.credentials.length - localLoot.credentials.length + (loot.lootItems.length - localLoot.lootItems.length);

  return {
    merged: {
      machines,
      deletedMachineIds,
      customNotes,
      userNotes: userNotesMerge.list,
      userWikilinkMap,
      deletedNoteIds: [...deleted],
      activitySessions: sessions.list,
      graphEdges: edges.list,
      credentials: loot.credentials,
      credAttempts: loot.credAttempts,
      lootItems: loot.lootItems,
    },
    conflicts,
    summary,
    machineBase,
  };
}
