import React, { useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Flame,
  Award,
  Clock,
  Target,
  ShieldCheck,
  Radar,
  Zap,
  Calendar
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { formatSeconds, formatDurationHuman } from '../../utils/helpers';
import { Difficulty, Platform } from '../../types';
import { classifyMachine } from '../../utils/categoryUtils';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { PageHeader } from '../common/PageHeader';
import { buildHeatmapWeeks, toLocalDateKey, WEEKDAY_LONG, WEEKDAY_SHORT, type HeatLevel } from '../../utils/analyticsHeatmap';

// Theme-token paint for SVG attributes (Tailwind has no stroke/fill utilities for the text/border token sets).
const RADAR_GRID_STYLE: React.CSSProperties = { stroke: 'rgb(var(--border-strong))' };
const RADAR_LABEL_STYLE: React.CSSProperties = { fill: 'rgb(var(--text-muted))' };

const CARD = 'p-5 rounded-2xl border border-subtle bg-surface-card machined-edge';

const TIER_COLOR: Record<Difficulty, string> = {
  'Very Easy': 'bg-diff-very-easy',
  Easy: 'bg-diff-easy',
  Medium: 'bg-diff-medium',
  Hard: 'bg-diff-hard',
  Insane: 'bg-diff-insane',
};

// Sequential intensity ramp: one hue (accent) at increasing opacity.
const HEAT_CLASS: Record<HeatLevel, string> = {
  0: 'bg-surface-sunken border-subtle',
  1: 'bg-accent/30 border-accent/40',
  2: 'bg-accent/60 border-accent/70',
  3: 'bg-accent border-accent',
};

const CELL_BASE =
  'block w-4 h-4 rounded-xs border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface-card';

interface ActivityHeatmapProps {
  counts: Record<string, number>;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ counts }) => {
  const grid = useMemo(() => buildHeatmapWeeks(counts), [counts]);
  const cellRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const lastCell = grid.cells[grid.cells.length - 1];
  const active = grid.cells.find((c) => c.date === activeDate) ?? lastCell;

  const focusCell = (date: string) => {
    setActiveDate(date);
    cellRefs.current[date]?.focus();
  };

  // Walk in a direction, skipping padding slots, until a real cell is found.
  const findCell = (row: number, col: number, dRow: number, dCol: number) => {
    let r = row + dRow;
    let c = col + dCol;
    while (r >= 0 && r < 7 && c >= 0 && c < grid.weekCount) {
      const cell = grid.rows[r][c];
      if (cell) return cell;
      r += dRow;
      c += dCol;
    }
    return null;
  };

  const onKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    let target = null;
    switch (e.key) {
      case 'ArrowRight': target = findCell(row, col, 0, 1); break;
      case 'ArrowLeft': target = findCell(row, col, 0, -1); break;
      case 'ArrowDown': target = findCell(row, col, 1, 0); break;
      case 'ArrowUp': target = findCell(row, col, -1, 0); break;
      case 'Home': target = findCell(row, -1, 0, 1); break;
      case 'End': target = findCell(row, grid.weekCount, 0, -1); break;
      default: return;
    }
    e.preventDefault();
    if (target) focusCell(target.date);
  };

  return (
    <>
      <div className="overflow-x-auto py-2">
        <div
          role="grid"
          aria-label="Activity heatmap, past 90 days. Use arrow keys to move between days."
          aria-rowcount={7}
          aria-colcount={grid.weekCount}
          className="inline-flex flex-col gap-1"
        >
          {grid.rows.map((weekRow, r) => (
            <div key={WEEKDAY_SHORT[r]} role="row" className="flex items-center gap-1">
              <span
                role="rowheader"
                aria-label={WEEKDAY_LONG[r]}
                className="w-8 text-[11px] text-muted"
              >
                {r % 2 === 0 ? WEEKDAY_SHORT[r] : ''}
              </span>
              {weekRow.map((cell, c) =>
                cell ? (
                  <span
                    key={cell.date}
                    ref={(el) => { cellRefs.current[cell.date] = el; }}
                    role="gridcell"
                    tabIndex={cell.date === active.date ? 0 : -1}
                    aria-label={cell.label}
                    title={cell.label}
                    data-date={cell.date}
                    data-level={cell.level}
                    onKeyDown={(e) => onKeyDown(e, r, c)}
                    onFocus={() => setActiveDate(cell.date)}
                    className={`${CELL_BASE} ${HEAT_CLASS[cell.level]}`}
                  />
                ) : (
                  <span
                    key={`pad-${r}-${c}`}
                    aria-hidden="true"
                    data-placeholder="true"
                    className="block w-4 h-4"
                  />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted pt-1">
        <span>90 days ago</span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span>Less</span>
          {([0, 1, 2, 3] as HeatLevel[]).map((lvl) => (
            <span key={lvl} className={`block w-3 h-3 rounded-xs border ${HEAT_CLASS[lvl]}`} />
          ))}
          <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </>
  );
};

export const AnalyticsView: React.FC = () => {
  const machines = useCtfStore((s) => s.machines);
  const activitySessions = useCtfStore((s) => s.activitySessions);
  const radarId = useId();
  const radarTitleId = `${radarId}-title`;
  const radarDescId = `${radarId}-desc`;

  // Completed / Rooted machines
  const rootedMachines = useMemo(() => {
    return machines.filter((m) => m.status === 'root' || m.status === 'completed');
  }, [machines]);

  const footholdsCount = useMemo(() => {
    return machines.filter((m) => m.status === 'foothold').length;
  }, [machines]);

  // Overall time metrics
  const totalSecondsTracked = useMemo(() => {
    return machines.reduce((acc, m) => acc + (m.timeSpentSeconds || 0), 0);
  }, [machines]);

  // Average time to user and root
  const avgTimeToUser = useMemo(() => {
    const list = machines.filter((m) => m.timeToUserSeconds && m.timeToUserSeconds > 0);
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, m) => acc + (m.timeToUserSeconds || 0), 0);
    return Math.round(sum / list.length);
  }, [machines]);

  const avgTimeToRoot = useMemo(() => {
    const list = machines.filter((m) => m.timeToRootSeconds && m.timeToRootSeconds > 0);
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, m) => acc + (m.timeToRootSeconds || 0), 0);
    return Math.round(sum / list.length);
  }, [machines]);

  // Skill Radar Dimensions Calculation based on classified categories of pwned boxes
  const skillDimensions = useMemo(() => {
    const dimensions = [
      { key: 'Web Exploitation', categoryIds: ['Web', 'SQLi', 'RCE', 'File Upload', 'LFI', 'SSRF', 'SSTI', 'Deserialization', 'IDOR', 'API & GraphQL', 'XXE', 'CMS Exploits', 'XSS'] },
      { key: 'Active Directory', categoryIds: ['Active Directory', 'ADCS'] },
      { key: 'Linux PrivEsc', categoryIds: ['Linux PrivEsc', 'Kernel Exploits'] },
      { key: 'Windows PrivEsc', categoryIds: ['Windows PrivEsc'] },
      { key: 'Network & Pivoting', categoryIds: ['Network / SMB', 'Pivoting'] },
      { key: 'Binary / BOF', categoryIds: ['Binary / BOF', 'Reverse Engineering', 'Cryptography'] },
    ];

    return dimensions.map((dim) => {
      let score = 0;
      rootedMachines.forEach((m) => {
        const res = classifyMachine(m);
        const hasMatchingCat = dim.categoryIds.some((cid) => res.categories.includes(cid));
        if (hasMatchingCat) score += 1;
      });
      const normalized = Math.min(100, Math.max(10, score * 15));
      return {
        name: dim.key,
        score: normalized,
        rawCount: score,
      };
    });
  }, [rootedMachines]);

  // Difficulty Tier Progress Matrix
  const tiers: Difficulty[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
  const difficultyMatrix = useMemo(() => {
    return tiers.map((tier) => {
      const totalInTier = machines.filter((m) => m.difficulty === tier).length;
      const rootedInTier = rootedMachines.filter((m) => m.difficulty === tier).length;
      const pct = totalInTier > 0 ? Math.round((rootedInTier / totalInTier) * 100) : 0;
      return {
        tier,
        total: totalInTier,
        rooted: rootedInTier,
        percentage: pct,
      };
    });
  }, [machines, rootedMachines]);

  // Platform Distribution
  const platformStats = useMemo(() => {
    const platforms: Platform[] = ['HTB', 'THM', 'Custom'];
    return platforms.map((p) => {
      const total = machines.filter((m) => m.platform === p).length;
      const rooted = rootedMachines.filter((m) => m.platform === p).length;
      return { platform: p, total, rooted };
    });
  }, [machines, rootedMachines]);

  // SVG Radar Chart Math Generator
  const renderRadarChart = () => {
    const size = 320;
    const center = size / 2;
    const radius = 110;
    const angleStep = (Math.PI * 2) / skillDimensions.length;
    const levels = [0.25, 0.5, 0.75, 1.0];
    const summary = skillDimensions
      .map((d) => `${d.name} ${d.score}% (${d.rawCount} ${d.rawCount === 1 ? 'pwn' : 'pwns'})`)
      .join(', ');

    const points = skillDimensions.map((dim, i) => {
      const r = (dim.score / 100) * radius;
      const angle = i * angleStep - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg
        viewBox="-70 -10 460 340"
        className="mx-auto w-full max-w-[460px] h-auto overflow-visible"
        role="img"
        aria-labelledby={`${radarTitleId} ${radarDescId}`}
      >
        <title id={radarTitleId}>Offensive skill radar</title>
        <desc id={radarDescId}>{`Skill score per attack vector, from 0 to 100 percent: ${summary}.`}</desc>

        {levels.map((lvl) => {
          const webPoints = skillDimensions.map((_, i) => {
            const r = radius * lvl;
            const angle = i * angleStep - Math.PI / 2;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={lvl}
              points={webPoints}
              fill="none"
              style={RADAR_GRID_STYLE}
              strokeOpacity={lvl === 1 ? 1 : 0.6}
              strokeWidth="1"
            />
          );
        })}

        {skillDimensions.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              style={RADAR_GRID_STYLE}
              strokeWidth="1"
            />
          );
        })}

        {/* Animated Radar Polygon */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          points={points}
          className="fill-accent/20 stroke-accent"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <g aria-hidden="true">
          {skillDimensions.map((dim, i) => {
            const r = (dim.score / 100) * radius;
            const angle = i * angleStep - Math.PI / 2;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);

            const labelRadius = radius + 18;
            const lx = center + labelRadius * Math.cos(angle);
            const ly = center + labelRadius * Math.sin(angle);
            const cos = Math.cos(angle);
            const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';

            return (
              <g key={i}>
                <motion.circle
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  cx={x}
                  cy={y}
                  r="4"
                  className="fill-accent"
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  dominantBaseline="central"
                  style={RADAR_LABEL_STYLE}
                  fontSize="11"
                >
                  {dim.name} ({dim.score}%)
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  // Activity heatmap counts (past 90 days): study-timer sessions plus machine user/root pwn dates.
  const heatmapCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of activitySessions) {
      counts[s.date] = (counts[s.date] || 0) + 1;
    }
    for (const m of machines) {
      for (const stamp of [m.rootPwnedAt, m.userPwnedAt]) {
        if (!stamp) continue;
        const parsed = new Date(stamp);
        if (Number.isNaN(parsed.getTime())) continue;
        const d = toLocalDateKey(parsed);
        counts[d] = (counts[d] || 0) + 1;
      }
    }
    return counts;
  }, [activitySessions, machines]);

  const kpis = [
    { label: 'Total pwned', val: `${rootedMachines.length} / ${machines.length}`, icon: Award, sub: `${machines.length > 0 ? Math.round((rootedMachines.length / machines.length) * 100) : 0}% catalog completed` },
    { label: 'Engagement time', val: formatDurationHuman(totalSecondsTracked), icon: Clock, sub: `${formatSeconds(totalSecondsTracked)} exact timer` },
    { label: 'Avg time to user', val: avgTimeToUser > 0 ? formatDurationHuman(avgTimeToUser) : 'N/A', icon: Target, sub: 'Initial foothold benchmark' },
    { label: 'Avg time to root', val: avgTimeToRoot > 0 ? formatDurationHuman(avgTimeToRoot) : 'N/A', icon: Zap, sub: 'Privesc benchmark' },
  ];

  return (
    <div className="space-y-6 w-full pb-12">

      <PageHeader
        title="Analytics and skill radar"
        description="Time benchmarks, difficulty progress and your attack-vector strengths."
        icon={<BarChart3 aria-hidden="true" />}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-surface-sunken border border-subtle text-secondary font-medium">
            <span className="tabular-nums font-mono text-primary">{rootedMachines.length}</span> targets rooted
          </span>
          <span className="px-3 py-1 rounded-lg bg-surface-sunken border border-subtle text-secondary font-medium">
            <span className="tabular-nums font-mono text-primary">{footholdsCount}</span> footholds
          </span>
        </div>
      </PageHeader>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...TACTICAL_SPRING, delay: idx * 0.05 }}
              className="p-3 sm:p-4 rounded-2xl border border-subtle bg-surface-card machined-edge min-w-0"
            >
              <div className="flex items-center justify-between gap-2 text-muted text-xs mb-1.5">
                <span className="font-medium text-xs truncate">{kpi.label}</span>
                <div className="hidden sm:block p-1 rounded-md bg-surface-sunken border border-subtle">
                  <Icon className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-semibold font-mono text-primary tabular-nums tracking-tight truncate">{kpi.val}</div>
              <div className="text-[11px] text-muted mt-1 tabular-nums truncate">{kpi.sub}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Grid: Skill Radar Chart + Difficulty Progress Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: Skill Radar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={TACTICAL_SPRING}
          className={`${CARD} flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between border-b border-subtle pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-muted" aria-hidden="true" />
                <h2 className="font-semibold text-primary text-sm">Offensive skill vector radar</h2>
              </div>
              <span className="text-xs text-muted">From pwned tags</span>
            </div>

            <p className="text-xs text-muted mb-4">
              Scored from the attack vectors of the machines you have rooted.
            </p>

            <div className="py-4">{renderRadarChart()}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-4 border-t border-subtle text-[11px]">
            {skillDimensions.map((d) => (
              <div
                key={d.name}
                className="bg-surface-sunken p-2.5 rounded-lg border border-subtle"
              >
                <div className="text-muted truncate text-[11px]">{d.name}</div>
                <div className="text-primary font-semibold text-xs mt-0.5 tabular-nums font-mono">{d.score}% ({d.rawCount} {d.rawCount === 1 ? 'pwn' : 'pwns'})</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: Difficulty Tier Progress Matrix & Platform Breakdown */}
        <div className="space-y-4">

          {/* Difficulty Tier Progress Matrix */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...TACTICAL_SPRING, delay: 0.1 }}
            className={`${CARD} space-y-4`}
          >
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-muted" aria-hidden="true" />
                <h2 className="font-semibold text-primary text-sm">Pwn progress matrix</h2>
              </div>
              <span className="text-xs text-muted">By difficulty</span>
            </div>

            <div className="space-y-3">
              {difficultyMatrix.map((item) => (
                <div key={item.tier} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-primary flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${TIER_COLOR[item.tier]}`} aria-hidden="true" />
                      {item.tier}
                    </span>
                    <span className="text-muted font-mono tabular-nums">
                      {item.rooted} / {item.total} ({item.percentage}%)
                    </span>
                  </div>

                  <div className="w-full bg-surface-sunken h-2 rounded-full border border-subtle overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.percentage}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className={`h-full ${TIER_COLOR[item.tier]}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Platform Distribution Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...TACTICAL_SPRING, delay: 0.15 }}
            className={`${CARD} space-y-3`}
          >
            <div className="flex items-center justify-between border-b border-subtle pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-muted" aria-hidden="true" />
                <h2 className="font-semibold text-primary text-sm">Lab platform roster</h2>
              </div>
              <span className="text-xs text-muted">All platforms</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {platformStats.map((p) => (
                <div
                  key={p.platform}
                  className="p-2.5 rounded-lg bg-surface-sunken border border-subtle"
                >
                  <div className="text-muted text-[11px] font-medium">{p.platform}</div>
                  <div className="text-sm font-semibold text-primary mt-0.5 tabular-nums font-mono">
                    {p.rooted} <span className="text-xs text-muted font-normal tabular-nums">/ {p.total}</span>
                  </div>
                  <div className="text-[11px] text-secondary mt-1 tabular-nums">
                    {p.total > 0 ? Math.round((p.rooted / p.total) * 100) : 0}% completed
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

      </div>

      {/* Activity Heatmap: weekday rows by week columns */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={TACTICAL_SPRING}
        className={`${CARD} space-y-3`}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted" aria-hidden="true" />
            <h2 className="font-semibold text-primary text-sm">Engagement activity heatmap</h2>
          </div>
          <span className="text-xs text-muted">Past 90 days</span>
        </div>

        <p className="text-xs text-muted">
          Study sessions and pwn events per day.
        </p>

        <ActivityHeatmap counts={heatmapCounts} />
      </motion.div>

    </div>
  );
};
