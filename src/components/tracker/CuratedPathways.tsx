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
    <div className="rounded-xl border border-subtle bg-surface-card text-xs overflow-hidden transition-[box-shadow,background-color,border-color,color]">
      {/* Collapsed Micro-Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 gap-2">
        {/* Left: Primary/Combined Track Progress Indicator */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-callout-info-fg flex-shrink-0">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-tertiary hidden sm:inline">
              Target track
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 truncate text-left transition-colors ${
              activeTrackIds.length > 0 ? 'text-callout-info-fg font-semibold' : 'text-secondary hover:text-callout-info-fg'
            }`}
            title="Click to view all available certification & curated tracks"
          >
            <span className="font-semibold text-xs truncate flex items-center gap-1">
              {combinedActiveStats.label}
              {activeTrackIds.length > 1 && (
                <span className="text-xs px-1.5 py-0.2 rounded bg-accent-muted text-callout-info-fg border border-accent/40">
                  UNION
                </span>
              )}
            </span>
            <span className="text-xs text-tertiary font-mono tabular-nums flex-shrink-0">
              {combinedActiveStats.stats.rooted}/{combinedActiveStats.stats.total}
            </span>
          </button>

          {/* Micro Progress Bar */}
          <div className="w-20 sm:w-28 bg-surface-hover h-1.5 rounded-full overflow-hidden flex-shrink-0 border border-strong/60">
            <div
              className="h-full bg-accent transition-colors duration-300"
              style={{ width: `${combinedActiveStats.stats.percent}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-accent font-mono tabular-nums flex-shrink-0">
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
                  className={`px-2 py-0.5 rounded text-xs border transition-colors flex items-center gap-1 font-sans ${
                    isActive
                      ? 'bg-accent-muted border-accent text-callout-info-fg font-semibold shadow-sm'
                      : 'bg-surface-sunken border-subtle text-muted hover:text-primary hover:border-strong'
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
              className="text-xs text-tertiary hover:text-callout-danger-fg hover:underline px-1 flex items-center gap-0.5 transition-colors"
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
            className="p-1 px-2 rounded-md bg-surface-sunken hover:bg-surface-hover border border-subtle text-secondary hover:text-primary flex items-center gap-1 text-xs transition-colors"
            title={isExpanded ? 'Collapse tracks matrix' : `Expand all ${PRACTICE_TRACKS.length} tactical tracks`}
          >
            <Layers className="w-3 h-3 text-callout-info-fg" />
            <span>{isExpanded ? 'Hide Tracks' : `All ${PRACTICE_TRACKS.length} Tracks`}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded Multi-Track Selection Grid */}
      {isExpanded && (
        <div className="p-3 border-t border-subtle bg-surface-sunken space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs text-muted px-1 flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-callout-info-fg" />
              <strong className="text-secondary">Multi-Track Selection:</strong> Select one or more tracks to combine their target pools.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllTracks}
                className="text-xs text-callout-info-fg hover:underline font-semibold"
              >
                Select All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearAllTracks}
                className="text-xs text-tertiary hover:text-secondary hover:underline"
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
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-colors relative group ${
                    active
                      ? 'bg-accent-muted border-accent text-primary shadow-sm ring-1 ring-accent/50 font-semibold'
                      : 'bg-surface-card border-subtle text-secondary hover:border-strong hover:bg-surface-sunken'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="min-w-0 pr-1">
                      <span className="font-semibold text-xs block leading-snug truncate">
                        {track.shortName || track.name}
                      </span>
                      <span className="text-xs text-tertiary capitalize block">
                        {track.category}
                      </span>
                    </div>

                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      active
                        ? 'bg-accent border-accent text-on-accent'
                        : 'border-strong group-hover:border-accent'
                    }`}>
                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden my-1 border border-strong/40">
                    <div
                      className="h-full bg-accent transition-colors duration-300"
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-tertiary mt-0.5 font-mono tabular-nums">
                    <span>{stats.rooted}/{stats.total} pwned</span>
                    <span className="text-callout-info-fg font-semibold">{stats.percent}%</span>
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
