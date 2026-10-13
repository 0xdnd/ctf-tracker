import React from 'react';
import type { IpChange, IpClass, IpRole, IpSelection } from '../../utils/ipTemplatizer';
import { PLACEHOLDER_FOR_ROLE, defaultIpSelection } from '../../utils/ipTemplatizer';
import type { NoteTemplatePlan } from '../../utils/noteIpTemplating';

const CLASS_LABEL: Record<IpClass, string> = {
  target: 'Target',
  lhost: 'LHOST',
  ambiguous: 'Ambiguous',
  unknown: 'Review',
};

const CLASS_BADGE: Record<IpClass, string> = {
  target: 'bg-callout-success-bg text-callout-success-fg border-callout-success-border',
  lhost: 'bg-callout-info-bg text-callout-info-fg border-callout-info-border',
  ambiguous: 'bg-callout-warn-bg text-callout-warn-fg border-callout-warn-border',
  unknown: 'bg-surface-sunken text-secondary border-subtle',
};

export interface IpTemplatePreviewProps {
  plans: readonly NoteTemplatePlan[];
  selections: Record<string, IpSelection>;
  onChange: (next: Record<string, IpSelection>) => void;
  disabled?: boolean;
}

/** Count of IP replacements (occurrences) the current selections would make. */
export function countSelectedReplacements(
  plans: readonly NoteTemplatePlan[],
  selections: Record<string, IpSelection>
): { notes: number; occurrences: number } {
  let notes = 0;
  let occurrences = 0;
  for (const plan of plans) {
    const sel = selections[plan.noteId] || {};
    const n = plan.analysis.changes.reduce((acc, c) => acc + (sel[c.ip] ? c.count : 0), 0);
    if (n > 0) notes += 1;
    occurrences += n;
  }
  return { notes, occurrences };
}

interface RowProps {
  noteId: string;
  change: IpChange;
  value: IpRole | false;
  disabled?: boolean;
  onSet: (value: IpRole | false) => void;
}

const IpRow: React.FC<RowProps> = ({ noteId, change, value, disabled, onSet }) => {
  const checked = Boolean(value);
  const role: IpRole = value || change.role;
  const inputId = `tpl-${noteId}-${change.ip}`;
  return (
    <li
      className="flex flex-col gap-1 py-2 border-b border-subtle last:border-b-0"
      data-testid={`ip-row-${change.ip}`}
    >
      <div className="flex items-center gap-2 min-h-11 md:min-h-0 flex-wrap">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onSet(e.target.checked ? role : false)}
          className="w-4 h-4 accent-accent cursor-pointer"
          aria-label={`Replace ${change.ip} with ${PLACEHOLDER_FOR_ROLE[role]}`}
        />
        <label htmlFor={inputId} className="font-mono text-xs text-primary cursor-pointer">
          {change.ip}
        </label>
        <span
          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${CLASS_BADGE[change.ipClass]}`}
          title={change.reason}
        >
          {CLASS_LABEL[change.ipClass]}
        </span>
        <span className="text-[11px] text-muted tabular-nums">x{change.count}</span>
        <span className="text-[11px] text-muted hidden sm:inline">{change.reason}</span>
        <div
          role="group"
          aria-label={`Placeholder for ${change.ip}`}
          className="ml-auto flex items-center p-0.5 rounded-md bg-surface-hover border border-subtle text-[10px]"
        >
          {(['TARGET', 'LHOST'] as IpRole[]).map((r) => (
            <button
              key={r}
              type="button"
              disabled={disabled}
              aria-pressed={checked && role === r}
              onClick={() => onSet(r)}
              className={`min-h-11 md:min-h-0 px-2 py-0.5 rounded font-mono transition-interactive cursor-pointer ${
                checked && role === r
                  ? 'bg-accent-muted text-accent font-semibold border border-accent'
                  : 'text-muted hover:text-primary border border-transparent'
              }`}
            >
              {PLACEHOLDER_FOR_ROLE[r]}
            </button>
          ))}
        </div>
      </div>
      <code className="block text-[11px] font-mono text-secondary truncate" title={change.sampleLine}>
        {change.sampleLine}
      </code>
    </li>
  );
};

/**
 * Preview of proposed IP -> placeholder replacements, grouped per note and per
 * IP. Purely controlled: the parent owns `selections` and decides what to do
 * with them (apply to saved notes, or to freshly parsed import notes).
 */
export const IpTemplatePreview: React.FC<IpTemplatePreviewProps> = ({ plans, selections, onChange, disabled }) => {
  const setOne = (noteId: string, ip: string, value: IpRole | false) => {
    onChange({ ...selections, [noteId]: { ...(selections[noteId] || {}), [ip]: value } });
  };

  const setAll = (mode: 'defaults' | 'none') => {
    const next: Record<string, IpSelection> = {};
    for (const plan of plans) {
      next[plan.noteId] =
        mode === 'defaults'
          ? defaultIpSelection(plan.analysis.changes)
          : Object.fromEntries(plan.analysis.changes.map((c) => [c.ip, false]));
    }
    onChange(next);
  };

  if (plans.length === 0) {
    return (
      <p className="text-xs text-muted" data-testid="ip-template-empty">
        No hard-coded IPs found to replace.
      </p>
    );
  }

  const { notes, occurrences } = countSelectedReplacements(plans, selections);

  return (
    <div className="space-y-3" data-testid="ip-template-preview">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-secondary" data-testid="ip-template-summary">
          {occurrences} replacement{occurrences === 1 ? '' : 's'} in {notes} of {plans.length} note
          {plans.length === 1 ? '' : 's'}
        </span>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAll('defaults')}
            className="min-h-11 md:min-h-0 px-2 py-1 rounded-md border border-subtle text-secondary hover:text-primary hover:bg-surface-hover transition-interactive"
          >
            Suggested
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAll('none')}
            className="min-h-11 md:min-h-0 px-2 py-1 rounded-md border border-subtle text-secondary hover:text-primary hover:bg-surface-hover transition-interactive"
          >
            None
          </button>
        </div>
      </div>

      {plans.map((plan) => (
        <section
          key={plan.noteId}
          aria-label={`IPs in ${plan.title}`}
          className="rounded-lg border border-subtle bg-surface-sunken/40 px-3 py-1"
        >
          <h3 className="text-xs font-semibold text-primary pt-2 pb-1 truncate">{plan.title}</h3>
          <ul>
            {plan.analysis.changes.map((change) => (
              <IpRow
                key={change.ip}
                noteId={plan.noteId}
                change={change}
                value={(selections[plan.noteId] || {})[change.ip] ?? false}
                disabled={disabled}
                onSet={(v) => setOne(plan.noteId, change.ip, v)}
              />
            ))}
          </ul>
          {plan.analysis.kept.length > 0 && (
            <p className="text-[11px] text-muted pb-2">
              Kept as written: {plan.analysis.kept.map((k) => `${k.ip} (${k.reason})`).join(', ')}
            </p>
          )}
        </section>
      ))}
    </div>
  );
};
