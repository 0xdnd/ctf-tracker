import React, { useId, useMemo, useState } from 'react';
import {
  calculateOscpPoints,
  emptyOscpInput,
  scoringModeForStart,
  OSCP_AD_MACHINE_POINTS,
  OSCP_LOCAL_POINTS,
  OSCP_MAX_POINTS,
  OSCP_PASS_MARK,
  OSCP_PROOF_POINTS,
  OSCP_SCALED_MAX,
  OSCP_SCALED_MIN,
  OSCP_SCALED_PASS_SCORE,
  type OscpCalculatorInput,
  type OscpScoringMode,
} from '../../utils/oscpPointsCalculator';

// Official sources for the rules encoded in src/utils/oscpPointsCalculator.ts (checked 2026-11-05).
const SOURCES: [string, string][] = [
  ['https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide', 'OffSec OSCP+ Exam Guide'],
  ['https://help.offsec.com/hc/en-us/articles/4412170923924-OSCP-Exam-FAQ', 'OffSec OSCP+ Exam FAQ'],
  ['https://help.offsec.com/hc/en-us/articles/54589877508884-OSCP-Equated-Scaled-Scoring-FAQ', 'OffSec OSCP+ Equated Scaled Scoring FAQ'],
];

const cardClass = 'rounded-2xl border border-subtle bg-surface-card p-4 machined-edge';
const legendClass = 'text-sm font-semibold text-primary';
const optionClass =
  'flex min-h-[44px] items-center gap-3 rounded-lg border border-subtle bg-surface-sunken px-3 py-2 text-sm text-secondary cursor-pointer has-[:checked]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent';
const inputClass = 'h-4 w-4 flex-shrink-0 rounded border-strong bg-surface-sunken text-accent focus:ring-0';

export interface OscpPointsCalculatorProps {
  /** Override the default scoring mode (otherwise picked from today's date). */
  initialMode?: OscpScoringMode;
}

export const OscpPointsCalculator: React.FC<OscpPointsCalculatorProps> = ({ initialMode }) => {
  const uid = useId();
  const [mode, setMode] = useState<OscpScoringMode>(() => initialMode ?? scoringModeForStart(Date.now()));
  const [state, setState] = useState<OscpCalculatorInput>(emptyOscpInput);
  const result = useMemo(() => calculateOscpPoints(state, mode), [state, mode]);

  const toggleStandalone = (index: number, key: 'local' | 'proof') =>
    setState((s) => ({
      ...s,
      standalones: s.standalones.map((m, i) => (i === index ? { ...m, [key]: !m[key] } : m)),
    }));
  const toggleAd = (index: number) => setState((s) => ({ ...s, ad: s.ad.map((v, i) => (i === index ? !v : v)) }));

  const fixed = result.mode === 'fixed';
  const summary = fixed
    ? result.passed
      ? `${result.total} of ${OSCP_MAX_POINTS} points. Reaches the ${OSCP_PASS_MARK} point pass mark.`
      : `${result.total} of ${OSCP_MAX_POINTS} points. ${result.pointsNeeded} more needed to reach ${OSCP_PASS_MARK}.`
    : `${result.total} of ${OSCP_MAX_POINTS} raw points. Pass or fail is not shown for scaled scoring.`;

  return (
    <div className="space-y-4" data-testid="oscp-points-calculator">
      <fieldset className={cardClass}>
        <legend className={`${legendClass} px-1`}>Exam start time</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className={optionClass}>
            <input
              type="radio"
              name={`${uid}-mode`}
              className={inputClass}
              checked={mode === 'fixed'}
              onChange={() => setMode('fixed')}
              data-testid="oscp-calc-mode-fixed"
            />
            <span>Before 1 December 2026, 08:00 GMT (pass mark {OSCP_PASS_MARK} points)</span>
          </label>
          <label className={optionClass}>
            <input
              type="radio"
              name={`${uid}-mode`}
              className={inputClass}
              checked={mode === 'scaled'}
              onChange={() => setMode('scaled')}
              data-testid="oscp-calc-mode-scaled"
            />
            <span>On or after 1 December 2026, 08:00 GMT (scaled score)</span>
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <fieldset className={cardClass}>
          <legend className={`${legendClass} px-1`}>Active Directory set (40 points)</legend>
          <p className="mt-1 text-xs text-muted">Each machine in the set scores on its own.</p>
          <div className="mt-3 space-y-2">
            {OSCP_AD_MACHINE_POINTS.map((pts, i) => (
              <label key={i} className={optionClass}>
                <input
                  type="checkbox"
                  className={inputClass}
                  checked={state.ad[i]}
                  onChange={() => toggleAd(i)}
                  data-testid={`oscp-calc-ad-${i + 1}`}
                />
                <span className="flex-1">Machine {i + 1} compromised</span>
                <span className="font-mono tabular-nums text-xs text-muted">{pts} pts</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-4">
          {state.standalones.map((m, i) => (
            <fieldset key={i} className={cardClass}>
              <legend className={`${legendClass} px-1`}>Standalone machine {i + 1} (20 points)</legend>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className={optionClass}>
                  <input
                    type="checkbox"
                    className={inputClass}
                    checked={m.local}
                    onChange={() => toggleStandalone(i, 'local')}
                    data-testid={`oscp-calc-sa-${i + 1}-local`}
                  />
                  <span className="flex-1">local.txt</span>
                  <span className="font-mono tabular-nums text-xs text-muted">{OSCP_LOCAL_POINTS} pts</span>
                </label>
                <label className={optionClass}>
                  <input
                    type="checkbox"
                    className={inputClass}
                    checked={m.proof}
                    onChange={() => toggleStandalone(i, 'proof')}
                    data-testid={`oscp-calc-sa-${i + 1}-proof`}
                  />
                  <span className="flex-1">proof.txt</span>
                  <span className="font-mono tabular-nums text-xs text-muted">{OSCP_PROOF_POINTS} pts</span>
                </label>
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <section className={cardClass} aria-labelledby={`${uid}-result`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`${uid}-result`} className={legendClass}>
            Result
          </h2>
          <button
            type="button"
            onClick={() => setState(emptyOscpInput())}
            className="min-h-[44px] rounded-lg border border-subtle px-3 text-xs font-medium text-secondary hover:text-primary hover:border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            data-testid="oscp-calc-reset"
          >
            Clear all
          </button>
        </div>

        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-3xl font-semibold font-mono tabular-nums text-primary" data-testid="oscp-calc-total">
            {result.total}
          </span>
          <span className="text-sm text-muted">/ {OSCP_MAX_POINTS} raw points</span>
          {fixed && (
            <span
              className={`text-sm font-semibold ${result.passed ? 'text-callout-success-fg' : 'text-callout-warn-fg'}`}
              data-testid="oscp-calc-verdict"
            >
              {result.passed ? 'Pass' : 'Not yet'}
            </span>
          )}
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {summary}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-surface-sunken px-3 py-2">
            <dt className="text-muted">Active Directory</dt>
            <dd className="font-mono tabular-nums text-primary">{result.adPoints} / 40</dd>
          </div>
          <div className="rounded-lg bg-surface-sunken px-3 py-2">
            <dt className="text-muted">Standalones</dt>
            <dd className="font-mono tabular-nums text-primary">{result.standalonePoints} / 60</dd>
          </div>
        </dl>

        <div className="mt-3 space-y-2 text-sm text-secondary" data-testid="oscp-calc-needed">
          {fixed && result.passed && (
            <p>You have reached the {OSCP_PASS_MARK} point pass mark. Points still count only when they are documented in your report.</p>
          )}
          {fixed && !result.passed && (
            <>
              <p>
                <strong className="font-semibold text-primary">{result.pointsNeeded} more points</strong> to reach {OSCP_PASS_MARK}. The fewest
                remaining items that get you there:
              </p>
              <ul className="list-disc space-y-0.5 pl-5">
                {result.fewestToPass.map((item) => (
                  <li key={item.id}>
                    {item.label} <span className="font-mono tabular-nums text-muted">({item.points} pts)</span>
                  </li>
                ))}
              </ul>
              {result.adPoints === 0 && (
                <p className="text-xs text-muted">
                  Without Active Directory points the most you can score is 60, so a pass needs at least 10 Active Directory points.
                </p>
              )}
            </>
          )}
          {!fixed && (
            <>
              <p>
                For exams starting on or after 1 December 2026, 08:00 GMT, OffSec converts raw points to a scaled score from{' '}
                {OSCP_SCALED_MIN} to {OSCP_SCALED_MAX}, and {OSCP_SCALED_PASS_SCORE} passes. The raw points needed depend on your exam set
                and are not published, so this calculator does not show pass or fail.
              </p>
              <p>
                <strong className="font-semibold text-primary">{result.remaining} raw points</strong> are still open.
              </p>
            </>
          )}
          {result.openItems.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer py-1 text-secondary">All open items ({result.openItems.length})</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {result.openItems.map((item) => (
                  <li key={item.id}>
                    {item.label} ({item.points} pts)
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      <p className="text-xs text-muted">
        Rules from{' '}
        {SOURCES.map(([href, label], i) => (
          <React.Fragment key={href}>
            {i > 0 && (i === SOURCES.length - 1 ? ' and ' : ', ')}
            <a href={href} rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">
              {label}
            </a>
          </React.Fragment>
        ))}
        , checked 5 November 2026. No bonus points exist for the OSCP+ exam. ZeroBox is not affiliated with OffSec.
      </p>
    </div>
  );
};

export default OscpPointsCalculator;
