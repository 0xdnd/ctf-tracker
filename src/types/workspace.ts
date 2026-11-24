/**
 * Workspace Data Models & State Types
 * Supports Desktop-Grade In-Window Multi-Tab & Split-Pane Workspace Engine
 * with DOM Keep-Alive, Zero-Popup Link Routing, and Obsidian Integration.
 */

export type SplitOrientation = 'horizontal' | 'vertical';

export interface OpenNoteOptions {
  background?: boolean;     // If true (Ctrl/Cmd+click or middle-click), open tab without shifting focus
  targetPaneId?: string;    // Force target pane (defaults to activePaneId)
  pinned?: boolean;         // Open as pinned tab
  anchor?: string;          // Heading anchor to scroll to upon opening
}
