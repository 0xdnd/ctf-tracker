import React from 'react';
import { Folder, Search, Hash, Zap, ExternalLink, type LucideIcon } from 'lucide-react';
import { openInNewTab } from '../../utils/openInNewTab';

import type { NotesPanelView } from '../../store/useNotesWorkspaceStore';

export type NotesRibbonPanel = NotesPanelView;

export interface NotesRibbonProps {
  /** null means the left sidebar is closed. */
  activePanel: NotesRibbonPanel | null;
  /** Pressing the active panel while it is open toggles the sidebar closed. */
  onSelectPanel: (p: NotesRibbonPanel) => void;
  onOpenSwitcher: () => void;
  /** Full-screen "Back to ZeroBox". Ignored when `footer` is given. */
  onBack?: () => void;
  /** Replaces the default bottom buttons (open in new tab, back). */
  footer?: React.ReactNode;
  /** Extra attributes per panel button (test ids, tour anchors). */
  panelButtonProps?: Partial<Record<NotesRibbonPanel, Record<string, string>>>;
}

const PANELS: { id: NotesRibbonPanel; label: string; Icon: LucideIcon }[] = [
  { id: 'files', label: 'Files', Icon: Folder },
  { id: 'search', label: 'Search', Icon: Search },
  { id: 'tags', label: 'Tags', Icon: Hash },
];

const btn =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';

export const NotesRibbon: React.FC<NotesRibbonProps> = ({
  activePanel,
  onSelectPanel,
  onOpenSwitcher,
  onBack,
  footer,
  panelButtonProps,
}) => (
  <nav
    aria-label="Field manual ribbon"
    data-testid="notes-ribbon"
    data-tour="notes-ribbon"
    className="flex w-11 flex-shrink-0 flex-col items-center gap-1 border-r border-subtle bg-surface-sunken py-2"
  >
    {PANELS.map(({ id, label, Icon }) => {
      const active = activePanel === id;
      return (
        <button
          key={id}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={active}
          onClick={() => onSelectPanel(id)}
          {...panelButtonProps?.[id]}
          className={`${btn} ${active ? 'bg-surface-hover text-accent' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden={true} />
        </button>
      );
    })}
    <button
      type="button"
      aria-label="Quick switcher"
      title="Quick switcher (Ctrl+O)"
      onClick={onOpenSwitcher}
      className={`${btn} text-muted hover:bg-surface-hover hover:text-primary`}
    >
      <Zap className="h-[18px] w-[18px]" aria-hidden={true} />
    </button>
    <div className="flex-1" />
    {footer ?? (
      <>
        <button
          type="button"
          aria-label="Open ZeroBox in new tab"
          title="Open ZeroBox in new tab"
          onClick={() => openInNewTab('/tracker')}
          className={`${btn} text-muted hover:bg-surface-hover hover:text-primary`}
        >
          <ExternalLink className="h-[18px] w-[18px]" aria-hidden={true} />
        </button>
        <button
          type="button"
          aria-label="Back to ZeroBox"
          title="Back to ZeroBox"
          onClick={() => onBack?.()}
          className="flex w-full cursor-pointer flex-col items-center gap-0.5 py-1 text-[11px] leading-none text-muted transition-colors duration-150 motion-reduce:transition-none hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          <span aria-hidden="true">←</span>
          <span aria-hidden="true">ZeroBox</span>
        </button>
      </>
    )}
  </nav>
);

export default NotesRibbon;
