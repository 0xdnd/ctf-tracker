import React, { useId, useMemo } from 'react';
import type { BurndownSeries } from '../../utils/examBurndown';

/**
 * ExamBurndownChart
 * Raw-SVG burn-down / velocity chart for the Exam Simulator.
 *
 * Layers:
 *  - StaticLayer  (memoized on `series`): grid, axes, ideal pace, pass threshold,
 *    actual step line and event markers. Never re-renders on the 1Hz tick.
 *  - NowLayer     (cheap): hold-line from the last step to "now" + now marker.
 *
 * All colors are theme tokens (CSS variables), so light/dark and presets just work.
 */

const W = 480;
const H = 180;
const M = { l: 32, r: 52, t: 14, b: 26 };
const PLOT_W = W - M.l - M.r;
const PLOT_H = H - M.t - M.b;

const COLOR = {
  accent: 'rgb(var(--border-accent))',
  success: 'rgb(var(--callout-success-fg))',
  grid: 'rgb(var(--border-subtle))',
  axis: 'rgb(var(--border-strong))',
  ink: 'rgb(var(--text-primary))',
  muted: 'rgb(var(--text-muted))',
  surface: 'rgb(var(--surface-card))',
} as const;

const TEXT_STYLE: React.CSSProperties = {
  fill: COLOR.muted,
  fontSize: 10,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontVariantNumeric: 'tabular-nums',
};

export interface ExamBurndownChartProps {
  series: BurndownSeries;
  /** Epoch ms of the "now" marker (updates every tick) */
  nowMs: number;
  /** Live score (matches the HUD score card) */
  currentPoints: number;
  /** Seconds left on the exam clock */
  remainingSeconds: number;
  className?: string;
}

function formatTimeLeft(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m left`;
  if (h > 0) return `${h}h left`;
  return `${m}m left`;
}

function formatElapsed(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

interface Scale {
  x: (t: number) => number;
  y: (p: number) => number;
  tMax: number;
  yMax: number;
}

function buildScale(series: BurndownSeries, extraPoints: number): Scale {
  const lastStep = series.steps[series.steps.length - 1];
  const tMax = Math.max(
    series.expiresAt ?? lastStep?.t ?? series.startedAt,
    series.startedAt + 1
  );
  const peak = Math.max(series.passThreshold, extraPoints, ...series.steps.map((p) => p.points));
  const yMax = Math.max(10, Math.ceil((peak * 1.1) / 10) * 10);
  const span = tMax - series.startedAt;
  return {
    tMax,
    yMax,
    x: (t) => M.l + (Math.min(Math.max(t, series.startedAt), tMax) - series.startedAt) / span * PLOT_W,
    y: (p) => M.t + PLOT_H - (Math.min(Math.max(p, 0), yMax) / yMax) * PLOT_H,
  };
}

const StaticLayer = React.memo(function StaticLayer({ series, scale }: { series: BurndownSeries; scale: Scale }) {
  const { x, y, tMax, yMax } = scale;
  const { steps, ideal, passThreshold, startedAt } = series;

  const stepPath = steps
    .map((p, i) => (i === 0 ? `M${x(p.t)} ${y(p.points)}` : `H${x(p.t)}V${y(p.points)}`))
    .join('');

  const yTicks = [0, 0.5, 1].map((f) => Math.round(yMax * f));
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => startedAt + (tMax - startedAt) * f);

  return (
    <g>
      {/* Grid + y labels */}
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? COLOR.axis : COLOR.grid} strokeWidth={1} />
          <text x={M.l - 6} y={y(v) + 3} textAnchor="end" style={TEXT_STYLE}>{v}</text>
        </g>
      ))}
      {/* x labels */}
      {xTicks.map((t, i) => (
        <text
          key={`x${i}`}
          x={x(t)}
          y={H - 8}
          textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
          style={TEXT_STYLE}
        >
          {`${Math.round((t - startedAt) / 3600000)}h`}
        </text>
      ))}

      {/* Pass threshold */}
      <line x1={M.l} x2={W - M.r} y1={y(passThreshold)} y2={y(passThreshold)} stroke={COLOR.success} strokeWidth={1.5} />
      <text x={W - M.r + 6} y={y(passThreshold) + 3} style={{ ...TEXT_STYLE, fill: COLOR.success }}>
        {`PASS ${passThreshold}`}
      </text>

      {/* Ideal pace */}
      <line
        x1={x(ideal[0].t)}
        y1={y(ideal[0].points)}
        x2={x(ideal[1].t)}
        y2={y(ideal[1].points)}
        stroke={COLOR.muted}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />

      {/* Actual step line */}
      <path d={stepPath} fill="none" stroke={COLOR.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* Event markers (skip the zero origin point) */}
      {steps.slice(1).map((p) => (
        <circle
          key={p.t}
          cx={x(p.t)}
          cy={y(p.points)}
          r={4}
          fill={COLOR.accent}
          stroke={COLOR.surface}
          strokeWidth={2}
        >
          <title>{`${formatElapsed(p.t - startedAt)} elapsed: ${p.points} pts, ${p.remainingToPass} to pass`}</title>
        </circle>
      ))}
    </g>
  );
});

function LegendSwatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width="18" height="6" aria-hidden="true" focusable="false" className="flex-shrink-0">
      <line x1="0" x2="18" y1="3" y2="3" stroke={color} strokeWidth={2} strokeDasharray={dashed ? '4 3' : undefined} />
    </svg>
  );
}

export const ExamBurndownChart: React.FC<ExamBurndownChartProps> = ({
  series,
  nowMs,
  currentPoints,
  remainingSeconds,
  className = '',
}) => {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  // Scale only depends on the series (and the live score, which only moves on events).
  const scale = useMemo(() => buildScale(series, currentPoints), [series, currentPoints]);

  const remainingToPass = Math.max(0, series.passThreshold - currentPoints);
  const timeLeft = formatTimeLeft(remainingSeconds);
  const summary = `${currentPoints} of ${series.passThreshold} points, ${remainingToPass} remaining, ${timeLeft}`;

  const lastStep = series.steps[series.steps.length - 1];
  const nowX = scale.x(nowMs);
  const nowY = scale.y(currentPoints);
  const holdFromX = Math.min(scale.x(lastStep.t), nowX);
  const holdY = scale.y(lastStep.points);
  const nowLabelAnchor = nowX > W - M.r - 36 ? 'end' : 'start';
  const nowLabelX = nowLabelAnchor === 'end' ? nowX - 6 : nowX + 6;

  return (
    <div className={className} data-testid="exam-burndown-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        aria-describedby={descId}
        data-testid="exam-burndown-svg"
        className="w-full h-auto block"
      >
        <title id={titleId}>Exam burn-down chart</title>
        <desc id={descId}>
          {`Points scored over exam time against the ${series.passThreshold}-point pass threshold and an ideal pace line. ${summary}.`}
        </desc>

        <StaticLayer series={series} scale={scale} />

        {/* Live layer: only this part follows the 1Hz tick */}
        <g data-testid="exam-burndown-now">
          <line
            x1={holdFromX}
            x2={nowX}
            y1={holdY}
            y2={holdY}
            stroke={COLOR.accent}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={nowX}
            x2={nowX}
            y1={M.t}
            y2={M.t + PLOT_H}
            stroke={COLOR.ink}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <circle cx={nowX} cy={nowY} r={4} fill={COLOR.ink} stroke={COLOR.surface} strokeWidth={2} />
          <text x={nowLabelX} y={M.t + 8} textAnchor={nowLabelAnchor} style={{ ...TEXT_STYLE, fill: COLOR.ink }}>
            NOW
          </text>
        </g>
      </svg>

      {/* Legend: identity never relies on color alone */}
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted" aria-label="Chart legend">
        <li className="flex items-center gap-1.5"><LegendSwatch color={COLOR.accent} /><span>Actual score</span></li>
        <li className="flex items-center gap-1.5"><LegendSwatch color={COLOR.muted} dashed /><span>Ideal pace</span></li>
        <li className="flex items-center gap-1.5"><LegendSwatch color={COLOR.success} /><span>Pass threshold</span></li>
      </ul>

      {/* Visually-hidden data table fallback */}
      <table className="sr-only" data-testid="exam-burndown-table">
        <caption>Exam score over time. {summary}.</caption>
        <thead>
          <tr>
            <th scope="col">Elapsed</th>
            <th scope="col">Points</th>
            <th scope="col">Remaining to pass</th>
          </tr>
        </thead>
        <tbody>
          {series.steps.map((p) => (
            <tr key={p.t}>
              <th scope="row">{formatElapsed(p.t - series.startedAt)}</th>
              <td>{p.points}</td>
              <td>{p.remainingToPass}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">{`Now (${formatElapsed(Math.min(nowMs, scale.tMax) - series.startedAt)})`}</th>
            <td>{currentPoints}</td>
            <td>{remainingToPass}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ExamBurndownChart;
