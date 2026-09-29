# Project: ZeroBox Markdown Editor & Live Preview System

## Architecture
- **State Layer (`src/store/useCtfStore.ts`, `src/store/useNotesWorkspaceStore.ts`)**:
  - `ObsidianViewMode`: Expanded to `'reading' | 'split' | 'raw'`.
  - Note persistence: `updateNoteContent(noteId, content)` mutating `customNotes`, updating `userNotes` (IndexedDB `zerobox_vault_db`), or promoting static `CPTS_NOTES` to `customNotes` override.
  - Debounced storage persistence with status tracking (`saved` | `saving` | `dirty`).
- **Editor Layer (`src/components/cheatsheet/ObsidianMarkdownEditor.tsx`)**:
  - Controlled monospaced editor with formatting toolbar (H1-H3, Bold, Italic, Inline Code, Code Block, Bullet List, Task List, Table, Callouts).
  - Caret and selection preservation engine.
  - Keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+K`, `Ctrl+S`, `Tab`/`Shift+Tab`).
  - Status indicator badge (`Saved`, `Saving...`, `Unsaved changes`).
- **Workspace & View Layer (`src/components/cheatsheet/ObsidianNoteViewer.tsx`, `ObsidianTabContent.tsx`, `PersistentNotesWorkspace.tsx`)**:
  - Tri-mode view switching (`reading`, `split`, `raw`).
  - Split-view dual-column responsive layout (`grid-cols-1 md:grid-cols-2`) with live preview synchronization (`useDeferredValue`).
  - OFM rendering: 11 callout types (collapsible `+`/`-`), wikilink resolution (`[[Note]]`, `[[Note|Alias]]`, `[[Note#Anchor]]`), code blocks with 1-click copy and HUD variable interpolation, interactive checklists with bidirectional sync.
  - DOM keep-alive tab preservation across all open note tabs.
- **Testing & Quality Assurance Layer (`src/test/cheatsheet/markdownEditorWorkspace.test.tsx`)**:
  - Comprehensive 4-Tier test suite (36+ tests) verifying features, edge cases, combinations, and real-world scenarios.
  - Tier 5 adversarial stress testing and forensic integrity verification.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tri-Mode View Toggling | Support switching between Reading, Split-View, and Raw Source modes | M3 | survey |
| 2 | Split-View Dual Layout | Side-by-side editing on left and live rendered markdown on right | M3 | survey |
| 3 | Raw Source Mode | Full-width editable source markdown for command editing and frontmatter | M3 | survey |
| 4 | Reading View Mode | High-fidelity rendered document with outline chips and backlinks | M3 | survey |
| 5 | Formatting Toolbar - Headers | Insert or prepend `# `, `## `, `### ` to line or selection | M2 | survey |
| 6 | Formatting Toolbar - Bold | Wrap selected text in `**bold**` or insert placeholder | M2 | survey |
| 7 | Formatting Toolbar - Italic | Wrap selected text in `*italic*` or insert placeholder | M2 | survey |
| 8 | Formatting Toolbar - Inline Code | Wrap selected text in `` `code` `` | M2 | survey |
| 9 | Formatting Toolbar - Code Block | Insert fenced code block with bash syntax highlighting | M2 | survey |
| 10 | Formatting Toolbar - Bullet List | Prepend `- ` to selected lines | M2 | survey |
| 11 | Formatting Toolbar - Task List | Prepend `- [ ] ` to selected lines | M2 | survey |
| 12 | Formatting Toolbar - Table | Insert standard 2x2 markdown table template | M2 | survey |
| 13 | Formatting Toolbar - Callouts | Insert Obsidian callout template with selectable type | M2 | survey |
| 14 | Keyboard Shortcut - Bold | `Ctrl+B` / `Cmd+B` toggles bold formatting | M2 | survey |
| 15 | Keyboard Shortcut - Italic | `Ctrl+I` / `Cmd+I` toggles italic formatting | M2 | survey |
| 16 | Keyboard Shortcut - Link | `Ctrl+K` / `Cmd+K` inserts link or wikilink syntax | M2 | survey |
| 17 | Keyboard Shortcut - Save | `Ctrl+S` / `Cmd+S` forces immediate save and status update | M2 | survey |
| 18 | Keyboard Shortcut - Tab Indent | `Tab` inserts 2 spaces; `Shift+Tab` dedents; focus remains in editor | M2 | survey |
| 19 | Selection & Caret Restoration | Slicing and cursor repositioning after formatting token insertion | M2 | survey |
| 20 | Obsidian Callouts - 11 Types | Render note, abstract, tip, warning, danger, example, important, cite, question, success, info | M3 | survey |
| 21 | Obsidian Callouts - Foldable `+`/`-` | Support `+` (open by default) and `-` (collapsed by default) with chevron toggle | M3 | survey |
| 22 | Wikilinks - Resolution & Anchors | Parse `[[Target Note]]`, `[[Target\|Alias]]`, `[[Target#Heading]]` | M3 | survey |
| 23 | Wikilinks - Zero-Popup Navigation | In-window tab opening; blocks `window.open` and browser reload | M3 | survey |
| 24 | Wikilinks - Background Tab Open | `Ctrl+Click` / Middle-Click opens note in background tab | M3 | survey |
| 25 | Task Checklists - Interactive Toggle | Interactive checkboxes in preview with bidirectional sync to raw markdown | M3 | survey |
| 26 | Code Blocks - Syntax Highlighting | Fenced code blocks with language badge and theme styling | M3 | survey |
| 27 | Code Blocks - 1-Click Copy | Copy button with visual "COPIED" badge and audio confirmation | M3 | survey |
| 28 | Code Blocks - Variable Interpolation | HUD variables (`<LHOST>`, `<TARGET_IP>`, etc.) dynamically interpolated | M3 | survey |
| 29 | Store Action - `updateNoteContent` | Add `updateNoteContent` action in `useCtfStore.ts` supporting all note origins | M1 | survey |
| 30 | Expanded `ObsidianViewMode` | Expand type in `useNotesWorkspaceStore.ts` and `ObsidianNoteViewer.tsx` to include `'split'` | M1 | survey |
| 31 | Auto-Saving - Debounced Persistence | 500-1200ms debounce to localStorage and IndexedDB | M1 | survey |
| 32 | Auto-Saving - Status Indicators | Visual indicator badge (`Saved`, `Saving...`, `Unsaved changes`) | M2 | survey |
| 33 | DOM Keep-Alive Tab Preservation | All open tabs remain mounted; inactive hidden via `display: none` | M3 | survey |
| 34 | DOMPurify Security Sanitization | Neutralize XSS vectors (`<script>`, `onerror`, `javascript:`) in markdown | M3 | survey |
| 35 | Air-Gapped Zero-Egress | 100% client-side operation with 0 external network requests | M3 | survey |
| 36 | 4-Tier Test Suite | Tier 1-4 tests in `src/test/cheatsheet/markdownEditorWorkspace.test.tsx` | M4 | survey |
| 37 | Tier 5 Adversarial Coverage Hardening | White-box adversarial testing and integrity forensics | M5 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Store & Data Foundation | Expand `ObsidianViewMode` to `'reading' \| 'split' \| 'raw'`, implement `updateNoteContent` in `useCtfStore.ts` with auto-save support for custom, user, and catalog notes | none | PLANNED |
| M2 | In-App Markdown Editor Component | Build `ObsidianMarkdownEditor.tsx` with formatting toolbar, caret preservation, keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+K`, `Ctrl+S`, `Tab`), and real-time save status badge | M1 | PLANNED |
| M3 | Multi-Mode View & Live Preview Integration | Integrate editor into `ObsidianTabContent.tsx` and `ObsidianNoteViewer.tsx` with Tri-Mode toggling (`reading`, `split`, `raw`), synchronized preview, OFM callouts, wikilinks, interactive checklist sync, and DOM keep-alive | M2 | PLANNED |
| M4 | E2E 4-Tier Test Suite Implementation | Implement comprehensive test suite `src/test/cheatsheet/markdownEditorWorkspace.test.tsx` covering Tiers 1-4 (36+ tests) and publish `TEST_READY.md` | M3 | PLANNED |
| M5 | Final Verification, Adversarial Hardening & Audit | 100% test pass (`npm test -- --run`), 0 type errors (`npx tsc --noEmit`), clean build (`npm run build`), Tier 5 challenger verification, and Forensic Integrity Audit | M4 | PLANNED |

## Interface Contracts
### `src/store/useCtfStore.ts` ↔ Editor / Viewers
```ts
// Store actions
updateNoteContent: (noteId: string, rawMarkdown: string) => void;
```
- Behavior:
  - If `noteId` exists in `customNotes`: update `rawMarkdown` and `dateModified`, trigger `flushProfileSave()`.
  - If `noteId` exists in `userNotes`: update `rawMarkdown` and `dateModified`, trigger `saveVaultToIndexedDb()`.
  - If `noteId` matches a built-in note in `CPTS_NOTES`: promote/clone the note into `customNotes` with updated `rawMarkdown`, ensuring user edits override baseline catalog without mutating static JSON.

### `src/store/useNotesWorkspaceStore.ts` ↔ `ObsidianNoteViewer.tsx`
```ts
export type ObsidianViewMode = 'reading' | 'split' | 'raw';
```

### `ObsidianMarkdownEditor.tsx` ↔ `ObsidianTabContent.tsx`
```ts
export interface ObsidianMarkdownEditorProps {
  noteId: string;
  initialContent: string;
  onSave: (content: string) => void;
  soundEnabled?: boolean;
  isSplit?: boolean;
  className?: string;
  onContentChange?: (content: string) => void;
}
```

## Code Layout
- `src/store/useCtfStore.ts`: Store persistence & `updateNoteContent` (Owned by M1 Worker)
- `src/store/useNotesWorkspaceStore.ts`: View mode type & state (Owned by M1 Worker)
- `src/components/cheatsheet/ObsidianMarkdownEditor.tsx`: New editor component (Owned by M2 Worker)
- `src/components/cheatsheet/ObsidianTabContent.tsx`: Live preview, tri-mode integration, checklist sync (Owned by M3 Worker)
- `src/components/cheatsheet/ObsidianNoteViewer.tsx`: Tri-mode toolbar buttons and layout container (Owned by M3 Worker)
- `src/test/cheatsheet/markdownEditorWorkspace.test.tsx`: Dedicated 4-Tier test suite (Owned by M4 Worker)
- `TEST_READY.md`: Test suite completion record
