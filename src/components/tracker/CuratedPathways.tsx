import React, { useState, useMemo } from 'react';
import { Target, ChevronDown, ChevronUp, Check, Layers, X, Sparkles } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { PRACTICE_TRACKS, PracticeTrack } from '../../data/tracksData';
import { playCyberSound } from '../../utils/helpers';

export const CuratedPathways: React.FC = () => {
  const { machines, filters, setFilters, soundEnabled } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      filters: s.filters,
      setFilters: s.setFilters,
      soundEnabled: s.soundEnabled,
    }))
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [pinnedTrackId, setPinnedTrackId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zerobox_pinned_track') || 'tjnull-oscp';
    }
    return 'tjnull-oscp';
  });

  // Calculate track progress statistics for all tracks
  const trackStats = useMemo(() => {
    const stats: Record<string, { total: number; rooted: number; percent: number }> = {};
    PRACTICE_TRACKS.forEach((track) => {
      const matching = machines.filter(track.filterFn);
      const total = matching.length;
      const rooted = matching.filter((m) => m.status === 'root' || m.status === 'completed').length;
      const percent = total > 0 ? Math.round((rooted / total) * 100) : 0;
      stats[track.id] = { total, rooted, percent };
    });
    return stats;
  }, [machines]);

  // Active multi-track array (normalized)
  const activeTrackIds = useMemo(() => {
    if (filters.selectedTracks && filters.selectedTracks.length > 0) {
      return filters.selectedTracks;
    }
    if (filters.selectedTrack && filters.selectedTrack !== 'ALL') {
      return [filters.selectedTrack];
    }
    return [];
  }, [filters.selectedTracks, filters.selectedTrack]);

  // Combined statistics for all currently active tracks
  const combinedActiveStats = useMemo(() => {
    if (activeTrackIds.length === 0) {
      const pinned = PRACTICE_TRACKS.find((t) => t.id === pinnedTrackId) || PRACTICE_TRACKS[0];
      return {
        isCombined: false,
        label: pinned.shortName || pinned.name,
        stats: trackStats[pinned.id] || { total: 0, rooted: 0, percent: 0 },
      };
    }

    if (activeTrackIds.length === 1) {
      const single = PRACTICE_TRACKS.find((t) => t.id === activeTrackIds[0]) || PRACTICE_TRACKS[0];
      return {
        isCombined: false,
        label: single.shortName || single.name,
        stats: trackStats[single.id] || { total: 0, rooted: 0, percent: 0 },
      };
    }

    // Union of targets across all selected tracks
    const matchingSet = new Set<string>();
    activeTrackIds.forEach((id) => {
      const track = PRACTICE_TRACKS.find((t) => t.id === id);
      if (track) {
        machines.filter(track.filterFn).forEach((m) => matchingSet.add(m.id));
      }
    });

    const total = matchingSet.size;
    const rooted = machines.filter((m) => matchingSet.has(m.id) && (m.status === 'root' || m.status === 'completed')).length;
    const percent = total > 0 ? Math.round((rooted / total) * 100) : 0;

    return {
      isCombined: true,
      label: `${activeTrackIds.length} Tracks Combined`,
      stats: { total, rooted, percent },
    };
  }, [activeTrackIds, machines, pinnedTrackId, trackStats]);

  const handleToggleTrack = (trackId: string) => {
    const isCurrentlyActive = activeTrackIds.includes(trackId);
    let next: string[];

    if (isCurrentlyActive) {
      next = activeTrackIds.filter((id) => id !== trackId);
    } else {
      next = [...activeTrackIds, trackId];
    }

    setFilters({
      selectedTracks: next,
      selectedTrack: next.length > 0 ? next[0] : 'ALL',
    });

    setPinnedTrackId(trackId);
    try {
      localStorage.setItem('zerobox_pinned_track', trackId);
    } catch {}

    if (soundEnabled) playCyberSound('toggle');
  };

  const handleClearAllTracks = () => {
    setFilters({
      selectedTracks: [],
      selectedTrack: 'ALL',
    });
    if (soundEnabled) playCyberSound('click');
  };

  const handleSelectAllTracks = () => {
    const allIds = PRACTICE_TRACKS.map((t) => t.id);
    setFilters({
      selectedTracks: allIds,
      selectedTrack: allIds[0],
    });
    if (soundEnabled) playCyberSound('click');
  };

  // 5 Quick Top Flagship Tracks for 1-click toggles
  const flagshipTrackIds = ['tjnull-oscp', 'cpts-path', 'cwee-web', 'ippsec-vault', 'crto-ad'];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 font-mono text-xs shadow-sm overflow-hidden transition-all">
      {/* Collapsed Micro-Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 gap-2">
        {/* Left: Primary/Combined Track Progress Indicator */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-cyber-cyan flex-shrink-0">
            <Target className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-cyber-muted hidden sm:inline">
              TARGET TRACK:
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 truncate text-left transition-colors ${
              activeTrackIds.length > 0 ? 'text-cyber-cyan font-bold' : 'text-slate-800 dark:text-cyber-text hover:text-cyber-cyan'
            }`}
            title="Click to view all available certification & curated tracks"
          >
            <span className="font-bold text-xs truncate flex items-center gap-1">
              {combinedActiveStats.label}
              {activeTrackIds.length > 1 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40">
                  UNION
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-cyber-muted font-mono flex-shrink-0">
              {combinedActiveStats.stats.rooted}/{combinedActiveStats.stats.total}
            </span>
          </button>

          {/* Micro Progress Bar */}
          <div className="w-20 sm:w-28 bg-slate-200 dark:bg-cyber-bg h-1.5 rounded-full overflow-hidden flex-shrink-0 border border-slate-300/60 dark:border-cyber-border/70">
            <div
              className="h-full bg-cyber-cyan transition-all duration-300"
              style={{ width: `${combinedActiveStats.stats.percent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-cyber-cyan font-mono flex-shrink-0">
            {combinedActiveStats.stats.percent}%
          </span>

          {/* Quick 1-Click Multi-Track Toggle Pills */}
          <div className="hidden md:flex items-center gap-1 ml-1 flex-wrap">
            {flagshipTrackIds.map((id) => {
              const track = PRACTICE_TRACKS.find((t) => t.id === id);
              if (!track) return null;
              const isActive = activeTrackIds.includes(id);

              return (
                <button
                  key={id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTrack(id);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-all flex items-center gap-1 font-sans ${
                    isActive
                      ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyan-800 dark:text-cyber-cyan font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-cyber-bg border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                  }`}
                  title={`${isActive ? 'Remove' : 'Add'} ${track.name}`}
                >
                  <span>{isActive ? '✓' : '+'}</span>
                  <span>{track.shortName.replace(' Track', '')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions & Expand All Tracks Toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {activeTrackIds.length > 0 && (
            <button
              onClick={handleClearAllTracks}
              className="text-[10px] text-slate-500 dark:text-cyber-muted hover:text-rose-600 dark:hover:text-rose-400 hover:underline px-1 flex items-center gap-0.5 transition-colors"
              title="Reset track filter to all machines"
            >
              <X className="w-3 h-3" />
              <span>Clear ({activeTrackIds.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              if (soundEnabled) playCyberSound('click');
            }}
            className="p-1 px-2 rounded-md bg-slate-100 dark:bg-cyber-bg hover:bg-slate-200 dark:hover:bg-cyber-cardHover border border-slate-200 dark:border-cyber-border text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-[10px] transition-colors"
            title={isExpanded ? 'Collapse tracks matrix' : `Expand all ${PRACTICE_TRACKS.length} tactical tracks`}
          >
            <Layers className="w-3 h-3 text-cyan-600 dark:text-cyber-cyan" />
            <span>{isExpanded ? 'Hide Tracks' : `All ${PRACTICE_TRACKS.length} Tracks`}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded Multi-Track Selection Grid */}
      {isExpanded && (
        <div className="p-3 border-t border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/90 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-cyber-muted px-1 flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyber-cyan" />
              <strong className="text-slate-800 dark:text-white">Multi-Track Selection:</strong> Select one or more tracks to combine their target pools.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllTracks}
                className="text-[10px] text-cyan-700 dark:text-cyber-cyan hover:underline font-semibold"
              >
                Select All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearAllTracks}
                className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-white hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {PRACTICE_TRACKS.map((track) => {
              const stats = trackStats[track.id] || { total: 0, rooted: 0, percent: 0 };
              const active = activeTrackIds.includes(track.id);

              return (
                <button
                  key={track.id}
                  onClick={() => handleToggleTrack(track.id)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all relative group ${
                    active
                      ? 'bg-cyber-cyan/15 border-cyber-cyan text-slate-900 dark:text-white shadow-sm ring-1 ring-cyber-cyan/50 font-bold'
                      : 'bg-white dark:bg-cyber-card/90 border-slate-200 dark:border-cyber-border text-slate-700 dark:text-cyber-text hover:border-slate-300 dark:hover:border-cyber-borderGlow hover:bg-slate-50 dark:hover:bg-cyber-cardHover'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="min-w-0 pr-1">
                      <span className="font-bold text-xs block leading-snug truncate">
                        {track.shortName || track.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-cyber-muted capitalize block">
                        {track.category}
                      </span>
                    </div>

                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      active
                        ? 'bg-cyber-cyan border-cyber-cyan text-black'
                        : 'border-slate-300 dark:border-slate-700 group-hover:border-cyber-cyan'
                    }`}>
                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-cyber-bg h-1.5 rounded-full overflow-hidden my-1 border border-slate-300/40 dark:border-cyber-border/60">
                    <div
                      className="h-full bg-cyber-cyan transition-all duration-300"
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-cyber-muted mt-0.5 font-mono">
                    <span>{stats.rooted}/{stats.total} pwned</span>
                    <span className="text-cyan-700 dark:text-cyber-cyan font-bold">{stats.percent}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
