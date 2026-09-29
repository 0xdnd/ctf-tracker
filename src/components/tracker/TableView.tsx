import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  ArrowUpDown, 
  Flag, 
  Crosshair, 
  FileText, 
  ExternalLink,
  ListChecks,
  Maximize2
} from 'lucide-react';
import { Machine, PipelineStatus } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { formatSeconds, playCyberSound, triggerRootCelebration, sanitizeExternalUrl } from '../../utils/helpers';
import { PlatformBadge, PlatformIcon } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';

interface TableViewProps {
  filteredMachines: Machine[];
}

type SortField = 'name' | 'platform' | 'os' | 'difficulty' | 'status' | 'timeSpentSeconds';

const STATUS_OPTIONS: CyberSelectOption<PipelineStatus>[] = [
  { value: 'backlog', label: 'Backlog', color: '#64748B' },
  { value: 'recon', label: 'Recon', color: '#06B6D4' },
  { value: 'foothold', label: 'Foothold', color: '#F59E0B' },
  { value: 'root', label: 'Root Pwned', color: '#10B981' },
  { value: 'completed', label: 'Completed', color: '#10B981' },
];

interface TableRowProps {
  machine: Machine;
  isActiveTarget: boolean;
  soundEnabled: boolean;
  onSelect: (id: string) => void;
  onStatusChange: (status: PipelineStatus, id: string) => void;
  onToggleUserFlag: (id: string) => void;
  onToggleRootFlag: (id: string, hasRoot: boolean) => void;
  onEngageTarget: (id: string) => void;
  onOpenTarget: (id: string) => void;
  onOpenReport: (id: string) => void;
  onOpenWriteup: (id: string) => void;
}

const TableRow = React.memo<TableRowProps>(({
  machine: m,
  isActiveTarget,
  soundEnabled,
  onSelect,
  onStatusChange,
  onToggleUserFlag,
  onToggleRootFlag,
  onEngageTarget,
  onOpenTarget,
  onOpenReport,
  onOpenWriteup,
}) => {
  const hasUser = Boolean(m.userPwnedAt || m.userFlag);
  const hasRoot = Boolean(m.rootPwnedAt || m.rootFlag);

  return (
    <tr
      className={`hover:bg-slate-50 dark:hover:bg-cyber-cardHover transition-colors group cursor-pointer ${
        isActiveTarget ? 'bg-cyber-emerald/5 border-l-2 border-l-cyber-emerald' : ''
      }`}
      onClick={() => onSelect(m.id)}
    >
      {/* Target Name & IP */}
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2.5">
          <PlatformIcon platform={m.platform} className="w-4 h-4 flex-shrink-0" />
          <div>
            <div className="font-bold text-slate-900 dark:text-white group-hover:text-cyber-cyan transition-colors flex items-center gap-1.5">
              <span>{m.name}</span>
              {m.isActive && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                  ACTIVE
                </span>
              )}
            </div>
            <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="mt-0.5" />
          </div>
        </div>
      </td>

      {/* Platform */}
      <td className="py-2.5 px-3">
        <PlatformBadge platform={m.platform} size="sm" />
      </td>

      {/* OS & Category */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <OsBadge os={m.os} size="xs" />
          <CategoryBadge machine={m} size="xs" />
        </div>
      </td>

      {/* Difficulty */}
      <td className="py-2.5 px-3">
        <DifficultyBadge difficulty={m.difficulty} size="sm" />
      </td>

      {/* Status Pipeline Dropdown */}
      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
        <CyberSelect<PipelineStatus>
          value={m.status}
          onChange={(newStatus) => onStatusChange(newStatus, m.id)}
          options={STATUS_OPTIONS}
          size="xs"
          variant={
            m.status === 'root' || m.status === 'completed'
              ? 'emerald'
              : m.status === 'foothold'
              ? 'amber'
              : m.status === 'recon'
              ? 'cyan'
              : 'default'
          }
          soundEnabled={soundEnabled}
        />
      </td>

      {/* Flags */}
      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleUserFlag(m.id)}
            className={`px-2 py-0.5 rounded-md border text-[10px] flex items-center gap-1 font-bold transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] cursor-pointer ${
              hasUser
                ? 'bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyan-950/40 dark:border-cyan-500/40 dark:text-cyan-300 shadow-xs'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-cyber-bg dark:border-cyber-border dark:text-cyber-muted dark:hover:text-white'
            }`}
            title="Toggle User Flag"
            aria-label={hasUser ? `Toggle user flag for ${m.name} (currently captured)` : `Toggle user flag for ${m.name} (currently pending)`}
          >
            <Flag className="w-2.5 h-2.5" /> U
          </button>
          <button
            type="button"
            onClick={() => onToggleRootFlag(m.id, hasRoot)}
            className={`px-2 py-0.5 rounded-md border text-[10px] flex items-center gap-1 font-bold transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] cursor-pointer ${
              hasRoot
                ? 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500/40 dark:text-emerald-300 shadow-xs'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-cyber-bg dark:border-cyber-border dark:text-cyber-muted dark:hover:text-white'
            }`}
            title="Toggle Root Flag"
            aria-label={hasRoot ? `Toggle root flag for ${m.name} (currently captured)` : `Toggle root flag for ${m.name} (currently pending)`}
          >
            <Flag className="w-2.5 h-2.5" /> R
          </button>
        </div>
      </td>

      {/* Time */}
      <td className="py-2.5 px-3">
        <span className="text-slate-700 dark:text-zinc-400 font-mono tabular-nums">{formatSeconds(m.timeSpentSeconds)}</span>
      </td>

      {/* Tracks */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1">
          {m.certifications.map((c) => (
            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-100 border border-purple-300 text-purple-900 dark:bg-purple-950/30 dark:border-purple-800/40 dark:text-purple-300 font-bold font-mono">
              {c}
            </span>
          ))}
        </div>
      </td>

      {/* Actions */}
      <td className="py-2.5 px-4 text-right pr-6 whitespace-nowrap min-w-[200px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onEngageTarget(m.id)}
            className={`p-1.5 rounded-md border transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] cursor-pointer ${
              isActiveTarget
                ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500 shadow-xs'
                : 'bg-white dark:bg-cyber-bg border-slate-200 dark:border-cyber-border text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:border-emerald-500'
            }`}
            title="Engage Target"
            aria-label={isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSelect(m.id)}
            className="p-1.5 rounded-md bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-zinc-400 hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyan-500 transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] cursor-pointer"
            title="Attack Methodology Checklist"
            aria-label={`Open attack methodology checklist for ${m.name}`}
          >
            <ListChecks className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenTarget(m.id)}
            className="p-1.5 rounded-md bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-zinc-400 hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyan-500 transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] cursor-pointer"
            title="Open Dedicated Full-Page Mission"
            aria-label={`Open dedicated mission dossier for ${m.name}`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenReport(m.id)}
            className="p-1.5 rounded-md bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-zinc-400 hover:text-purple-800 dark:hover:text-purple-300 hover:border-purple-600 transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] cursor-pointer"
            title="Open Executive Pentest Pre-Report"
            aria-label={`Open executive pentest pre-report for ${m.name}`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </button>

          <button
            type="button"
            onClick={() => onOpenWriteup(m.id)}
            className="p-1.5 rounded-md bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-zinc-400 hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyan-500 transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] cursor-pointer"
            title="Open Writeup"
            aria-label={`Open writeup studio for ${m.name}`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {Boolean(sanitizeExternalUrl(m.roomUrl)) && (
            <a
              href={sanitizeExternalUrl(m.roomUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] cursor-pointer"
              title="Open Room Link"
              aria-label={`Open external room link for ${m.name}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
});

export const TableView: React.FC<TableViewProps> = ({ filteredMachines }) => {
  const navigate = useNavigate();
  const {
    setSelectedMachineId,
    updateMachineStatus,
    activeTargetId,
    setActiveTarget,
    startTimer,
    setWriteupMachineId,
    setActiveTab,
    soundEnabled,
    toggleUserFlag,
    toggleRootFlag,
    setReportMachineId,
  } = useCtfStore(
    useShallow((s) => ({
      setSelectedMachineId: s.setSelectedMachineId,
      updateMachineStatus: s.updateMachineStatus,
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      startTimer: s.startTimer,
      setWriteupMachineId: s.setWriteupMachineId,
      setActiveTab: s.setActiveTab,
      soundEnabled: s.soundEnabled,
      toggleUserFlag: s.toggleUserFlag,
      toggleRootFlag: s.toggleRootFlag,
      setReportMachineId: s.setReportMachineId,
    }))
  );

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [customColumnSorted, setCustomColumnSorted] = useState(false);

  const handleSort = useCallback((field: SortField) => {
    setCustomColumnSorted(true);
    setSortField((prevField) => {
      if (prevField === field) {
        setSortAsc((prevAsc) => !prevAsc);
        return field;
      } else {
        setSortAsc(true);
        return field;
      }
    });
  }, []);

  const sortedMachines = useMemo(() => {
    if (!customColumnSorted) {
      return filteredMachines;
    }
    const list = [...filteredMachines];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
    return list;
  }, [filteredMachines, sortField, sortAsc, customColumnSorted]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: sortedMachines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const handleStatusChange = useCallback((newStatus: PipelineStatus, machineId: string) => {
    updateMachineStatus(machineId, newStatus);
    if (newStatus === 'root' || newStatus === 'completed') {
      triggerRootCelebration();
      if (soundEnabled) playCyberSound('root');
    }
  }, [updateMachineStatus, soundEnabled]);

  const handleToggleRootFlag = useCallback((id: string, hasRoot: boolean) => {
    toggleRootFlag(id);
    if (!hasRoot) triggerRootCelebration();
  }, [toggleRootFlag]);

  const handleEngageTarget = useCallback((id: string) => {
    setActiveTarget(id);
    startTimer();
    if (soundEnabled) playCyberSound('timer');
  }, [setActiveTarget, startTimer, soundEnabled]);

  const handleOpenTarget = useCallback((id: string) => {
    navigate(`/target/${id}`);
  }, [navigate]);

  const handleOpenReport = useCallback((id: string) => {
    setReportMachineId(id);
  }, [setReportMachineId]);

  const handleOpenWriteup = useCallback((id: string) => {
    setWriteupMachineId(id);
    setActiveTab('writeup');
    navigate(`/writeup/${id}`);
  }, [setWriteupMachineId, setActiveTab, navigate]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-subtle bg-surface-card overflow-hidden shadow-xs font-mono text-xs pb-4"
    >
      <div ref={parentRef} className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
        <table className="w-full text-left border-collapse min-w-[1080px]">
          <thead className="sticky top-0 z-10 bg-surface-base border-b border-subtle uppercase text-[10px] text-slate-500 dark:text-zinc-400 font-bold tracking-wider">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1.5">
                  <span>TARGET</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('platform')}>
                <div className="flex items-center gap-1.5">
                  <span>PLATFORM</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('os')}>
                <div className="flex items-center gap-1.5">
                  <span>OS</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('difficulty')}>
                <div className="flex items-center gap-1.5">
                  <span>DIFFICULTY</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1.5">
                  <span>STATUS</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">FLAGS</th>
              <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('timeSpentSeconds')}>
                <div className="flex items-center gap-1.5">
                  <span>TIME</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">TRACKS</th>
              <th className="py-3 px-4 text-right pr-6 whitespace-nowrap min-w-[200px]">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-cyber-border">
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={9} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const m = sortedMachines[virtualRow.index];
              if (!m) return null;
              return (
                <TableRow
                  key={m.id}
                  machine={m}
                  isActiveTarget={activeTargetId === m.id}
                  soundEnabled={soundEnabled}
                  onSelect={setSelectedMachineId}
                  onStatusChange={handleStatusChange}
                  onToggleUserFlag={toggleUserFlag}
                  onToggleRootFlag={handleToggleRootFlag}
                  onEngageTarget={handleEngageTarget}
                  onOpenTarget={handleOpenTarget}
                  onOpenReport={handleOpenReport}
                  onOpenWriteup={handleOpenWriteup}
                />
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={9} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 pt-3 text-[11px] text-slate-500 dark:text-zinc-400 border-t border-subtle">
        <div className="flex items-center gap-2">
          <span>Showing <span className="font-bold text-slate-900 dark:text-white">{sortedMachines.length}</span> targets</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30 font-bold">
            ⚡ Virtualized 120 FPS
          </span>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:block">
          Use j/k keys to navigate targets · Space to inspect
        </div>
      </div>
    </motion.div>
  );
};
