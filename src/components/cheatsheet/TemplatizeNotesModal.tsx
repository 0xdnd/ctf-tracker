import React, { useEffect, useState } from 'react';
import { Wand2, Undo2, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../common/Modal';
import { useCtfStore } from '../../store/useCtfStore';
import { useActiveTargetIp } from '../../hooks/useActiveTargetIp';
import { mergeUserNotePools, type CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { IpSelection } from '../../utils/ipTemplatizer';
import {
  buildTemplateEdits,
  defaultPlanSelections,
  deleteUndoBatch,
  listUndoBatches,
  planNotesTemplating,
  planUndo,
  saveUndoBatch,
  type NoteTemplatePlan,
  type TemplateUndoBatch,
} from '../../utils/noteIpTemplating';
import { playCyberSound } from '../../utils/helpers';
import { IpTemplatePreview, countSelectedReplacements } from './IpTemplatePreview';

export interface TemplatizeNotesModalProps {
  open: boolean;
  onClose: () => void;
  /** Notes in scope (one note from the workspace, or the whole vault). */
  noteIds: readonly string[];
  /** Short scope label for the title, e.g. the note title or "vault". */
  scopeLabel: string;
}

type Feedback = { type: 'success' | 'error'; message: string } | null;

function allNotes(): CptsNoteEntry[] {
  const s = useCtfStore.getState();
  return mergeUserNotePools(s.customNotes, s.userNotes);
}

function describeSkipped(skipped: { title: string; reason: 'edited' | 'missing' }[]): string {
  if (skipped.length === 0) return '';
  const names = skipped.map((s) => `${s.title} (${s.reason === 'edited' ? 'edited since' : 'no longer exists'})`);
  return ` Skipped ${skipped.length}: ${names.join(', ')}.`;
}

/**
 * Preview -> apply -> undo flow for replacing hard-coded IPs in saved notes
 * (imported vault notes and authored notes) with {TARGET} / {LHOST}.
 */
export const TemplatizeNotesModal: React.FC<TemplatizeNotesModalProps> = ({ open, onClose, noteIds, scopeLabel }) => {
  const { globalVars, applyNoteContentBatch, soundEnabled } = useCtfStore(
    useShallow((s) => ({
      globalVars: s.globalVars,
      applyNoteContentBatch: s.applyNoteContentBatch,
      soundEnabled: s.soundEnabled,
    }))
  );
  const activeTargetIp = useActiveTargetIp();

  const [plans, setPlans] = useState<NoteTemplatePlan[]>([]);
  const [selections, setSelections] = useState<Record<string, IpSelection>>({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [lastBatch, setLastBatch] = useState<TemplateUndoBatch | null>(null);

  // Snapshot the plan when the dialog opens; later store updates (our own apply) must not re-plan underneath the user.
  const scopeKey = noteIds.join('|');
  useEffect(() => {
    if (!open) return;
    const scope = new Set(noteIds);
    const next = planNotesTemplating(
      allNotes().filter((n) => scope.has(n.id)),
      { knownTargetIps: [activeTargetIp, globalVars.targetIp], lhost: globalVars.lhost }
    );
    setPlans(next);
    setSelections(defaultPlanSelections(next));
    setFeedback(null);
    let cancelled = false;
    listUndoBatches().then((batches) => {
      if (!cancelled) setLastBatch(batches[0] || null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-plan only when opened or the scope changes
  }, [open, scopeKey]);

  if (!open) return null;

  const { occurrences } = countSelectedReplacements(plans, selections);

  const handleApply = async () => {
    // Drop notes whose content changed since the preview was built.
    const current = new Map(allNotes().map((n) => [n.id, n.rawMarkdown || '']));
    const fresh = plans.filter((p) => current.get(p.noteId) === p.rawMarkdown);
    const edits = buildTemplateEdits(fresh, selections);
    if (edits.length === 0) {
      setFeedback({ type: 'error', message: 'Nothing to replace (the notes may have changed since the preview).' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const beforeById = Object.fromEntries(fresh.map((p) => [p.noteId, { title: p.title, rawMarkdown: p.rawMarkdown }]));
      // Undo pre-images are written first; if that fails nothing is changed.
      const batch = await saveUndoBatch(edits, beforeById);
      const res = await applyNoteContentBatch(edits);
      if (batch) setLastBatch(batch);
      if (soundEnabled) playCyberSound('flag');
      const stale = plans.length - fresh.length;
      setFeedback({
        type: 'success',
        message:
          `Replaced IPs in ${res.updated.length} note${res.updated.length === 1 ? '' : 's'}.` +
          (stale > 0 ? ` ${stale} changed since the preview and were left alone.` : '') +
          (batch ? ' You can undo this below.' : ''),
      });
      setPlans([]);
      setSelections({});
    } catch (err) {
      if (soundEnabled) playCyberSound('toggle');
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Could not save the notes.' });
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!lastBatch) return;
    setBusy(true);
    setFeedback(null);
    try {
      const plan = planUndo(lastBatch, allNotes());
      if (plan.restore.length > 0) await applyNoteContentBatch(plan.restore);
      await deleteUndoBatch(lastBatch.id);
      setLastBatch(null);
      if (soundEnabled) playCyberSound('click');
      setFeedback({
        type: plan.restore.length > 0 ? 'success' : 'error',
        message: `Restored ${plan.restore.length} note${plan.restore.length === 1 ? '' : 's'}.${describeSkipped(plan.skipped)}`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Undo failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} labelledBy="templatize-notes-title" size="2xl" zIndex="modalNested">
      <div className="flex flex-col max-h-[85dvh] min-h-0">
        <div className="px-5 py-3 border-b border-subtle flex items-center gap-3">
          <Wand2 size={18} className="text-accent shrink-0" />
          <div className="min-w-0">
            <h2 id="templatize-notes-title" className="text-sm font-semibold text-primary truncate">
              Replace IPs with placeholders · {scopeLabel}
            </h2>
            <p className="text-[11px] text-muted">
              Hard-coded IPs become <code className="font-mono">{'{TARGET}'}</code> /{' '}
              <code className="font-mono">{'{LHOST}'}</code> so commands follow the current target.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ml-auto min-h-11 min-w-11 md:min-h-0 md:min-w-0 p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-interactive flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {feedback && (
            <div
              role="status"
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
                  : 'bg-callout-danger-bg border-callout-danger-border text-callout-danger-fg'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
              <span>{feedback.message}</span>
            </div>
          )}
          <IpTemplatePreview plans={plans} selections={selections} onChange={setSelections} disabled={busy} />
        </div>

        <div className="px-5 py-3 border-t border-subtle flex items-center gap-2 flex-wrap">
          {lastBatch && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={busy}
              className="min-h-11 md:min-h-0 px-3 py-1.5 rounded-lg border border-subtle text-xs text-secondary hover:text-primary hover:bg-surface-hover transition-interactive flex items-center gap-1.5 disabled:opacity-40"
              title={`Templated ${lastBatch.entries.length} note(s) on ${new Date(lastBatch.createdAt).toLocaleString()}`}
            >
              <Undo2 size={13} />
              <span>Undo last replacement ({lastBatch.entries.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto min-h-11 md:min-h-0 px-3 py-1.5 rounded-lg text-xs text-secondary hover:text-primary hover:bg-surface-hover transition-interactive"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={busy || occurrences === 0}
            className="min-h-11 md:min-h-0 px-3 py-1.5 rounded-lg bg-accent text-on-accent text-xs font-semibold hover:brightness-105 transition-interactive flex items-center gap-1.5 disabled:opacity-40"
          >
            {busy ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
            <span>Replace {occurrences > 0 ? occurrences : ''} IP{occurrences === 1 ? '' : 's'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
