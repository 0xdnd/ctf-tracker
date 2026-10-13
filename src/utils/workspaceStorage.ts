import { Machine, CheatsheetCommand, GlobalVariables, ActivitySession } from '../types';
import { CptsNoteEntry } from './obsidianManualUtils';
import { MAX_WEEKLY_ROOT_TARGET } from '../store/useGoalsStore';
import { sanitizeLabStudyFields } from './labStudyValidation';

interface WorkspaceExportPayload {
  version: string;
  exportedAt: string;
  appBrand: string;
  machines: Machine[];
  globalVars: GlobalVariables;
  cheatsheets: CheatsheetCommand[];
  activitySessions: ActivitySession[];
  customNotes?: any[];
  userNotes?: CptsNoteEntry[];
  userWikilinkMap?: Record<string, string>;
  deletedNoteIds?: string[];
  userSolvesReset?: boolean;
  themePreset?: string;
  graphEdges?: any[];
  graphNodePositions?: Record<string, { x: number; y: number }>;
  credentials?: any[];
  credAttempts?: any[];
  lootItems?: any[];
  /** Optional (added after 2.0.0 shipped; older builds ignore it, older backups lack it). */
  goals?: BackupGoals;
  /** 3.0.0: the exam store's persisted snapshot (validated field by field on restore). */
  examState?: Record<string, unknown>;
  /** 3.0.0: IndexedDB content (vault notes; images when a provider is registered). */
  indexedDb?: BackupIndexedDb;
  /** 3.0.0: SHA-256 hex of the canonical payload without this field (see utils/backupChecksum). */
  checksum?: unknown;
}

export interface BackupIndexedDb {
  notes: CptsNoteEntry[];
  wikilinkMap?: Record<string, string>;
  images?: Record<string, unknown>[];
}

const isPlainRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** The optional 3.0.0 `indexedDb` block: entries without a string id are dropped; anything else invalid is ignored. */
export function parseBackupIndexedDb(raw: unknown): BackupIndexedDb | undefined {
  if (!isPlainRecord(raw)) return undefined;
  const hasId = (item: unknown): item is Record<string, unknown> => isPlainRecord(item) && typeof item.id === 'string';
  const notes = Array.isArray(raw.notes) ? raw.notes.map((item) => sanitizeObjectKeys(item)).filter(hasId) : [];
  const out: BackupIndexedDb = { notes: notes as unknown as CptsNoteEntry[] };
  if (isPlainRecord(raw.wikilinkMap)) {
    out.wikilinkMap = Object.fromEntries(
      Object.entries(sanitizeObjectKeys(raw.wikilinkMap)).filter(([, v]) => typeof v === 'string')
    ) as Record<string, string>;
  }
  if (Array.isArray(raw.images)) out.images = raw.images.map((item) => sanitizeObjectKeys(item)).filter(hasId);
  return out;
}

export interface BackupGoals {
  weeklyRootTarget: number | null;
}



/**
 * The optional `goals` block of a backup. weeklyRootTarget must be a positive integer up to MAX_WEEKLY_ROOT_TARGET (99), or null
 * (no goal). Missing or invalid yields undefined, which means "leave the current goals untouched".
 */
export function parseBackupGoals(raw: unknown): BackupGoals | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('weeklyRootTarget' in raw)) return undefined;
  const target = (raw as { weeklyRootTarget: unknown }).weeklyRootTarget;
  if (target === null) return { weeklyRootTarget: null };
  if (typeof target === 'number' && Number.isInteger(target) && target >= 1 && target <= MAX_WEEKLY_ROOT_TARGET) {
    return { weeklyRootTarget: target };
  }
  return undefined;
}

export interface WorkspaceImportResult {
  success: boolean;
  data?: Partial<WorkspaceExportPayload>;
  error?: string;
  restoredCount?: number;
}

/**
 * Recursively strips prototype pollution keys (__proto__, constructor, prototype) from an object.
 * Protected against infinite recursion on cyclic objects and call stack exhaustion on deep payloads.
 */
export function sanitizeObjectKeys<T>(obj: T, seen?: any, depth = 0): T {
  if (!obj || typeof obj !== 'object') return obj;
  const currentDepth = typeof depth === 'number' ? depth : 0;
  if (currentDepth > 32) return null as unknown as T; // Guard against call stack exhaustion on extreme recursion
  const tracker = (seen && typeof seen.has === 'function') ? (seen as WeakSet<object>) : new WeakSet<object>();
  if (tracker.has(obj as object)) return null as unknown as T; // Guard against circular reference loops
  tracker.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectKeys(item, tracker, currentDepth + 1)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = typeof value === 'object' && value !== null ? sanitizeObjectKeys(value, tracker, currentDepth + 1) : value;
  }
  return clean as T;
}

/**
 * Sanitizes file names to protect against directory traversal, path injection,
 * and Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9).
 */
export function sanitizeFilename(name: string, fallback = 'export'): string {
  if (!name || typeof name !== 'string') return fallback;

  // 1. Strip path components by extracting the terminal segment (defense against directory traversal)
  const segments = name.split(/[/\\]/);
  const basename = segments.filter(s => s && s !== '.' && s !== '..').pop() || '';

  // 2. Remove null bytes, non-printable control chars, and dangerous filesystem chars
  let clean = basename
    .replace(/[\0\x00-\x1f\x7f-\x9f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '')
    .trim();

  // 3. Strip leading and trailing dots
  clean = clean.replace(/^\.+/, '').replace(/\.+$/, '');

  // 4. Guard against Windows reserved device names
  const reservedRegex = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  if (reservedRegex.test(clean)) {
    clean = `safe-${clean}`;
  }

  // 5. Truncate length to 128 characters
  if (clean.length > 128) {
    clean = clean.slice(0, 128);
  }

  return clean || fallback;
}

/**
 * Validates and sanitizes imported workspace JSON payload.
 * Provides lenient backwards compatibility for legacy backups.
 */
export function validateWorkspacePayload(raw: any): WorkspaceImportResult {
  if (!raw || typeof raw !== 'object') {
    return { success: false, error: 'Imported payload must be a valid JSON object.' };
  }

  // Handle direct machines array import or structured workspace object
  if (Array.isArray(raw)) {
    return {
      success: true,
      data: {
        machines: raw.map((item: any) => sanitizeLabStudyFields(sanitizeObjectKeys(item))),
      },
      restoredCount: raw.length,
    };
  }

  // Handle nested or root payload structures
  const root = raw.data || raw;
  const machines = Array.isArray(root.machines) ? root.machines.map((item: any) => sanitizeLabStudyFields(sanitizeObjectKeys(item))) : [];

  const validatedData: Partial<WorkspaceExportPayload> = {
    version: typeof root.version === 'string' ? root.version : '2.0.0',
    exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : new Date().toISOString(),
    appBrand: typeof root.appBrand === 'string' ? root.appBrand : 'zerobox',
    machines,
    globalVars: root.globalVars && typeof root.globalVars === 'object' ? sanitizeObjectKeys(root.globalVars) : undefined,
    cheatsheets: Array.isArray(root.cheatsheets) ? root.cheatsheets.map((item: any) => sanitizeObjectKeys(item)) : undefined,
    activitySessions: Array.isArray(root.activitySessions) ? root.activitySessions.map((item: any) => sanitizeObjectKeys(item)) : undefined,
    customNotes: Array.isArray(root.customNotes) ? root.customNotes.map((item: any) => sanitizeObjectKeys(item)) : undefined,
    userNotes: Array.isArray(root.userNotes) ? root.userNotes.map((item: any) => sanitizeObjectKeys(item)) : undefined,
    userWikilinkMap: root.userWikilinkMap && typeof root.userWikilinkMap === 'object' ? sanitizeObjectKeys(root.userWikilinkMap) : undefined,
    deletedNoteIds: Array.isArray(root.deletedNoteIds) ? root.deletedNoteIds : undefined,
    userSolvesReset: Boolean(root.userSolvesReset),
    themePreset: typeof root.themePreset === 'string' ? root.themePreset : undefined,
    graphEdges: Array.isArray(root.graphEdges) ? root.graphEdges.map((item: any) => sanitizeObjectKeys(item)) : undefined,
    graphNodePositions: root.graphNodePositions && typeof root.graphNodePositions === 'object' && !Array.isArray(root.graphNodePositions) ? sanitizeObjectKeys(root.graphNodePositions) : undefined,
    credentials: Array.isArray(root.credentials) ? root.credentials.map((item: any) => sanitizeObjectKeys(item)) : undefined,
    credAttempts: Array.isArray(root.credAttempts) ? root.credAttempts.map((item: any) => sanitizeObjectKeys(item)) : undefined,
    lootItems: Array.isArray(root.lootItems) ? root.lootItems.map((item: any) => sanitizeObjectKeys(item)) : undefined,
    goals: parseBackupGoals(root.goals),
    examState: isPlainRecord(root.examState) ? sanitizeObjectKeys(root.examState) : undefined,
    indexedDb: parseBackupIndexedDb(root.indexedDb),
    checksum: root.checksum,
  };

  return {
    success: true,
    data: validatedData,
    restoredCount: machines.length,
  };
}

/**
 * Serializes workspace state to downloadable JSON string.
 */
export function exportWorkspaceToJson(state: {
  machines: Machine[];
  globalVars: GlobalVariables;
  cheatsheets: CheatsheetCommand[];
  activitySessions: ActivitySession[];
  customNotes?: any[];
  userNotes?: CptsNoteEntry[];
  userWikilinkMap?: Record<string, string>;
  deletedNoteIds?: string[];
  userSolvesReset?: boolean;
  themePreset?: string;
}): string {
  const payload: WorkspaceExportPayload = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    appBrand: 'zerobox',
    machines: state.machines,
    globalVars: state.globalVars,
    cheatsheets: state.cheatsheets,
    activitySessions: state.activitySessions,
    customNotes: state.customNotes || [],
    userNotes: state.userNotes || [],
    userWikilinkMap: state.userWikilinkMap || {},
    deletedNoteIds: state.deletedNoteIds || [],
    userSolvesReset: state.userSolvesReset || false,
    themePreset: state.themePreset || 'obsidian',
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Triggers a browser file download of the workspace JSON backup.
 */
export function triggerWorkspaceDownload(jsonString: string, filenamePrefix = 'zerobox-workspace') {
  if (typeof window === 'undefined') return;
  const safePrefix = sanitizeFilename(filenamePrefix, 'zerobox-workspace');
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${safePrefix}-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
