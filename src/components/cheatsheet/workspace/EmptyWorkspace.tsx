import React from 'react';
import { BookOpen, LayoutList, PanelLeft } from 'lucide-react';
import { CptsNoteEntry } from '../../../utils/obsidianManualUtils';
import { CyberButton } from '../../common/CyberButton';
import { EmptyState } from '../../common/EmptyState';
import type { CptsDisplayLayout, ObsidianNavView } from './types';

interface EmptyWorkspaceProps {
  allActiveNotes: CptsNoteEntry[];
  /** Unused: CyberButton plays its own click sound. */
  soundEnabled?: boolean;
  setActiveObsidianNote: (note: CptsNoteEntry | null) => void;
  setObsidianNavView: (view: ObsidianNavView) => void;
  setCptsDisplayLayout: (layout: CptsDisplayLayout) => void;
  leftOpenNow: boolean;
  handleToggleObsidianSidebar: () => void;
}

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({
  allActiveNotes,
  setActiveObsidianNote,
  setObsidianNavView,
  setCptsDisplayLayout,
  leftOpenNow,
  handleToggleObsidianSidebar,
}) => {
  return (
    <div
      data-testid="empty-obsidian-workspace"
      className="flex h-full min-h-[320px] w-full flex-1 flex-col items-center justify-center bg-surface-card p-4 text-center"
    >
      <EmptyState icon={BookOpen} title="Pick a note" headingAs="h2" description="Choose a note on the left, or create a new one." className="pb-4" />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {allActiveNotes.length > 0 && (
          <CyberButton
            variant="primary"
            data-testid="empty-state-open-first-note"
            onClick={() => setActiveObsidianNote(allActiveNotes[0])}
            iconLeft={<BookOpen className="h-3.5 w-3.5" />}
          >
            Open first note ({allActiveNotes[0].titleEn || allActiveNotes[0].title})
          </CyberButton>
        )}
        <CyberButton
          variant="secondary"
          onClick={() => {
            setObsidianNavView('cards');
            setCptsDisplayLayout('cards');
          }}
          iconLeft={<LayoutList className="h-3.5 w-3.5" />}
        >
          Browse Cards Gallery
        </CyberButton>
        {!leftOpenNow && (
          <CyberButton variant="outline" onClick={handleToggleObsidianSidebar} iconLeft={<PanelLeft className="h-3.5 w-3.5" />}>
            Open File Explorer (Ctrl+B)
          </CyberButton>
        )}
      </div>
    </div>
  );
};
