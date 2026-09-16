import React, { useMemo } from 'react';
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

export const AnalyticsView: React.FC = () => {
  const machines = useCtfStore((s) => s.machines);
  const activitySessions = useCtfStore((s) => s.activitySessions);

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

    const points = skillDimensions.map((dim, i) => {
      const r = (dim.score / 100) * radius;
      const angle = i * angleStep - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={size} height={size} className="mx-auto overflow-visible">
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
              stroke="#1F2937"
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
              stroke="#1F2937"
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
          fill="rgba(16, 185, 129, 0.28)"
          stroke="#10B981"
          strokeWidth="2.5"
          className="drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]"
        />

        {skillDimensions.map((dim, i) => {
          const r = (dim.score / 100) * radius;
          const angle = i * angleStep - Math.PI / 2;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);

          const labelRadius = radius + 24;
          const lx = center + labelRadius * Math.cos(angle);
          const ly = center + labelRadius * Math.sin(angle);

          return (
            <g key={i}>
              <motion.circle 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                cx={x} 
                cy={y} 
                r="4.5" 
                fill="#10B981" 
                className="animate-pulse shadow-glow-emerald" 
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#94A3B8"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {dim.name} ({dim.score}%)
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Activity Heatmap Calendar (Past 90 Days)
  const heatmapData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const matches = activitySessions.filter((s) => s.date === dStr).length;
      days.push({ date: dStr, count: matches });
    }
    return days;
  }, [activitySessions]);

  return (
    <div className="space-y-6 w-full font-mono pb-12">
      
      {/* Analytics Header Station */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-cyber-border bg-cyber-card shadow-md flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyber-bg border border-cyber-emerald/40 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-cyber-emerald" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
              OPERATIONAL ANALYTICS & SKILL RADAR
            </h1>
            <p className="text-xs text-cyber-muted mt-0.5">
              Comprehensive telemetry, difficulty matrix benchmarks, and offensive skill vector breakdown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-emerald font-bold">
            {rootedMachines.length} Targets Rooted
          </span>
          <span className="px-3 py-1 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-cyan font-bold">
            {footholdsCount} Footholds
          </span>
        </div>
      </motion.div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL PWNED', val: `${rootedMachines.length} / ${machines.length}`, icon: Award, color: 'text-cyber-emerald', sub: `${machines.length > 0 ? Math.round((rootedMachines.length / machines.length) * 100) : 0}% catalog completed` },
          { label: 'ENGAGEMENT TIME', val: formatDurationHuman(totalSecondsTracked), icon: Clock, color: 'text-cyber-cyan', sub: `${formatSeconds(totalSecondsTracked)} exact timer` },
          { label: 'AVG TIME TO USER', val: avgTimeToUser > 0 ? formatDurationHuman(avgTimeToUser) : 'N/A', icon: Target, color: 'text-cyber-amber', sub: 'Initial foothold benchmark' },
          { label: 'AVG TIME TO ROOT', val: avgTimeToRoot > 0 ? formatDurationHuman(avgTimeToRoot) : 'N/A', icon: Zap, color: 'text-cyber-crimson', sub: 'Privesc benchmark' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              whileHover={{ y: -4, scale: 1.015 }}
              className="p-4 rounded-xl border border-cyber-border bg-cyber-card shadow-md transition-colors hover:border-cyber-borderGlow"
            >
              <div className="flex items-center justify-between text-cyber-muted text-xs mb-1">
                <span className="uppercase font-semibold tracking-wider">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{kpi.val}</div>
              <div className="text-[10px] text-cyber-muted mt-1">{kpi.sub}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Grid: Skill Radar Chart + Difficulty Progress Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left: Skill Radar Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="p-5 rounded-xl border border-cyber-border bg-cyber-card shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-cyber-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-cyber-emerald" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">OFFENSIVE SKILL VECTOR RADAR</h3>
              </div>
              <span className="text-[10px] text-cyber-muted">PWNED TAG SYNTHESIS</span>
            </div>
            
            <p className="text-xs text-cyber-muted mb-4">
              Multidimensional rating synthesized automatically from completed machine attack vectors and exploit categories.
            </p>

            <div className="py-4">{renderRadarChart()}</div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-cyber-border/70 text-[10px]">
            {skillDimensions.map((d) => (
              <motion.div 
                whileHover={{ scale: 1.04 }}
                key={d.name} 
                className="bg-cyber-bg p-2 rounded border border-cyber-border cursor-pointer transition-colors hover:border-cyber-emerald/50"
              >
                <div className="text-cyber-muted truncate">{d.name}</div>
                <div className="text-slate-900 dark:text-white font-bold text-xs mt-0.5">{d.score}% ({d.rawCount} pwns)</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: Difficulty Tier Progress Matrix & Platform Breakdown */}
        <div className="space-y-4">
          
          {/* Difficulty Tier Progress Matrix */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="p-5 rounded-xl border border-cyber-border bg-cyber-card shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-cyber-border pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-cyber-amber" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">PWN PROGRESS MATRIX</h3>
              </div>
              <span className="text-[10px] text-cyber-muted">BY DIFFICULTY TIER</span>
            </div>

            <div className="space-y-3">
              {difficultyMatrix.map((item) => (
                <div key={item.tier} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900 dark:text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        item.tier === 'Easy' ? 'bg-cyber-emerald' :
                        item.tier === 'Medium' ? 'bg-cyber-amber' :
                        item.tier === 'Hard' ? 'bg-cyber-crimson' :
                        'bg-purple-500'
                      }`} />
                      {item.tier}
                    </span>
                    <span className="text-cyber-muted font-mono">
                      {item.rooted} / {item.total} ({item.percentage}%)
                    </span>
                  </div>

                  <div className="w-full bg-cyber-bg h-2 rounded-full border border-cyber-border overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.percentage}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full ${
                        item.tier === 'Easy' ? 'bg-cyber-emerald' :
                        item.tier === 'Medium' ? 'bg-cyber-amber' :
                        item.tier === 'Hard' ? 'bg-cyber-crimson' :
                        'bg-purple-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Platform Distribution Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="p-5 rounded-xl border border-cyber-border bg-cyber-card shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between border-b border-cyber-border pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">LAB PLATFORM ROSTER</h3>
              </div>
              <span className="text-[10px] text-cyber-muted">CROSS-PLATFORM</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {platformStats.map((p) => (
                <motion.div 
                  whileHover={{ scale: 1.04 }}
                  key={p.platform} 
                  className="p-2.5 rounded-lg bg-cyber-bg border border-cyber-border cursor-pointer transition-colors hover:border-cyber-cyan/50"
                >
                  <div className="text-cyber-muted text-[10px] uppercase font-semibold">{p.platform}</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {p.rooted} <span className="text-xs text-cyber-muted font-normal">/ {p.total}</span>
                  </div>
                  <div className="text-[10px] text-cyber-cyan mt-1">
                    {p.total > 0 ? Math.round((p.rooted / p.total) * 100) : 0}% completed
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>

      </div>

      {/* HTB / GitHub Style Activity Heatmap */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="p-5 rounded-xl border border-cyber-border bg-cyber-card shadow-lg space-y-3"
      >
        <div className="flex items-center justify-between border-b border-cyber-border pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyber-emerald" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">ENGAGEMENT ACTIVITY HEATMAP</h3>
          </div>
          <span className="text-[10px] text-cyber-muted">PAST 90 DAYS OPERATIONS</span>
        </div>

        <p className="text-xs text-cyber-muted">
          Visualized daily operational study sessions and machine root events.
        </p>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto py-2">
          <div className="flex gap-1.5 min-w-[700px]">
            {heatmapData.map((d) => {
              const count = d.count;
              let bg = 'bg-cyber-bg border-cyber-border/70';
              if (count === 1) bg = 'bg-cyber-emerald/30 border-cyber-emerald/50';
              if (count === 2) bg = 'bg-cyber-emerald/60 border-cyber-emerald';
              if (count >= 3) bg = 'bg-cyber-emerald border-white shadow-glow-emerald';

              return (
                <motion.div
                  whileHover={{ scale: 1.4, y: -2 }}
                  key={d.date}
                  className={`w-3.5 h-3.5 rounded-sm border ${bg} cursor-pointer transition-shadow`}
                  title={`${d.date}: ${count} actions recorded`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-cyber-muted pt-1">
          <span>90 Days Ago</span>
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-cyber-bg border border-cyber-border" />
            <div className="w-2.5 h-2.5 rounded-sm bg-cyber-emerald/30" />
            <div className="w-2.5 h-2.5 rounded-sm bg-cyber-emerald/60" />
            <div className="w-2.5 h-2.5 rounded-sm bg-cyber-emerald" />
            <span>More</span>
          </div>
          <span>Today</span>
        </div>
      </motion.div>

    </div>
  );
};
