/**
 * Workspace Data Models & State Types
 * Supports Desktop-Grade In-Window Multi-Tab & Split-Pane Workspace Engine
 * with DOM Keep-Alive, Zero-Popup Link Routing, and Obsidian Integration.
 */

export interface NoteTab {
  id: string;               // Unique sanitized path or note ID (e.g. '00_methodology_pt')
  path: string;             // File path or source identifier
  title: string;            // Clean human-readable note title
  icon?: string;            // Category/file type indicator icon
  isPinned: boolean;        // Pinned tabs stay on the left without close buttons
  scrollTop: number;        // Preserved vertical scroll offset
  history: string[];        // In-tab back/forward navigation stack
  historyIndex: number;     // Active index in tab history
  category?: string;        // Category or folder name
  language?: 'en' | 'he';   // Note specific language view
}

export interface WorkspacePane {
  id: string;               // e.g., 'pane-primary', 'pane-secondary'
  tabs: NoteTab[];          // Array of tabs currently housed in this pane
  activeTabId: string | null;
}

export type SplitOrientation = 'horizontal' | 'vertical';

export interface WorkspaceState {
  panes: WorkspacePane[];
  activePaneId: string;
  isSplitView: boolean;
  splitOrientation: SplitOrientation;
  recentlyClosed: NoteTab[];
}

export interface OpenNoteOptions {
  background?: boolean;     // If true (Ctrl/Cmd+click or middle-click), open tab without shifting focus
  targetPaneId?: string;    // Force target pane (defaults to activePaneId)
  pinned?: boolean;         // Open as pinned tab
  anchor?: string;          // Heading anchor to scroll to upon opening
}
