import React, { useMemo } from 'react';

export interface NoteTagsPanelProps {
  /** lowercased tag (nested "a/b" kept) -> note ids */
  tags: Map<string, string[]>;
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

interface TagNode {
  path: string;
  name: string;
  noteIds: Set<string>;
  children: Map<string, TagNode>;
  /** children sorted alphabetically (filled after the tree is built) */
  sorted: TagNode[];
}

function buildTagTree(tags: Map<string, string[]>): TagNode[] {
  const roots = new Map<string, TagNode>();
  for (const [tag, ids] of tags) {
    const segments = tag.split('/').filter(Boolean);
    let level = roots;
    let path = '';
    for (const seg of segments) {
      path = path ? `${path}/${seg}` : seg;
      let node = level.get(seg);
      if (!node) {
        node = { path, name: seg, noteIds: new Set(), children: new Map(), sorted: [] };
        level.set(seg, node);
      }
      // Parent counts include every descendant's notes.
      for (const id of ids) node.noteIds.add(id);
      level = node.children;
    }
  }
  const sortNodes = (m: Map<string, TagNode>) =>
    [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  const finalize = (nodes: TagNode[]): TagNode[] => {
    for (const n of nodes) n.sorted = finalize(sortNodes(n.children));
    return nodes;
  };
  return finalize(sortNodes(roots));
}

const TagRow: React.FC<{
  node: TagNode;
  depth: number;
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
}> = ({ node, depth, activeTag, onSelectTag }) => {
  const isActive = activeTag === node.path;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectTag(isActive ? null : node.path)}
        aria-pressed={isActive}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        className={`flex w-full items-center justify-between gap-2 rounded-sm py-1 pr-2 text-left text-xs transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 ${
          isActive ? 'bg-accent-muted text-accent' : 'text-primary hover:bg-surface-sunken'
        }`}
      >
        <span className="truncate">{node.name}</span>
        <span className="text-[10px] tabular-nums text-muted">{node.noteIds.size}</span>
      </button>
      {node.sorted.length > 0 && (
        <ul>
          {node.sorted.map((child) => (
            <TagRow
              key={child.path}
              node={child}
              depth={depth + 1}
              activeTag={activeTag}
              onSelectTag={onSelectTag}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const NoteTagsPanel: React.FC<NoteTagsPanelProps> = ({ tags, activeTag, onSelectTag }) => {
  const tree = useMemo(() => buildTagTree(tags), [tags]);
  if (tree.length === 0) {
    return <p className="px-2 py-1 text-xs text-muted">No tags yet</p>;
  }
  return (
    <ul aria-label="Tags" className="space-y-0.5">
      {tree.map((node) => (
        <TagRow key={node.path} node={node} depth={0} activeTag={activeTag} onSelectTag={onSelectTag} />
      ))}
    </ul>
  );
};
