import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
      className={`hover:bg-cyber-cardHover transition-colors group cursor-pointer ${
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
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
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
            className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-0.5 font-bold transition-[transform,colors] duration-150 hover:scale-105 active:scale-95 ${
              hasUser
                ? 'bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyber-cyan/10 dark:border-cyber-cyan/50 dark:text-cyber-cyan dark:shadow-glow-cyan/20'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-cyber-bg dark:border-cyber-border dark:text-cyber-muted dark:hover:text-white'
            }`}
            title="Toggle User Flag"
          >
            <Flag className="w-2.5 h-2.5" /> U
          </button>
          <button
            type="button"
            onClick={() => onToggleRootFlag(m.id, hasRoot)}
            className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-0.5 font-bold transition-[transform,colors] duration-150 hover:scale-105 active:scale-95 ${
              hasRoot
                ? 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-cyber-emerald/10 dark:border-cyber-emerald/50 dark:text-cyber-emerald dark:shadow-glow-emerald/20'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-cyber-bg dark:border-cyber-border dark:text-cyber-muted dark:hover:text-white'
            }`}
            title="Toggle Root Flag"
          >
            <Flag className="w-2.5 h-2.5" /> R
          </button>
        </div>
      </td>

      {/* Time */}
      <td className="py-2.5 px-3">
        <span className="text-slate-700 dark:text-cyber-muted font-mono">{formatSeconds(m.timeSpentSeconds)}</span>
      </td>

      {/* Tracks */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1">
          {m.certifications.map((c) => (
            <span key={c} className="text-[9px] px-1 py-0.2 rounded bg-purple-100 border border-purple-300 text-purple-900 dark:bg-cyber-purple/10 dark:border-cyber-purple/30 dark:text-cyber-purple font-bold">
              {c}
            </span>
          ))}
        </div>
      </td>

      {/* Actions */}
      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onEngageTarget(m.id)}
            className={`p-1 rounded border transition-[transform,colors,box-shadow] duration-150 hover:scale-110 active:scale-95 ${
              isActiveTarget
                ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-cyber-emerald/20 dark:text-cyber-emerald dark:border-cyber-emerald shadow-glow-emerald/20'
                : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-emerald'
            }`}
            title="Engage Target"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSelect(m.id)}
            className="p-1 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyber-cyan transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
            title="Attack Methodology Checklist"
          >
            <ListChecks className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenTarget(m.id)}
            className="p-1 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyber-cyan transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
            title="Open Dedicated Full-Page Mission"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenReport(m.id)}
            className="p-1 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-purple-800 dark:hover:text-purple-300 hover:border-purple-600 transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
            title="Open Executive Pentest Pre-Report"
          >
            <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </button>

          <button
            type="button"
            onClick={() => onOpenWriteup(m.id)}
            className="p-1 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyber-cyan transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
            title="Open Writeup"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {Boolean(sanitizeExternalUrl(m.roomUrl)) && (
            <a
              href={sanitizeExternalUrl(m.roomUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
              title="Open Room Link"
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

  const [visibleRows, setVisibleRows] = useState(50);

  React.useEffect(() => {
    setVisibleRows(50);
  }, [filteredMachines.length, sortField, sortAsc]);

  const visibleSortedMachines = useMemo(() => {
    return sortedMachines.slice(0, visibleRows);
  }, [sortedMachines, visibleRows]);

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
      className="rounded-xl border border-cyber-border bg-cyber-card overflow-hidden shadow-xl font-mono text-xs pb-6"
    >
      <div className="overflow-x-auto max-h-[calc(100vh-230px)]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-cyber-bg border-b border-cyber-border uppercase text-[10px] text-cyber-muted font-bold tracking-wider">
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
              <th className="py-3 px-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyber-border/70">
            {visibleSortedMachines.map((m) => (
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
            ))}
          </tbody>
        </table>
      </div>

      {sortedMachines.length > visibleRows && (
        <div className="flex items-center justify-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleRows((prev) => prev + 50)}
            className="px-4 py-2 rounded-lg bg-cyber-bg border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan hover:text-black font-bold text-xs transition-[transform,colors] duration-150 hover:scale-105 active:scale-95"
          >
            LOAD MORE ROWS (+50) — Showing {visibleRows} of {sortedMachines.length}
          </button>
        </div>
      )}
    </motion.div>
  );
};
