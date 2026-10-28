/**
 * Note-level IP templating: plans {TARGET}/{LHOST} replacements for whole
 * notes (via the pure `ipTemplatizer`) and keeps undo pre-images in a local
 * IndexedDB store.
 *
 * Undo is conservative: each pre-image is stored with a hash of the content
 * the batch WROTE. Undo restores a note only while its current content still
 * hashes to that value, so a note edited after the batch is never clobbered;
 * it is reported as skipped instead.
 */
import type { CptsNoteEntry } from './obsidianManualUtils';
import { extractCommands, parseFrontmatterAndBody } from './markdownFrontmatter';
import {
  analyzeIps,
  applyIpTemplatize,
  defaultIpSelection,
  originalIpsFromSelection,
  recordOriginalIps,
  type IpSelection,
  type IpTemplatizeAnalysis,
} from './ipTemplatizer';
import { isSchemaWriteGated } from './schemaWriteGate';
import { useCtfStore } from '../store/useCtfStore';

export interface NoteTemplatePlan {
  noteId: string;
  title: string;
  rawMarkdown: string;
  analysis: IpTemplatizeAnalysis;
}

export interface PlanOptions {
  knownTargetIps?: readonly (string | undefined | null)[];
  lhost?: string | null;
}

/** Analyze each note; notes without any replaceable IP are left out. */
export function planNotesTemplating(notes: readonly CptsNoteEntry[], options: PlanOptions = {}): NoteTemplatePlan[] {
  const plans: NoteTemplatePlan[] = [];
  for (const note of notes) {
    const rawMarkdown = note.rawMarkdown || '';
    if (!rawMarkdown) continue;
    const analysis = analyzeIps(rawMarkdown, {
      knownTargetIps: options.knownTargetIps,
      lhost: options.lhost,
      commands: note.commands,
    });
    if (analysis.changes.length === 0) continue;
    plans.push({ noteId: note.id, title: note.title || note.titleEn || note.id, rawMarkdown, analysis });
  }
  return plans;
}

/** Default selection per note id. */
export function defaultPlanSelections(plans: readonly NoteTemplatePlan[]): Record<string, IpSelection> {
  const result: Record<string, IpSelection> = {};
  for (const plan of plans) result[plan.noteId] = defaultIpSelection(plan.analysis.changes);
  return result;
}

/** Commands are always re-derived from the markdown, never patched separately. */
export function deriveCommands(rawMarkdown: string): string[] {
  return extractCommands(parseFrontmatterAndBody(rawMarkdown).body);
}

/** New markdown for one plan + selection, or `null` when nothing is selected. */
export function templatedMarkdown(plan: NoteTemplatePlan, selection: IpSelection | undefined): string | null {
  if (!selection || !Object.values(selection).some(Boolean)) return null;
  const replaced = applyIpTemplatize(plan.rawMarkdown, plan.analysis, selection);
  if (replaced === plan.rawMarkdown) return null;
  return recordOriginalIps(replaced, originalIpsFromSelection(selection));
}

export interface NoteContentEdit {
  noteId: string;
  rawMarkdown: string;
}

/** Edits for every plan that has at least one selected IP. */
export function buildTemplateEdits(
  plans: readonly NoteTemplatePlan[],
  selections: Record<string, IpSelection>
): NoteContentEdit[] {
  const edits: NoteContentEdit[] = [];
  for (const plan of plans) {
    const next = templatedMarkdown(plan, selections[plan.noteId]);
    if (next !== null) edits.push({ noteId: plan.noteId, rawMarkdown: next });
  }
  return edits;
}

/** Apply selections to freshly parsed notes (import flow) — returns new note objects. */
export function templatizeParsedNotes(
  notes: readonly CptsNoteEntry[],
  plans: readonly NoteTemplatePlan[],
  selections: Record<string, IpSelection>
): CptsNoteEntry[] {
  const edits = new Map(buildTemplateEdits(plans, selections).map((e) => [e.noteId, e.rawMarkdown]));
  if (edits.size === 0) return notes.slice();
  return notes.map((note) => {
    const rawMarkdown = edits.get(note.id);
    if (rawMarkdown === undefined) return note;
    return { ...note, rawMarkdown, commands: deriveCommands(rawMarkdown) };
  });
}

/** FNV-1a 32-bit + length. Change detection only — not a security primitive. */
export function hashContent(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16)}-${text.length}`;
}

// ---------------------------------------------------------------------------
// Undo batches (local IndexedDB only, never synced)
// ---------------------------------------------------------------------------

export interface TemplateUndoEntry {
  noteId: string;
  title: string;
  /** Markdown before the batch. */
  before: string;
  /** Hash of the markdown the batch wrote. */
  afterHash: string;
}

export interface TemplateUndoBatch {
  id: string;
  createdAt: string;
  entries: TemplateUndoEntry[];
}

const DB_NAME = 'zerobox_note_templating_db';
const DB_VERSION = 1;
const STORE_NAME = 'undo_batches';
const BATCHES_KEY = 'batches';

/** Undo history is per profile: `batches:<profileId>`. */
function batchesKey(): string {
  return `${BATCHES_KEY}:${useCtfStore.getState().currentProfileId || 'guest'}`;
}
export const MAX_UNDO_BATCHES = 10;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

async function readBatches(key: string): Promise<TemplateUndoBatch[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const value = req.result as TemplateUndoBatch[] | undefined;
        resolve(Array.isArray(value) ? value : []);
      };
      req.onerror = () => reject(req.error || new Error('Failed to read undo batches'));
      tx.oncomplete = () => db.close();
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

async function writeBatches(batches: TemplateUndoBatch[], key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err?: unknown) => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch { /* already closed */ }
      if (err) reject(err);
      else resolve();
    };
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => done();
      tx.onerror = () => done(tx.error || new Error('Failed to save undo batches'));
      tx.onabort = () => done(tx.error || new Error('Saving undo batches was aborted'));
      tx.objectStore(STORE_NAME).put(batches, key);
    } catch (err) {
      done(err || new Error('Failed to save undo batches'));
    }
  });
}

function newBatchId(): string {
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Persist pre-images for a batch BEFORE the edits are written, so a crash
 * between the two never leaves an edit without its undo record.
 * Returns `null` when writes are schema-gated (nothing is stored).
 */
export async function saveUndoBatch(
  edits: readonly NoteContentEdit[],
  beforeById: Record<string, { title: string; rawMarkdown: string }>
): Promise<TemplateUndoBatch | null> {
  if (isSchemaWriteGated()) return null;
  const batch: TemplateUndoBatch = {
    id: newBatchId(),
    createdAt: new Date().toISOString(),
    entries: edits
      .filter((e) => beforeById[e.noteId])
      .map((e) => ({
        noteId: e.noteId,
        title: beforeById[e.noteId].title,
        before: beforeById[e.noteId].rawMarkdown,
        afterHash: hashContent(e.rawMarkdown),
      })),
  };
  const key = batchesKey();
  const existing = await readBatches(key).catch(() => [] as TemplateUndoBatch[]);
  await writeBatches([batch, ...existing].slice(0, MAX_UNDO_BATCHES), key);
  return batch;
}

/** Most recent batch first. */
export async function listUndoBatches(): Promise<TemplateUndoBatch[]> {
  try {
    return await readBatches(batchesKey());
  } catch (err) {
    console.warn('[ZeroBox] Could not read IP templating undo history', err);
    return [];
  }
}

export async function deleteUndoBatch(batchId: string): Promise<void> {
  if (isSchemaWriteGated()) return;
  const key = batchesKey();
  const existing = await readBatches(key);
  await writeBatches(existing.filter((b) => b.id !== batchId), key);
}

export interface UndoPlan {
  restore: NoteContentEdit[];
  /** Notes edited (or removed) since the batch — left as they are. */
  skipped: { noteId: string; title: string; reason: 'edited' | 'missing' }[];
}

/** Decide which notes of a batch can be restored, given the notes as they are now. */
export function planUndo(batch: TemplateUndoBatch, currentNotes: readonly CptsNoteEntry[]): UndoPlan {
  const byId = new Map(currentNotes.map((n) => [n.id, n]));
  const plan: UndoPlan = { restore: [], skipped: [] };
  for (const entry of batch.entries) {
    const current = byId.get(entry.noteId);
    if (!current) {
      plan.skipped.push({ noteId: entry.noteId, title: entry.title, reason: 'missing' });
    } else if (hashContent(current.rawMarkdown || '') !== entry.afterHash) {
      plan.skipped.push({ noteId: entry.noteId, title: entry.title, reason: 'edited' });
    } else {
      plan.restore.push({ noteId: entry.noteId, rawMarkdown: entry.before });
    }
  }
  return plan;
}
