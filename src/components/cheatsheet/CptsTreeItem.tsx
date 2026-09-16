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
}) => {
  const isExpanded = Boolean(expandedFolders[node.id]);
  const isFolder = node.isFolder;
  const isSelected = selectedPath === node.fullPath;

  if (isFolder) {
    return (
      <div className="select-none text-xs font-mono" data-tree-type="folder" data-tree-path={node.fullPath}>
        <div
          onClick={() => {
            // Clicking anywhere on folder row toggles expansion AND selects folder filter
            onToggleFolder(node.id);
            onSelectFolder(node.fullPath);
          }}
          className={`flex items-center justify-between py-1 px-1.5 rounded-md cursor-pointer transition-all group ${
            isSelected
              ? 'bg-purple-100 dark:bg-purple-600/30 text-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-400/40 font-bold shadow-sm'
              : 'text-slate-700 dark:text-cyber-muted hover:text-purple-950 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-cyber-bg/70 border border-transparent'
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
              className="p-0.5 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 text-slate-400 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 focus:outline-none transition-all cursor-pointer"
              title={isExpanded ? 'Collapse folder' : 'Expand folder'}
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  isExpanded ? 'rotate-90 text-purple-600 dark:text-purple-300' : ''
                }`}
              />
            </button>
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400/80 flex-shrink-0" />
            )}
            <span className="truncate text-[11px] group-hover:text-purple-950 dark:group-hover:text-purple-200">
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
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-purple-600 dark:text-purple-400 hover:text-white hover:bg-purple-600 transition-all cursor-pointer"
                title={`Add note inside ${node.name}`}
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-black/40 border border-slate-300/80 dark:border-cyber-border text-purple-900 dark:text-purple-300">
              {node.count}
            </span>
          </div>
        </div>

        {/* Children (Sub-folders & Files) - Obsidian Clean Guide Line Indentation */}
        {isExpanded && node.children && node.children.length > 0 && (
          <div className="border-l border-purple-300/40 dark:border-purple-500/25 ml-2.5 pl-1.5 space-y-0.5 mt-0.5">
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

  return (
    <div
      onClick={() => onSelectNote(note)}
      data-tree-type="note"
      data-note-id={note.id}
      className="flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-mono cursor-pointer transition-all text-slate-700 dark:text-cyber-muted hover:text-purple-950 dark:hover:text-white hover:bg-purple-100 dark:hover:bg-purple-950/40 group border border-transparent hover:border-purple-200 dark:hover:border-purple-800/40"
      title={noteTitle}
    >
      <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1 pl-4">
        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-cyber-muted group-hover:text-purple-600 dark:group-hover:text-purple-400 flex-shrink-0 transition-colors" />
        <span className="truncate text-[11px] group-hover:text-purple-950 dark:group-hover:text-purple-200">
          {noteTitle}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {note.commands && note.commands.length > 0 && (
          <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-black/40 text-cyan-800 dark:text-cyber-cyan font-mono border border-slate-300/60 dark:border-transparent">
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
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-cyber-muted hover:text-cyber-crimson hover:bg-rose-950/40 transition-all cursor-pointer"
            title="Delete note"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
