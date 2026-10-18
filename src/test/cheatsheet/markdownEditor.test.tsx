import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownEditor } from '../../components/cheatsheet/MarkdownEditor';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { ObsidianNoteViewer } from '../../components/cheatsheet/ObsidianNoteViewer';
import { useCtfStore } from '../../store/useCtfStore';
import { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { GlobalVariables } from '../../types';

const mockGlobalVars: GlobalVariables = {
  lhost: '10.10.14.42',
  lport: '4444',
  targetIp: '10.10.11.250',
  interface: 'tun0',
  customVars: {},
};

const sampleNote: CptsNoteEntry = {
  id: 'test-note-cpts',
  title: 'Active Directory Enumeration',
  titleEn: 'Active Directory Enumeration',
  category: 'Active Directory',
  rawCategory: 'Active Directory',
  subCategory: 'Reconnaissance',
  tags: ['kerberos', 'ldap'],
  difficulty: 'Hard',
  summary: 'AD domain enumeration guidelines.',
  commands: ['bloodhound-python -u user -p pass -d domain.local'],
  relPath: 'Active Directory Enumeration.md',
  rawMarkdown: `# Active Directory Enumeration

## Methodology & Reconnaissance

> [!NOTE]
> Crucial AD reconnaissance methodology.

- [ ] Kerberoasting
- [x] AS-REP Roasting

\`\`\`bash
crackmapexec smb 10.10.11.250 -u users.txt -p pass.txt
\`\`\`

Reference [[02 - Linux PrivEsc]] for secondary pivots.`,
};

describe('MarkdownEditor & Multi-Mode In-App Editing Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    useCtfStore.setState({
      customNotes: [],
      activeTargetId: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('R1: MarkdownEditor UI & Formatting Tools', () => {
    it('renders the editor with formatting toolbar buttons and character telemetry', () => {
      render(
        <MarkdownEditor
          noteId={sampleNote.id}
          initialContent={sampleNote.rawMarkdown!}
          onContentChange={vi.fn()}
          globalVars={mockGlobalVars}
          soundEnabled={false}
        />
      );

      // Verify toolbar buttons exist
      expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
      expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
      expect(screen.getByTitle('Inline Code (`)')).toBeInTheDocument();
      expect(screen.getByTitle('Bash / Terminal Code Block')).toBeInTheDocument();
      expect(screen.getByTitle('Task Checklist (- [ ] )')).toBeInTheDocument();
      expect(screen.getByTitle('Obsidian Wikilink [[Note Title]] (Ctrl+K)')).toBeInTheDocument();
      expect(screen.getByTitle('Markdown Table')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Obsidian Callout Box')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Target Variables (LHOST, RHOST, LPORT)')).toBeInTheDocument();

      // Verify textarea contains initial content
      const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(sampleNote.rawMarkdown);

      // Verify telemetry counters
      expect(screen.getByText(/Saved/i)).toBeInTheDocument();
      expect(screen.getByText(/chars/i)).toBeInTheDocument();
      expect(screen.getByText(/words/i)).toBeInTheDocument();
      expect(screen.getByText(/lines/i)).toBeInTheDocument();
    });

    it('inserts markdown syntax when toolbar buttons are clicked', () => {
      const onContentChange = vi.fn();
      render(
        <MarkdownEditor
          noteId={sampleNote.id}
          initialContent="Initial test text"
          onContentChange={onContentChange}
          globalVars={mockGlobalVars}
          soundEnabled={false}
        />
      );

      const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
      textarea.focus();
      textarea.setSelectionRange(0, 0);

      // Click Bold button
      const boldBtn = screen.getByTitle('Bold (Ctrl+B)');
      fireEvent.click(boldBtn);

      expect(onContentChange).toHaveBeenCalledWith('**bold**Initial test text');

      // Click Table button
      const tableBtn = screen.getByTitle('Markdown Table');
      fireEvent.click(tableBtn);
      expect(onContentChange).toHaveBeenCalled();
    });

    it('inserts Obsidian callout templates from dropdown', () => {
      const onContentChange = vi.fn();
      render(
        <MarkdownEditor
          noteId={sampleNote.id}
          initialContent=""
          onContentChange={onContentChange}
          globalVars={mockGlobalVars}
          soundEnabled={false}
        />
      );

      // Open callout dropdown
      const calloutDropdownBtn = screen.getByTitle('Insert Obsidian Callout Box');
      fireEvent.click(calloutDropdownBtn);

      // Select [!TIP]
      const tipOption = screen.getByText(/Tip \(\[!TIP\]\)/i);
      fireEvent.click(tipOption);

      expect(onContentChange).toHaveBeenCalled();
      const lastCall = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
      expect(lastCall).toContain('> [!TIP]');
    });

    it('inserts tactical variables from dropdown', () => {
      const onContentChange = vi.fn();
      render(
        <MarkdownEditor
          noteId={sampleNote.id}
          initialContent=""
          onContentChange={onContentChange}
          globalVars={mockGlobalVars}
          soundEnabled={false}
        />
      );

      // Open variable dropdown
      const varDropdownBtn = screen.getByTitle('Insert Target Variables (LHOST, RHOST, LPORT)');
      fireEvent.click(varDropdownBtn);

      // Select LHOST button
      const lhostOption = screen.getByRole('button', { name: /LHOST/i });
      fireEvent.click(lhostOption);

      expect(onContentChange).toHaveBeenCalled();
      const lastCall = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
      // Since mockGlobalVars.lhost is '10.10.14.42', it inserts the configured variable value
      expect(lastCall).toContain('10.10.14.42');
    });

    it('supports keyboard shortcuts Ctrl+B and Ctrl+S', () => {
      const onContentChange = vi.fn();
      const onSave = vi.fn();
      render(
        <MarkdownEditor
          noteId={sampleNote.id}
          initialContent="keyboard test"
          onContentChange={onContentChange}
          onSave={onSave}
          globalVars={mockGlobalVars}
          soundEnabled={false}
        />
      );

      const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
      textarea.focus();

      // Trigger Ctrl+B
      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
      expect(onContentChange).toHaveBeenCalled();

      // Trigger Ctrl+S
      fireEvent.keyDown(textarea, { key: 's', ctrlKey: true });
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe('R2: Debounced Auto-Saving & Store Integration', () => {
    it('debounces auto-save to store after 600ms of typing inactivity', () => {
      const updateNoteContentSpy = vi.spyOn(useCtfStore.getState(), 'updateNoteContent');
      const onContentChange = vi.fn();

      render(
        <MarkdownEditor
          noteId={sampleNote.id}
          initialContent="# Original Title"
          onContentChange={onContentChange}
          globalVars={mockGlobalVars}
          soundEnabled={false}
        />
      );

      const textarea = screen.getByTestId('markdown-editor-textarea');
      
      // Type in textarea
      fireEvent.change(textarea, { target: { value: '# Updated Title By Operator' } });
      expect(onContentChange).toHaveBeenCalledWith('# Updated Title By Operator');

      // Before timer fires, store should NOT have been updated yet
      expect(updateNoteContentSpy).not.toHaveBeenCalled();
      expect(screen.getByText(/Unsaved/i)).toBeInTheDocument();

      // Advance timers past 600ms debounce
      act(() => {
        vi.advanceTimersByTime(650);
      });

      // Now updateNoteContent must have been called
      expect(updateNoteContentSpy).toHaveBeenCalledWith(sampleNote.id, '# Updated Title By Operator');
      expect(screen.getByText(/Saved/i)).toBeInTheDocument();
    });

    it('flushes pending debounced save immediately on manual save button click', () => {
      const updateNoteContentSpy = vi.spyOn(useCtfStore.getState(), 'updateNoteContent');
      const onSave = vi.fn();

      render(
        <MarkdownEditor
          noteId={sampleNote.id}
          initialContent="# Manual Save Test"
          onContentChange={vi.fn()}
          onSave={onSave}
          globalVars={mockGlobalVars}
          soundEnabled={false}
        />
      );

      const textarea = screen.getByTestId('markdown-editor-textarea');
      fireEvent.change(textarea, { target: { value: '# Urgent Save Before Reload' } });

      const saveBtn = screen.getByTitle('Save Note Now (Ctrl+S)');
      fireEvent.click(saveBtn);

      expect(updateNoteContentSpy).toHaveBeenCalledWith(sampleNote.id, '# Urgent Save Before Reload');
      expect(onSave).toHaveBeenCalled();
      expect(screen.getByText(/Saved/i)).toBeInTheDocument();
    });
  });

  describe('R3: Multi-Mode Views (Reading, Split, Raw) in ObsidianTabContent', () => {
    it('renders Reading View by default with rendered markdown and outline', () => {
      render(
        <ObsidianTabContent
          note={sampleNote}
          isActive={true}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onNavigateToNote={vi.fn()}
          viewMode="reading"
        />
      );

      // Outline should be visible
      expect(screen.getByText('OUTLINE:')).toBeInTheDocument();
      // Rendered title should exist
      expect(screen.getAllByText(/Active Directory Enumeration/i).length).toBeGreaterThanOrEqual(1);
      // Callout box should be rendered
      expect(screen.getByText(/Crucial AD reconnaissance methodology/i)).toBeInTheDocument();
      // Checkbox list items should be rendered
      expect(screen.getByText(/Kerberoasting/i)).toBeInTheDocument();
      expect(screen.getByText(/AS-REP Roasting/i)).toBeInTheDocument();
      // Code block should be rendered
      expect(screen.getByText(/crackmapexec smb/i)).toBeInTheDocument();

      // Raw textarea should NOT be visible in reading mode
      expect(screen.queryByTestId('markdown-editor-textarea')).not.toBeInTheDocument();
    });

    it('renders Raw Mode with interactive MarkdownEditor', () => {
      render(
        <ObsidianTabContent
          note={sampleNote}
          isActive={true}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onNavigateToNote={vi.fn()}
          viewMode="raw"
        />
      );

      // MarkdownEditor textarea should be rendered full width
      const textarea = screen.getByTestId('markdown-editor-textarea');
      expect(textarea).toBeInTheDocument();
      expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
    });

    it('renders Split Mode with both MarkdownEditor and Live Preview simultaneously', () => {
      render(
        <ObsidianTabContent
          note={sampleNote}
          isActive={true}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onNavigateToNote={vi.fn()}
          viewMode="split"
        />
      );

      // Left pane: MarkdownEditor textarea
      expect(screen.getByTestId('markdown-editor-textarea')).toBeInTheDocument();

      // Right pane: Live Preview header and rendered content
      expect(screen.getByText('LIVE PREVIEW')).toBeInTheDocument();
      expect(screen.getByText('Auto-rendering')).toBeInTheDocument();
      expect(screen.getAllByText(/Crucial AD reconnaissance methodology/i).length).toBeGreaterThanOrEqual(1);
    });

    it('provides quick Edit Note button in reading view header that switches to split mode', () => {
      const onViewModeChange = vi.fn();
      render(
        <ObsidianTabContent
          note={sampleNote}
          isActive={true}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onNavigateToNote={vi.fn()}
          viewMode="reading"
          onViewModeChange={onViewModeChange}
        />
      );

      const editBtn = screen.getByTitle('Switch to Split Edit View');
      expect(editBtn).toBeInTheDocument();

      fireEvent.click(editBtn);
      expect(onViewModeChange).toHaveBeenCalledWith('split');
    });
  });

  describe('R4: Full Integration in ObsidianNoteViewer Tri-Mode Switcher', () => {
    it('switches between Reading, Split, and Raw modes seamlessly', async () => {
      render(
        <ObsidianNoteViewer
          note={sampleNote}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // Initially in Reading mode
      expect(screen.queryByTestId('markdown-editor-textarea')).not.toBeInTheDocument();

      // Click Split button in header
      const splitBtn = screen.getByTitle('Split side-by-side editor and live preview');
      fireEvent.click(splitBtn);

      // Now in Split view: editor and live preview present
      expect(screen.getByTestId('markdown-editor-textarea')).toBeInTheDocument();
      expect(screen.getByText('LIVE PREVIEW')).toBeInTheDocument();

      // Click Raw MD button in header
      const rawBtn = screen.getByTitle('View raw Obsidian markdown');
      fireEvent.click(rawBtn);

      // In Raw view: editor present, live preview right column not present
      expect(screen.getByTestId('markdown-editor-textarea')).toBeInTheDocument();
      expect(screen.queryByText('LIVE PREVIEW')).not.toBeInTheDocument();

      // Click Reading button in header
      const readingBtn = screen.getByTitle('Obsidian rich formatted reading mode');
      fireEvent.click(readingBtn);

      // Back to Reading view
      expect(screen.queryByTestId('markdown-editor-textarea')).not.toBeInTheDocument();
      expect(screen.getByText(/Crucial AD reconnaissance methodology/i)).toBeInTheDocument();
    });
  });

  describe('R5: MarkdownEditor Standalone Dual-Pane Split Preview & DOMPurify Sanitization', () => {
    it('toggles dual-pane preview and neutralizes malicious script payloads via DOMPurify', () => {
      render(
        <MarkdownEditor
          noteId={sampleNote.id}
          initialContent={'# Safe Header\n<script>alert("XSS")</script>\n**Tactical Bold**'}
          onContentChange={vi.fn()}
          globalVars={mockGlobalVars}
          soundEnabled={false}
        />
      );

      // Initially preview is hidden
      expect(screen.queryByTestId('markdown-split-preview')).not.toBeInTheDocument();

      // Click Dual-Pane toggle button in toolbar
      const dualPaneBtn = screen.getByTitle('Toggle Dual-Pane Split Preview');
      fireEvent.click(dualPaneBtn);

      // Dual-Pane preview container is now displayed
      const preview = screen.getByTestId('markdown-split-preview');
      expect(preview).toBeInTheDocument();
      expect(screen.getByText('MARKDOWN PREVIEW')).toBeInTheDocument();
      expect(screen.getByText('Safe Header')).toBeInTheDocument();
      expect(screen.getByText('Tactical Bold')).toBeInTheDocument();

      // Ensure script tag was neutralized and no executable script element exists
      expect(preview.innerHTML).not.toContain('<script>');
      expect(preview.querySelector('script')).toBeNull();
    });
  });
});

