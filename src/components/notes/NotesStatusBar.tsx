import React from 'react';

export interface NotesStatusBarProps {
  wordCount: number;
  backlinkCount: number;
}

export const NotesStatusBar: React.FC<NotesStatusBarProps> = ({ wordCount, backlinkCount }) => (
  <div
    data-testid="notes-status-bar"
    className="flex h-6 flex-shrink-0 items-center justify-end gap-4 border-t border-subtle bg-surface-sunken px-3 text-[11px] text-tertiary"
  >
    <span data-testid="status-words">
      {wordCount} {wordCount === 1 ? 'word' : 'words'}
    </span>
    <span data-testid="status-backlinks">
      {backlinkCount} {backlinkCount === 1 ? 'backlink' : 'backlinks'}
    </span>
  </div>
);

export default NotesStatusBar;
