import React from 'react';
import { BookOpen, LayoutList, PanelLeft } from 'lucide-react';
import { CptsNoteEntry } from '../../../utils/obsidianManualUtils';
import { playCyberSound } from '../../../utils/helpers';
import type { CptsDisplayLayout, ObsidianNavView } from './types';

interface EmptyWorkspaceProps {
  allActiveNotes: CptsNoteEntry[];
  soundEnabled: boolean;
  setActiveObsidianNote: (note: CptsNoteEntry | null) => void;
  setObsidianNavView: (view: ObsidianNavView) => void;
  setCptsDisplayLayout: (layout: CptsDisplayLayout) => void;
  leftOpenNow: boolean;
  handleToggleObsidianSidebar: () => void;
}

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({
  allActiveNotes,
  soundEnabled,
  setActiveObsidianNote,
  setObsidianNavView,
  setCptsDisplayLayout,
  leftOpenNow,
  handleToggleObsidianSidebar,
}) => {
  return (
    <div 
      data-testid="empty-obsidian-workspace"
      className="w-full h-full min-h-[600px] flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 bg-surface-card"
    >
      <div className="w-16 h-16 rounded-2xl bg-accent-muted border border-accent/40 flex items-center justify-center text-accent shadow-glow-sm">
        <BookOpen className="w-8 h-8" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base font-semibold text-primary">Pick a note</h3>
        <p className="text-xs text-muted leading-relaxed">
          Choose a note on the left, or create a new one.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {allActiveNotes.length > 0 && (
          <button
            type="button"
            data-testid="empty-state-open-first-note"
            onClick={() => {
              if (soundEnabled) playCyberSound('click');
              setActiveObsidianNote(allActiveNotes[0]);
            }}
            className="px-3.5 py-2 rounded-xl bg-accent text-on-accent text-xs font-semibold hover:bg-accent-hover transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open first note ({allActiveNotes[0].titleEn || allActiveNotes[0].title})</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (soundEnabled) playCyberSound('click');
            setObsidianNavView('cards');
            setCptsDisplayLayout('cards');
          }}
          className="px-3.5 py-2 rounded-xl bg-surface-sunken hover:bg-surface-hover border border-subtle text-primary text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <LayoutList className="w-3.5 h-3.5 text-muted" />
          <span>Browse Cards Gallery</span>
        </button>
        {!leftOpenNow && (
          <button
            type="button"
            onClick={handleToggleObsidianSidebar}
            className="px-3.5 py-2 rounded-xl bg-surface-sunken hover:bg-surface-hover border border-accent/40 text-accent text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PanelLeft className="w-3.5 h-3.5" />
            <span>Open File Explorer (Ctrl+B)</span>
          </button>
        )}
      </div>
    </div>
  );
};
