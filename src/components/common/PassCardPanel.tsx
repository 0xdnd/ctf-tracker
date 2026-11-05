import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';
import { playCyberSound } from '../../utils/helpers';
import {
  DEFAULT_PASS_STAT_TOGGLES,
  PASS_CARD_HEIGHT,
  PASS_CARD_WIDTH,
  PASS_EXAMS,
  PASS_EXAM_NAMES,
  PASS_STAT_KEYS,
  PASS_STAT_LABELS,
  buildPassCardData,
  buildPassSummaryText,
  computePassLocalStats,
  defaultPassExam,
  describePassCard,
  drawPassCard,
  formatPassStatValues,
  type PassCardPalette,
  type PassExam,
  type PassStatKey,
  type PassStatToggles,
} from '../../utils/passCard';

// Resolve an "R G B" CSS custom property to a canvas-safe rgb() string.
const cssRgb = (name: string, fallback: string): string => {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const parts = raw.split(/\s+/).map(Number);
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    }
  } catch {
    /* fall through to the fallback */
  }
  return fallback;
};

// Tokens that follow the current theme preset and light/dark mode.
const readPalette = (): PassCardPalette => ({
  bg: cssRgb('--surface-card', 'rgb(18, 18, 21)'),
  panel: cssRgb('--surface-sunken', 'rgb(12, 12, 15)'),
  line: cssRgb('--border-strong', 'rgb(63, 63, 70)'),
  text: cssRgb('--text-primary', 'rgb(244, 244, 245)'),
  muted: cssRgb('--text-muted', 'rgb(161, 161, 170)'),
  accent: cssRgb('--border-accent', 'rgb(14, 165, 233)'),
});

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type CopyStatus = 'idle' | 'copied' | 'error';

export const PassCardPanel: React.FC = () => {
  const { machines, activitySessions, soundEnabled, themePreset } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      activitySessions: s.activitySessions,
      soundEnabled: s.soundEnabled,
      themePreset: s.themePreset,
    })),
  );
  const examTrack = useExamStore((s) => s.track);

  const id = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exam, setExam] = useState<PassExam>(() => defaultPassExam(examTrack));
  const [passDate, setPassDate] = useState('');
  const [stats, setStats] = useState<PassStatToggles>(DEFAULT_PASS_STAT_TOGGLES);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  // Bumped when the theme class or preset attribute on <html> changes, so the card redraws.
  const [themeTick, setThemeTick] = useState(0);

  const local = useMemo(() => computePassLocalStats(machines, activitySessions), [machines, activitySessions]);
  const data = useMemo(() => buildPassCardData({ exam, passDate, stats }, local), [exam, passDate, stats, local]);
  const summary = useMemo(() => buildPassSummaryText(data), [data]);
  const statValues = useMemo(() => formatPassStatValues(local), [local]);

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(() => setThemeTick((t) => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      canvas.width = PASS_CARD_WIDTH;
      canvas.height = PASS_CARD_HEIGHT;
      drawPassCard(ctx, data, readPalette());
    };
    draw();
    // Redraw once web fonts are in so the first paint does not keep fallback metrics.
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    fonts?.ready?.then(draw).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [data, themePreset, themeTick]);

  useEffect(() => {
    if (copyStatus !== 'copied') return;
    const t = setTimeout(() => setCopyStatus('idle'), 2500);
    return () => clearTimeout(t);
  }, [copyStatus]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `ZeroBox-${data.exam}-passed-${passDate || todayKey()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (soundEnabled) playCyberSound('root');
  };

  const handleCopyText = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(summary);
      setCopyStatus('copied');
      if (soundEnabled) playCyberSound('copy');
    } catch {
      setCopyStatus('error');
    }
  };

  const toggleStat = (key: PassStatKey) => setStats((prev) => ({ ...prev, [key]: !prev[key] }));

  const examLegendId = `${id}-exam`;
  const statsLegendId = `${id}-stats`;
  const dateId = `${id}-date`;
  const summaryId = `${id}-summary`;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          {/* Options first in reading order; beside the preview on wide screens */}
          <div className="space-y-4 lg:order-2 text-sm">
            <fieldset aria-labelledby={examLegendId} className="space-y-2">
              <legend id={examLegendId} className="text-xs font-medium text-secondary">Exam</legend>
              <div className="grid grid-cols-2 gap-2">
                {PASS_EXAMS.map((code) => (
                  <label
                    key={code}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 max-sm:py-3 cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                      exam === code ? 'border-accent bg-surface-sunken text-primary' : 'border-subtle text-secondary hover:border-strong'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${id}-exam`}
                      value={code}
                      checked={exam === code}
                      onChange={() => setExam(code)}
                      className="accent-accent"
                    />
                    <span className="font-mono font-medium" title={PASS_EXAM_NAMES[code]}>{code}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor={dateId} className="block text-xs font-medium text-secondary">
                Pass date (optional)
              </label>
              <input
                id={dateId}
                type="date"
                value={passDate}
                max={todayKey()}
                onChange={(e) => setPassDate(e.target.value)}
                className="w-full rounded-lg border border-subtle bg-surface-sunken px-3 py-2 max-sm:py-3 text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <fieldset aria-labelledby={statsLegendId} className="space-y-2">
              <legend id={statsLegendId} className="text-xs font-medium text-secondary">Stats on the card</legend>
              {PASS_STAT_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 py-0.5 max-sm:py-2 text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stats[key]}
                    onChange={() => toggleStat(key)}
                    className="accent-accent w-4 h-4"
                  />
                  <span>{PASS_STAT_LABELS[key]}</span>
                  <span className="ml-auto text-muted tabular-nums font-mono text-xs">{statValues[key]}</span>
                </label>
              ))}
            </fieldset>
          </div>

          <div className="space-y-3 lg:order-1 min-w-0">
            <div className="w-full rounded-xl border border-subtle overflow-hidden bg-surface-card">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={describePassCard(data)}
                className="w-full h-auto block"
                style={{ aspectRatio: `${PASS_CARD_WIDTH} / ${PASS_CARD_HEIGHT}` }}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={summaryId} className="block text-xs font-medium text-secondary">Summary text</label>
              <textarea
                id={summaryId}
                readOnly
                value={summary}
                rows={4}
                className="w-full resize-none rounded-lg border border-subtle bg-surface-sunken px-3 py-2 text-xs text-primary font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
            <p className="text-muted text-xs">
              The image and text are made on this device. Nothing is uploaded.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-surface-card border-t border-subtle flex flex-wrap items-center gap-2.5 text-xs">
        <button
          type="button"
          onClick={handleDownload}
          className="px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-accent text-on-accent font-medium hover:brightness-110 transition-[transform,filter] active:scale-[0.97] flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Download PNG</span>
        </button>
        <button
          type="button"
          onClick={() => { void handleCopyText(); }}
          className="px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-surface-card border border-subtle hover:border-strong text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1.5"
        >
          {copyStatus === 'copied' ? (
            <Check className="w-4 h-4 text-callout-success-fg" aria-hidden="true" />
          ) : (
            <Copy className="w-4 h-4" aria-hidden="true" />
          )}
          <span>Copy text</span>
        </button>
        <p role="status" aria-live="polite" className="text-xs min-h-[1rem]">
          {copyStatus === 'copied' && <span className="text-callout-success-fg font-medium">Summary copied</span>}
          {copyStatus === 'error' && (
            <span className="text-callout-danger-fg font-medium">Could not copy. Select the summary text and copy it.</span>
          )}
        </p>
      </div>
    </>
  );
};
