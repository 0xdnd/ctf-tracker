import React from 'react';
import { ChevronRight, Folder, FolderOpen, FileText, Trash2, Plus } from 'lucide-react';
import { CptsTreeNode, CptsNoteEntry } from '../../utils/obsidianManualUtils';

export interface CptsTreeItemProps {
  node: CptsTreeNode;
  depth: number;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  selectedPath: string | null;
  onSelectFolder: (fullPath: string) => void;
  onSelectNote: (note: CptsNoteEntry) => void;
  onDeleteNote?: (noteId: string, noteTitle: string) => void;
  onAddNoteToFolder?: (folderPath: string) => void;
  cptsLangMode?: 'en' | 'he';
  activeNoteId?: string | null;
}

export const CptsTreeItem: React.FC<CptsTreeItemProps> = ({
  node,
  depth,
  expandedFolders,
  onToggleFolder,
  selectedPath,
  onSelectFolder,
  onSelectNote,
  onDeleteNote,
  onAddNoteToFolder,
  cptsLangMode = 'en',
  activeNoteId,
}) => {
  const isExpanded = Boolean(expandedFolders[node.id]);
  const isFolder = node.isFolder;
  const isSelected = selectedPath === node.fullPath;

  if (isFolder) {
    return (
      <div className="select-none text-xs" data-tree-type="folder" data-tree-path={node.fullPath}>
        <div
          onClick={() => {
            // Clicking anywhere on folder row toggles expansion AND selects folder filter
            onToggleFolder(node.id);
            onSelectFolder(node.fullPath);
          }}
          className={`flex items-center justify-between py-1 px-1.5 rounded-md cursor-pointer transition-colors group ${
            isSelected
              ? 'bg-surface-sunken text-secondary border border-subtle font-semibold'
              : 'text-secondary hover:text-primary hover:bg-surface-hover border border-transparent'
          }`}
          title={node.name}
        >
          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFolder(node.id);
              }}
              className="p-0.5 rounded hover:bg-surface-hover text-tertiary hover:text-primary focus:outline-none transition-colors cursor-pointer active:scale-[0.97]"
              title={isExpanded ? 'Collapse folder' : 'Expand folder'}
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  isExpanded ? 'rotate-90 text-secondary' : ''
                }`}
              />
            </button>
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-muted flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-muted flex-shrink-0" />
            )}
            <span className="truncate text-xs sm:text-[13px] font-medium group-hover:text-primary">
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {onAddNoteToFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNoteToFolder(node.fullPath);
                }}
                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 p-0.5 rounded text-secondary hover:text-primary hover:bg-surface-hover transition-[opacity,background-color,border-color,color] cursor-pointer active:scale-[0.97]"
                title={`Add note inside ${node.name}`}
                aria-label={`Add note inside ${node.name}`}
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <span className="text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-surface-hover/80 border border-strong/80 text-secondary">
              {node.count}
            </span>
          </div>
        </div>

        {/* Children (Sub-folders & Files) - Obsidian Clean Guide Line Indentation */}
        {isExpanded && node.children && node.children.length > 0 && (
          <div className="border-l border-subtle ml-2.5 pl-1.5 space-y-0.5 mt-0.5">
            {node.children.map((child) => (
              <CptsTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                selectedPath={selectedPath}
                onSelectFolder={onSelectFolder}
                onSelectNote={onSelectNote}
                onDeleteNote={onDeleteNote}
                onAddNoteToFolder={onAddNoteToFolder}
                cptsLangMode={cptsLangMode}
                activeNoteId={activeNoteId}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Node is a Note (File)
  const note = node.note;
  if (!note) return null;

  const noteTitle = cptsLangMode === 'he' && note.titleHe ? note.titleHe : (node.name || note.titleEn || note.title);
  const isActive = activeNoteId === note.id;

  return (
    <div
      id={`cpts-note-${note.id}`}
      data-tree-type="note"
      data-note-id={note.id}
      onClick={() => onSelectNote(note)}
      className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs sm:text-[13px] transition-colors group border cursor-pointer ${
        isActive
          ? 'bg-accent/15 text-accent font-semibold border-accent/40 shadow-xs ring-1 ring-accent/30'
          : 'text-secondary hover:text-primary hover:bg-surface-hover border-transparent hover:border-subtle'
      }`}
      title={noteTitle}
    >
      <button
        type="button"
        onClick={() => onSelectNote(note)}
        title={`Open Obsidian Note: ${noteTitle}`}
        className="flex items-center gap-2 truncate flex-1 min-w-0 pr-1 pl-2 text-left cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-muted group-hover:text-primary'} flex-shrink-0 transition-colors`} />
        <span className={`truncate text-xs sm:text-[13px] ${isActive ? 'text-accent font-semibold' : 'group-hover:text-primary'}`}>
          {noteTitle}
        </span>
      </button>
      <div className="flex items-center gap-1 flex-shrink-0">
        {note.commands && note.commands.length > 0 && (
          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-surface-hover/80 text-secondary font-mono tabular-nums border border-strong/60 dark:border-transparent">
            {note.commands.length}c
          </span>
        )}
        {onDeleteNote && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id, noteTitle);
            }}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 p-0.5 rounded text-muted hover:text-callout-danger-fg hover:bg-callout-danger-bg transition-[opacity,background-color,border-color,color] cursor-pointer active:scale-[0.97]"
            title="Delete note"
            aria-label={`Delete note ${noteTitle}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
