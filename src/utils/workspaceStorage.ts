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
        machines: raw,
      },
      restoredCount: raw.length,
    };
  }

  // Handle nested or root payload structures
  const root = raw.data || raw;
  const machines = Array.isArray(root.machines) ? root.machines : [];

  const validatedData: Partial<WorkspaceExportPayload> = {
    version: typeof root.version === 'string' ? root.version : '2.0.0',
    exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : new Date().toISOString(),
    appBrand: typeof root.appBrand === 'string' ? root.appBrand : 'zerobox',
    machines,
    globalVars: root.globalVars && typeof root.globalVars === 'object' ? root.globalVars : undefined,
    cheatsheets: Array.isArray(root.cheatsheets) ? root.cheatsheets : undefined,
    activitySessions: Array.isArray(root.activitySessions) ? root.activitySessions : undefined,
    customNotes: Array.isArray(root.customNotes) ? root.customNotes : undefined,
    userNotes: Array.isArray(root.userNotes) ? root.userNotes : undefined,
    userWikilinkMap: root.userWikilinkMap && typeof root.userWikilinkMap === 'object' ? root.userWikilinkMap : undefined,
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
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenamePrefix}-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
