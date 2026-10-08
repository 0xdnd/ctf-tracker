import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Pencil, Trash2, Check, Bug } from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { useProofImage } from '../../hooks/useProofImage';
import type { ExamBox, ScreenshotProof } from '../../utils/examComplianceUtils';
import { FINDING_SEVERITIES, type Finding, type FindingSeverity } from '../../types/findings';
import { calculateCvssScore, scoreToSeverity } from '../../utils/cvss';

const SEVERITY_BADGE: Record<FindingSeverity, string> = {
  critical: 'bg-callout-danger-bg text-callout-danger-fg border-callout-danger-border',
  high: 'bg-callout-danger-bg text-callout-danger-fg border-callout-danger-border',
  medium: 'bg-callout-warn-bg text-callout-warn-fg border-callout-warn-border',
  low: 'bg-callout-info-bg text-callout-info-fg border-callout-info-border',
  info: 'bg-surface-sunken text-secondary border-subtle',
};

const FIELD_CLASS =
  'w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-primary focus:outline-none focus:border-accent text-xs';
const LABEL_CLASS = 'text-[11px] text-muted mb-1 block';
const CHECKBOX_CLASS =
  'rounded border-subtle bg-surface-card accent-[rgb(var(--border-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';
const GHOST_BTN =
  'px-2.5 py-1.5 rounded-lg border border-subtle bg-surface-card hover:bg-surface-hover text-primary text-xs font-semibold inline-flex items-center gap-1.5 transition-[transform,background-color,border-color,color] active:scale-[0.97]';

const SeverityBadge: React.FC<{ severity: FindingSeverity }> = ({ severity }) => (
  <span className={`text-[11px] px-1.5 py-0.5 rounded border font-semibold uppercase ${SEVERITY_BADGE[severity]}`}>
    {severity}
  </span>
);

const EvidenceOption: React.FC<{
  shot: ScreenshotProof;
  flag: 'user' | 'root';
  checked: boolean;
  onToggle: () => void;
}> = ({ shot, flag, checked, onToggle }) => {
  const { src } = useProofImage(shot.imageRef, shot.dataUrl);
  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs text-secondary">
      <input
        type="checkbox"
        data-testid={`finding-evidence-${shot.id}`}
        checked={checked}
        onChange={onToggle}
        className={CHECKBOX_CLASS}
      />
      {src && <img src={src} alt="" className="w-8 h-8 object-cover rounded border border-subtle" />}
      <span>
        {flag} proof: {shot.caption || 'Screenshot'}
      </span>
    </label>
  );
};

const boxScreenshots = (box: ExamBox) =>
  ([['user', box.userProof], ['root', box.rootProof]] as const).flatMap(([flag, proof]) =>
    (proof?.screenshots || []).map((shot) => ({ flag, shot }))
  );

const FindingForm: React.FC<{ finding: Finding; boxes: ExamBox[]; onDone: () => void }> = ({
  finding,
  boxes,
  onDone,
}) => {
  const updateFinding = useExamStore((s) => s.updateFinding);
  const uid = `finding-${finding.id}`;
  const patch = (p: Partial<Omit<Finding, 'id'>>) => updateFinding(finding.id, p);

  const vector = finding.cvssVector || '';
  const score = vector.trim() ? calculateCvssScore(vector) : null;
  const vectorInvalid = vector.trim().length > 0 && score === null;

  const onVectorChange = (value: string) => {
    const computed = value.trim() ? calculateCvssScore(value) : null;
    if (computed === null) {
      patch({ cvssVector: value || undefined, cvssScore: undefined });
    } else {
      patch({ cvssVector: value.trim(), cvssScore: computed, severity: scoreToSeverity(computed) });
    }
  };

  const toggleHost = (box: ExamBox) => {
    const selected = finding.affectedHosts.includes(box.name);
    if (selected) {
      const boxShotIds = new Set(boxScreenshots(box).map(({ shot }) => shot.id));
      patch({
        affectedHosts: finding.affectedHosts.filter((h) => h !== box.name),
        evidenceRefs: finding.evidenceRefs.filter((id) => !boxShotIds.has(id)),
      });
    } else {
      patch({ affectedHosts: [...finding.affectedHosts, box.name] });
    }
  };

  const toggleEvidence = (id: string) =>
    patch({
      evidenceRefs: finding.evidenceRefs.includes(id)
        ? finding.evidenceRefs.filter((e) => e !== id)
        : [...finding.evidenceRefs, id],
    });

  const selectedBoxes = boxes.filter((b) => finding.affectedHosts.includes(b.name));

  return (
    <div className="p-3 rounded-lg bg-surface-card border border-subtle space-y-3" data-testid="finding-form">
      <div>
        <label htmlFor={`${uid}-title`} className={LABEL_CLASS}>
          Title
        </label>
        <input
          id={`${uid}-title`}
          data-testid="finding-title"
          type="text"
          value={finding.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={FIELD_CLASS}
          placeholder="Unauthenticated RCE in web upload handler"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-cvss`} className={LABEL_CLASS}>
            CVSS v3.1 base vector
          </label>
          <input
            id={`${uid}-cvss`}
            data-testid="finding-cvss-vector"
            type="text"
            value={vector}
            onChange={(e) => onVectorChange(e.target.value)}
            aria-invalid={vectorInvalid}
            aria-describedby={`${uid}-cvss-result`}
            className={`${FIELD_CLASS} font-mono`}
            placeholder="AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
            spellCheck={false}
          />
          <p
            id={`${uid}-cvss-result`}
            data-testid="finding-cvss-result"
            role="status"
            className={`mt-1 text-[11px] ${vectorInvalid ? 'text-callout-danger-fg' : 'text-muted'}`}
          >
            {vectorInvalid
              ? 'Invalid vector: all eight base metrics (AV/AC/PR/UI/S/C/I/A) are required.'
              : score !== null
                ? `Score ${score.toFixed(1)} (${scoreToSeverity(score)})`
                : 'Optional. Severity is derived from a valid vector.'}
          </p>
        </div>
        <div>
          <label htmlFor={`${uid}-severity`} className={LABEL_CLASS}>
            Severity
          </label>
          <select
            id={`${uid}-severity`}
            data-testid="finding-severity"
            value={finding.severity}
            disabled={score !== null}
            onChange={(e) => patch({ severity: e.target.value as FindingSeverity })}
            className={`${FIELD_CLASS} capitalize disabled:opacity-70`}
          >
            {FINDING_SEVERITIES.map((sev) => (
              <option key={sev} value={sev}>
                {sev}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-1.5">
        <legend className={LABEL_CLASS}>Affected hosts</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {boxes.map((box) => (
            <label key={box.id} className="flex items-center gap-2 cursor-pointer text-xs text-secondary">
              <input
                type="checkbox"
                data-testid={`finding-host-${box.id}`}
                checked={finding.affectedHosts.includes(box.name)}
                onChange={() => toggleHost(box)}
                className={CHECKBOX_CLASS}
              />
              <span>
                {box.name} <span className="font-mono text-muted">({box.ip})</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {(['description', 'impact', 'remediation'] as const).map((field) => (
        <div key={field}>
          <label htmlFor={`${uid}-${field}`} className={`${LABEL_CLASS} capitalize`}>
            {field}
          </label>
          <textarea
            id={`${uid}-${field}`}
            data-testid={`finding-${field}`}
            rows={field === 'description' ? 3 : 2}
            value={finding[field] || ''}
            onChange={(e) => patch({ [field]: e.target.value })}
            className={FIELD_CLASS}
          />
        </div>
      ))}

      <fieldset className="space-y-1.5">
        <legend className={LABEL_CLASS}>Evidence (proof screenshots of the affected hosts)</legend>
        {selectedBoxes.length === 0 ? (
          <p className="text-[11px] text-muted">Select an affected host to attach its proof screenshots.</p>
        ) : (
          selectedBoxes.map((box) => {
            const shots = boxScreenshots(box);
            return (
              <div key={box.id} className="space-y-1">
                <div className="text-[11px] font-semibold text-secondary">{box.name}</div>
                {shots.length === 0 ? (
                  <p className="text-[11px] text-muted">No proof screenshots captured for this box yet.</p>
                ) : (
                  shots.map(({ flag, shot }) => (
                    <EvidenceOption
                      key={shot.id}
                      shot={shot}
                      flag={flag}
                      checked={finding.evidenceRefs.includes(shot.id)}
                      onToggle={() => toggleEvidence(shot.id)}
                    />
                  ))
                )}
              </div>
            );
          })
        )}
      </fieldset>

      <div className="flex justify-end">
        <button type="button" data-testid="finding-done" onClick={onDone} className={GHOST_BTN}>
          <Check className="w-3.5 h-3.5 text-accent" />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};

export const ExamFindingsEditor: React.FC<{ boxes: ExamBox[] }> = ({ boxes }) => {
  const { findings, addFinding, deleteFinding } = useExamStore(
    useShallow((s) => ({ findings: s.findings, addFinding: s.addFinding, deleteFinding: s.deleteFinding }))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const list = findings || [];

  return (
    <section
      aria-labelledby="exam-findings-heading"
      data-testid="exam-findings-editor"
      className="p-4 rounded-xl bg-surface-sunken border border-subtle space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="exam-findings-heading" className="text-xs font-semibold text-secondary flex items-center gap-1.5">
          <Bug className="w-3.5 h-3.5 text-accent" />
          <span>2. Findings ({list.length})</span>
        </h3>
        <button
          type="button"
          data-testid="finding-add-btn"
          onClick={() => setEditingId(addFinding())}
          className={GHOST_BTN}
        >
          <Plus className="w-3.5 h-3.5 text-accent" />
          <span>Add finding</span>
        </button>
      </div>

      {list.length === 0 && (
        <p className="text-[11px] text-muted">
          No findings yet. Findings appear in the report as a severity-sorted summary table plus detailed sections.
        </p>
      )}

      <ul className="space-y-2">
        {list.map((f) => (
          <li key={f.id} data-testid={`finding-row-${f.id}`}>
            {editingId === f.id ? (
              <FindingForm finding={f} boxes={boxes} onDone={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-card border border-subtle">
                <div className="flex flex-wrap items-center gap-2 min-w-0 text-xs">
                  <SeverityBadge severity={f.severity} />
                  <span className="text-primary font-medium truncate">{f.title || 'Untitled finding'}</span>
                  {typeof f.cvssScore === 'number' && (
                    <span className="font-mono text-muted tabular-nums">CVSS {f.cvssScore.toFixed(1)}</span>
                  )}
                  {f.affectedHosts.length > 0 && <span className="text-muted">{f.affectedHosts.join(', ')}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid={`finding-edit-${f.id}`}
                    onClick={() => setEditingId(f.id)}
                    aria-label={`Edit finding ${f.title || 'Untitled finding'}`}
                    className={GHOST_BTN}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  {confirmDeleteId === f.id ? (
                    <button
                      type="button"
                      data-testid={`finding-delete-confirm-${f.id}`}
                      onClick={() => {
                        deleteFinding(f.id);
                        setConfirmDeleteId(null);
                      }}
                      onBlur={() => setConfirmDeleteId(null)}
                      autoFocus
                      className={`${GHOST_BTN} !border-callout-danger-border !text-callout-danger-fg`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm delete</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid={`finding-delete-${f.id}`}
                      onClick={() => setConfirmDeleteId(f.id)}
                      aria-label={`Delete finding ${f.title || 'Untitled finding'}`}
                      className={GHOST_BTN}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
