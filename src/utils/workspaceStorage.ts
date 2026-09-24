import { Machine, CheatsheetCommand, GlobalVariables, ActivitySession } from '../types';
import { CptsNoteEntry } from './obsidianManualUtils';

export interface WorkspaceExportPayload {
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
        machines: raw.map((item: any) => sanitizeObjectKeys(item)),
      },
      restoredCount: raw.length,
    };
  }

  // Handle nested or root payload structures
  const root = raw.data || raw;
  const machines = Array.isArray(root.machines) ? root.machines.map((item: any) => sanitizeObjectKeys(item)) : [];

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
