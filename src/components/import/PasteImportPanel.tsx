import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ClipboardPaste, Plus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import { playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { extractCandidateNames, matchCandidateNamesToCatalog, suggestCatalogMatches } from '../../utils/bulkPwnImporter';
import type { Machine, Platform } from '../../types';

export const SAMPLE_SOLVED_LIST = 'Lame, Forest, Sauna, Shocker, Blue, Jerry, Legacy, Devel';

const PLATFORM_CHOICES: { value: '' | Platform; label: string }[] = [
  { value: '', label: 'Any platform' },
  { value: 'HTB', label: 'Hack The Box' },
  { value: 'THM', label: 'TryHackMe' },
  { value: 'PG', label: 'Proving Grounds' },
  { value: 'VulnHub', label: 'VulnHub' },
];

const isSolved = (m: Pick<Machine, 'status'>) => m.status === 'root' || m.status === 'completed';

interface PasteImportPanelProps {
  /** Called after the import has been applied, with the number of boxes newly marked solved. */
  onApplied?: (count: number) => void;
  /** Focus the text box on mount. */
  focusOnMount?: boolean;
  /** When given, shows a "Skip" button that lets a first-time visitor close the card without importing. */
  onSkip?: () => void;
  className?: string;
}

/** Paste a list of solved boxes, review what matched, then apply. Nothing changes until Apply is pressed. */
export const PasteImportPanel: React.FC<PasteImportPanelProps> = ({ onApplied, focusOnMount, onSkip, className = '' }) => {
  const uid = useId();
  const { machines, batchUpdateMachineStatus, loadCatalog, soundEnabled } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      batchUpdateMachineStatus: s.batchUpdateMachineStatus,
      loadCatalog: s.loadCatalog,
      soundEnabled: s.soundEnabled,
    }))
  );
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState<'' | Platform>('');
  // Boxes the visitor picked from "did you mean", keyed by the unmatched name they resolve.
  const [picked, setPicked] = useState<Record<string, string>>({});
  // Preview runs the matcher on an example list and never writes; the visitor's own text stays in `text`.
  const [preview, setPreview] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const focusAfterToggle = useRef(false);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);
  useEffect(() => {
    if (focusOnMount) textRef.current?.focus();
  }, [focusOnMount]);
  useEffect(() => {
    if (!focusAfterToggle.current) return;
    focusAfterToggle.current = false;
    if (preview) backRef.current?.focus();
    else textRef.current?.focus();
  }, [preview]);

  const shownText = preview ? SAMPLE_SOLVED_LIST : text;
  const activePicked = useMemo<Record<string, string>>(() => (preview ? {} : picked), [preview, picked]);
  const prefer = platform || undefined;
  const candidates = useMemo(() => extractCandidateNames(shownText), [shownText]);
  const result = useMemo(
    () => matchCandidateNamesToCatalog(candidates, machines, { preferPlatform: prefer }),
    [candidates, machines, prefer]
  );

  const machineById = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);
  const matchedIds = useMemo(() => new Set(result.allMatches.map((m) => m.machineId)), [result]);

  // Rows for the review list: automatic matches first, then the ones picked from suggestions.
  const rows = useMemo(() => {
    const out: { id: string; machine: Machine; raw: string; picked: boolean }[] = [];
    for (const m of result.allMatches) {
      const machine = machineById.get(m.machineId);
      if (machine) out.push({ id: machine.id, machine, raw: m.rawInput, picked: false });
    }
    for (const [raw, id] of Object.entries(activePicked)) {
      const machine = machineById.get(id);
      if (machine && result.unmatched.includes(raw) && !matchedIds.has(id)) {
        out.push({ id, machine, raw, picked: true });
      }
    }
    return out;
  }, [result, activePicked, machineById, matchedIds]);

  const unmatched = useMemo(
    () => result.unmatched.filter((raw) => !(raw in activePicked && machineById.has(activePicked[raw]))),
    [result, activePicked, machineById]
  );
  const suggestions = useMemo(
    () => new Map(unmatched.map((raw) => [raw, suggestCatalogMatches(raw, machines, 3, { preferPlatform: prefer })])),
    [unmatched, machines, prefer]
  );

  const newRows = rows.filter((r) => !isSolved(r.machine));
  const alreadyCount = rows.length - newRows.length;
  const countsLabel = `${newRows.length} new, ${alreadyCount} already solved, ${unmatched.length} unmatched`;

  const updateText = (value: string) => {
    setText(value);
    setPicked({});
  };

  const togglePreview = (on: boolean) => {
    focusAfterToggle.current = true;
    setPreview(on);
  };

  const apply = () => {
    if (preview || newRows.length === 0) return;
    batchUpdateMachineStatus(newRows.map((r) => ({ machineId: r.id, status: 'completed' as const })));
    triggerRootCelebration();
    if (soundEnabled) playCyberSound('root');
    const all = useCtfStore.getState().machines;
    const solved = all.filter(isSolved).length;
    useToastStore.getState().addToast({
      type: 'success',
      title: `${newRows.length} ${newRows.length === 1 ? 'box' : 'boxes'} marked solved`,
      message: `Progress: ${solved} of ${all.length} solved.`,
    });
    setText('');
    setPicked({});
    onApplied?.(newRows.length);
  };

  const fieldId = `${uid}-names`;
  const platformId = `${uid}-platform`;

  return (
    <section
      aria-labelledby={`${uid}-title`}
      data-testid="paste-import-panel"
      data-tour="import-panel"
      className={`rounded-2xl border border-subtle bg-surface-card p-4 sm:p-5 space-y-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <ClipboardPaste className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id={`${uid}-title`} className="text-sm font-semibold text-primary">Import your solved boxes</h2>
          <p className="text-xs text-secondary mt-0.5">
            Paste the names of boxes you have already finished. You review the matches before anything changes.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-1">
          <label htmlFor={fieldId} className="text-xs font-medium text-secondary">Box names, one per line or separated by commas</label>
          <textarea
            id={fieldId}
            ref={textRef}
            rows={4}
            value={shownText}
            readOnly={preview}
            onChange={(e) => {
              if (!preview) updateText(e.target.value);
            }}
            placeholder={'e.g.\nLame\nForest\nSauna'}
            className="w-full p-3 rounded-xl bg-surface-sunken border border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-y font-mono"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={platformId} className="text-xs font-medium text-secondary">Platform for names without one</label>
          <select
            id={platformId}
            value={platform}
            onChange={(e) => setPlatform(e.target.value as '' | Platform)}
            className="w-full h-10 px-2 rounded-xl bg-surface-sunken border border-subtle text-sm text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {PLATFORM_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {preview ? (
            <button
              ref={backRef}
              type="button"
              onClick={() => togglePreview(false)}
              className="text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded min-h-6 [@media(pointer:coarse)]:min-h-11"
            >
              Back to my list
            </button>
          ) : (
            <button
              type="button"
              onClick={() => togglePreview(true)}
              className="text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded min-h-6 [@media(pointer:coarse)]:min-h-11"
            >
              Preview with an example
            </button>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-medium text-secondary">Review ({rows.length})</h3>
          <ul aria-label="Matched boxes" className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-lg bg-surface-sunken border border-subtle">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-xs">
                <span className="px-1.5 rounded border border-subtle bg-surface-card text-[11px] font-semibold text-secondary">{r.machine.platform}</span>
                <span className="font-semibold text-primary">{r.machine.name}</span>
                <span className="text-muted">{r.machine.difficulty}</span>
                <span className="ml-auto text-muted">
                  {preview
                    ? 'Example only'
                    : isSolved(r.machine) ? 'Already solved' : r.picked ? 'Will be marked solved (your pick)' : 'Will be marked solved'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-medium text-secondary">Not found ({unmatched.length})</h3>
          <ul aria-label="Names not found" className="space-y-1.5 p-2 rounded-lg bg-callout-warn-bg border border-callout-warn-border">
            {unmatched.map((raw) => {
              const options = suggestions.get(raw) ?? [];
              return (
                <li key={raw} className="flex flex-wrap items-center gap-1.5 text-xs text-callout-warn-fg">
                  <span className="font-semibold">{raw}</span>
                  {options.length > 0 ? (
                    <>
                      <span className="text-muted">Did you mean</span>
                      {options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          disabled={preview}
                          onClick={() => setPicked((p) => ({ ...p, [raw]: o.id }))}
                          aria-label={`Add ${o.name} (${o.platform}) in place of ${raw}`}
                          className="inline-flex items-center gap-1 px-2 min-h-7 rounded-md border border-subtle bg-surface-card text-primary hover:bg-surface-hover disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11"
                        >
                          <Plus className="w-3 h-3" aria-hidden="true" />
                          <span>{o.name}</span>
                          <span className="text-muted">{o.platform}</span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <span className="text-muted">No close match</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-subtle">
        <p role="status" aria-live="polite" className="text-xs text-secondary">
          {preview
            ? 'This is an example. Paste your own list to import.'
            : text.trim()
              ? newRows.length === 0 ? 'No new boxes to mark yet.' : 'Nothing changes until you press Apply.'
              : 'Nothing to import yet.'}
        </p>
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:flex-col-reverse">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded min-h-6 px-1 [@media(pointer:coarse)]:min-h-11"
          >
            Skip, I&apos;m starting fresh
          </button>
        )}
        <button
          type="button"
          onClick={apply}
          disabled={preview || newRows.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-sm font-medium bg-accent hover:brightness-110 text-on-accent disabled:opacity-40 disabled:cursor-not-allowed transition-[filter,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent max-sm:w-full [@media(pointer:coarse)]:h-11"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
          <span>{preview ? 'Preview only: nothing is saved' : text.trim() ? `Apply: ${countsLabel}` : 'Apply import'}</span>
        </button>
        </div>
      </div>
    </section>
  );
};

export default PasteImportPanel;
