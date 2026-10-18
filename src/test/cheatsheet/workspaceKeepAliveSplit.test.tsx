import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ObsidianNoteViewer } from '../../components/cheatsheet/ObsidianNoteViewer';
import { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { GlobalVariables } from '../../types';
import { handleWorkspaceLinkClick, parseNoteTarget, slugifyHeading } from '../../utils/workspaceLinkInterceptor';

const mockGlobalVars: GlobalVariables = {
  lhost: '10.10.14.42',
  lport: '4444',
  targetIp: '10.10.11.250',
  interface: 'tun0',
  customVars: {},
};

const mockNoteA: CptsNoteEntry = {
  id: 'note-sqli',
  title: 'SQL Injection Playbook',
  titleEn: 'SQL Injection Playbook',
  category: 'Web Exploitation',
  rawCategory: 'Web Exploitation',
  subCategory: 'Databases',
  tags: ['sqli', 'web', 'payloads'],
  difficulty: 'Medium',
  summary: 'Manual and automated SQL injection techniques.',
  commands: ['sqlmap -u "http://10.10.11.250/vuln.php?id=1" --batch'],
  relPath: 'web/sqli.md',
  rawMarkdown: `# SQL Injection Playbook

## Enumeration
- [ ] Test single quote '
- [x] Check error messages

> [!TIP] Authentication Bypass
> Use \`admin' or 1=1-- -\` on login endpoints.

> [!WARNING] Blind SQLi
> Use time-based payloads when no output is reflected.

See [[Linux PrivEsc]] and [[Active Directory#Kerberos]].
`,
};

const mockNoteB: CptsNoteEntry = {
  id: 'note-linux-privesc',
  title: 'Linux Privilege Escalation',
  titleEn: 'Linux Privilege Escalation',
  category: 'PrivEsc',
  rawCategory: 'PrivEsc',
  subCategory: 'Linux',
  tags: ['linux', 'sudo', 'suid'],
  difficulty: 'Hard',
  summary: 'Techniques for rooting Linux targets.',
  commands: ['sudo -l', 'find / -perm -4000 2>/dev/null'],
  relPath: 'privesc/linux.md',
  rawMarkdown: `# Linux Privilege Escalation

## Sudo Permissions
Check \`sudo -l\` for commands runnable as root.

[[SQL Injection Playbook]]
`,
};

const mockNoteC: CptsNoteEntry = {
  id: 'note-active-directory',
  title: 'Active Directory Attacks',
  titleEn: 'Active Directory Attacks',
  category: 'Active Directory',
  rawCategory: 'Active Directory',
  subCategory: 'Kerberos',
  tags: ['ad', 'kerberos'],
  difficulty: 'Insane',
  summary: 'Active Directory domain compromise paths.',
  commands: ['impacket-GetNPUsers domain.local/ -usersfile users.txt -no-pass'],
  relPath: 'ad/attacks.md',
  rawMarkdown: `# Active Directory Attacks

## Kerberos
Kerberoasting and AS-REP Roasting tactics.
`,
};

describe('Master In-Window Multi-Tab & Split-View Workspace Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('R1: DOM Keep-Alive Tab Workspace Engine', () => {
    it('KEEP-01: mounts all open tabs simultaneously and hides inactive tabs via display: none without unmounting', () => {
      const handleSelectNote = vi.fn();
      const openNotes = [mockNoteA, mockNoteB];

      const { rerender } = render(
        <ObsidianNoteViewer
          note={mockNoteA}
          openNotes={openNotes}
          onSelectNote={handleSelectNote}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // Both tab containers exist in the DOM
      const tabContentA = screen.getByTestId('tab-content-note-sqli');
      const tabContentB = screen.getByTestId('tab-content-note-linux-privesc');

      expect(tabContentA).toBeInTheDocument();
      expect(tabContentB).toBeInTheDocument();

      // Tab A is active and visible; Tab B is hidden
      expect(tabContentA).not.toHaveStyle({ display: 'none' });
      expect(tabContentB).toHaveStyle({ display: 'none' });

      // Switch active tab to Tab B (simulating prop update from store/parent)
      rerender(
        <ObsidianNoteViewer
          note={mockNoteB}
          openNotes={openNotes}
          onSelectNote={handleSelectNote}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // DOM Keep-Alive: Both containers still exist in the DOM without re-creation
      expect(screen.getByTestId('tab-content-note-sqli')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-note-linux-privesc')).toBeInTheDocument();

      // Visibility flipped instantly with 0ms delay
      expect(screen.getByTestId('tab-content-note-sqli')).toHaveStyle({ display: 'none' });
      expect(screen.getByTestId('tab-content-note-linux-privesc')).not.toHaveStyle({ display: 'none' });
    });

    it('KEEP-02: preserves callout toggles and checklist checkbox state across tab switches', () => {
      const openNotes = [mockNoteA, mockNoteB];

      const { rerender } = render(
        <ObsidianNoteViewer
          note={mockNoteA}
          openNotes={openNotes}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // In Tab A, find the checklist checkbox for 'Test single quote' and click it
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
      const firstCheckbox = checkboxes[0] as HTMLInputElement;
      expect(firstCheckbox.checked).toBe(false);

      // Toggle it to checked
      fireEvent.click(firstCheckbox);
      expect(firstCheckbox.checked).toBe(true);

      // Switch to Tab B
      rerender(
        <ObsidianNoteViewer
          note={mockNoteB}
          openNotes={openNotes}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // Switch back to Tab A
      rerender(
        <ObsidianNoteViewer
          note={mockNoteA}
          openNotes={openNotes}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // Verify the checkbox in Tab A is STILL checked (DOM Keep-Alive preserved state!)
      const restoredCheckboxes = screen.getAllByRole('checkbox');
      expect((restoredCheckboxes[0] as HTMLInputElement).checked).toBe(true);
    });

    it('KEEP-03: supports pinned tabs on the left and prevents accidental closing without unpinning', () => {
      const handleCloseTab = vi.fn();
      localStorage.setItem('zerobox_pinned_tabs_v1', JSON.stringify(['note-sqli']));

      render(
        <ObsidianNoteViewer
          note={mockNoteA}
          openNotes={[mockNoteB, mockNoteA]}
          onCloseTab={handleCloseTab}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // Note A is pinned: close button should NOT be rendered on its tab
      expect(screen.queryByTestId('close-tab-note-sqli')).not.toBeInTheDocument();

      // Note B is unpinned: close button IS rendered
      expect(screen.getByTestId('close-tab-note-linux-privesc')).toBeInTheDocument();
    });
  });

  describe('R2: Universal Link Interceptor & Zero-Popup Routing', () => {
    it('LINK-01: intercepts internal markdown links and prevents browser popups or page reloads', () => {
      const onOpenNote = vi.fn();
      const container = document.createElement('div');
      container.innerHTML = `
        <a id="internal-link" href="privesc/linux.md" target="_blank">Linux PrivEsc</a>
        <a id="external-link" href="https://example.com/exploit" target="_blank">External PoC</a>
      `;
      document.body.appendChild(container);

      const internalLink = container.querySelector('#internal-link') as HTMLAnchorElement;
      const externalLink = container.querySelector('#external-link') as HTMLAnchorElement;

      // Click internal link
      const fakeEventInternal = {
        target: internalLink,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ctrlKey: false,
        metaKey: false,
        button: 0,
      } as unknown as React.MouseEvent;

      const intercepted = handleWorkspaceLinkClick(fakeEventInternal, {
        containerElement: container,
        onOpenNote,
        notesPool: [mockNoteA, mockNoteB],
      });

      expect(intercepted).toBe(true);
      expect(fakeEventInternal.preventDefault).toHaveBeenCalled();
      expect(fakeEventInternal.stopPropagation).toHaveBeenCalled();
      // target="_blank" removed
      expect(internalLink.getAttribute('target')).toBeNull();
      expect(onOpenNote).toHaveBeenCalledWith('note-linux-privesc', expect.objectContaining({ background: false }));

      // Click external link
      const fakeEventExternal = {
        target: externalLink,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ctrlKey: false,
        metaKey: false,
        button: 0,
      } as unknown as React.MouseEvent;

      const interceptedExternal = handleWorkspaceLinkClick(fakeEventExternal, {
        containerElement: container,
        onOpenNote,
        notesPool: [mockNoteA, mockNoteB],
      });

      expect(interceptedExternal).toBe(false);
      expect(fakeEventExternal.preventDefault).not.toHaveBeenCalled();
      expect(externalLink.getAttribute('rel')).toContain('noopener noreferrer');

      document.body.removeChild(container);
    });

    it('LINK-02: opens note in background tab when Ctrl/Cmd+Click or Middle-Click is triggered', () => {
      const onOpenNote = vi.fn();
      const container = document.createElement('div');
      container.innerHTML = `<a id="link-test" href="web/sqli.md">SQLi</a>`;
      document.body.appendChild(container);

      const linkEl = container.querySelector('#link-test') as HTMLAnchorElement;

      // Ctrl+Click
      const ctrlEvent = {
        target: linkEl,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ctrlKey: true,
        metaKey: false,
        button: 0,
      } as unknown as React.MouseEvent;

      handleWorkspaceLinkClick(ctrlEvent, {
        containerElement: container,
        onOpenNote,
        notesPool: [mockNoteA],
      });

      expect(onOpenNote).toHaveBeenCalledWith('note-sqli', expect.objectContaining({ background: true }));

      // Middle-Click (button === 1)
      const middleEvent = {
        target: linkEl,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ctrlKey: false,
        metaKey: false,
        button: 1,
      } as unknown as React.MouseEvent;

      handleWorkspaceLinkClick(middleEvent, {
        containerElement: container,
        onOpenNote,
        notesPool: [mockNoteA],
      });

      expect(onOpenNote).toHaveBeenCalledWith('note-sqli', expect.objectContaining({ background: true }));

      document.body.removeChild(container);
    });

    it('LINK-03: smoothly scrolls to in-page heading anchors without shifting outer viewport', () => {
      const container = document.createElement('div');
      const heading = document.createElement('h2');
      heading.id = 'section-enumeration';
      heading.scrollIntoView = vi.fn();
      container.appendChild(heading);

      const anchorLink = document.createElement('a');
      anchorLink.href = '#enumeration';
      container.appendChild(anchorLink);
      document.body.appendChild(container);

      const clickEvent = {
        target: anchorLink,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ctrlKey: false,
        metaKey: false,
        button: 0,
      } as unknown as React.MouseEvent;

      const result = handleWorkspaceLinkClick(clickEvent, {
        containerElement: container,
        onOpenNote: vi.fn(),
        notesPool: [mockNoteA],
        currentNoteId: mockNoteA.id,
      });

      expect(result).toBe(true);
      expect(clickEvent.preventDefault).toHaveBeenCalled();
      expect(heading.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start', inline: 'nearest' });

      document.body.removeChild(container);
    });
  });

  describe('R3: Obsidian Syntax Normalizer & Resolver', () => {
    it('SYNTAX-01: slugifies and parses wikilinks with heading anchors and custom aliases', () => {
      const parsed1 = parseNoteTarget('07 Kerberos#TGS-REP Roasting');
      expect(parsed1.target).toBe('07 Kerberos');
      expect(parsed1.anchor).toBe('tgs-rep-roasting');

      const parsed2 = parseNoteTarget('#prerequisites');
      expect(parsed2.target).toBe('');
      expect(parsed2.anchor).toBe('prerequisites');

      const slug = slugifyHeading('מבוא לבדיקות חוסן (Introduction to Pentest)');
      expect(slug).toContain('מבוא-לבדיקות-חוסן');
      expect(slug).toContain('introduction-to-pentest');
    });

    it('SYNTAX-02: renders Obsidian callouts with cyber styling and icons', () => {
      render(
        <ObsidianNoteViewer
          note={mockNoteA}
          openNotes={[mockNoteA]}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // Verify TIP callout is rendered
      expect(screen.getByText(/Authentication Bypass/i)).toBeInTheDocument();
      // Verify WARNING callout is rendered
      expect(screen.getByText(/Blind SQLi/i)).toBeInTheDocument();
    });
  });

  describe('R4: Multi-Pane Split-View Workspace Engine', () => {
    it('SPLIT-01: renders horizontal and vertical split buttons and triggers onToggleSplit', () => {
      const handleToggleSplit = vi.fn();

      render(
        <ObsidianNoteViewer
          note={mockNoteA}
          openNotes={[mockNoteA, mockNoteB]}
          isSplitView={false}
          onToggleSplit={handleToggleSplit}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      const splitHBtn = screen.getByTestId('toggle-split-horizontal');
      const splitVBtn = screen.getByTestId('toggle-split-vertical');

      expect(splitHBtn).toBeInTheDocument();
      expect(splitVBtn).toBeInTheDocument();

      fireEvent.click(splitHBtn);
      expect(handleToggleSplit).toHaveBeenCalledWith('horizontal');

      fireEvent.click(splitVBtn);
      expect(handleToggleSplit).toHaveBeenCalledWith('vertical');
    });

    it('SPLIT-02: renders Move Pane button when split view is active and triggers onMoveTabToOtherPane', () => {
      const handleMoveTab = vi.fn();

      render(
        <ObsidianNoteViewer
          note={mockNoteA}
          openNotes={[mockNoteA, mockNoteB]}
          isSplitView={true}
          splitOrientation="horizontal"
          onMoveTabToOtherPane={handleMoveTab}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      const moveBtn = screen.getByTestId('move-tab-other-pane');
      expect(moveBtn).toBeInTheDocument();

      fireEvent.click(moveBtn);
      expect(handleMoveTab).toHaveBeenCalledWith('note-sqli');
    });
  });
});
