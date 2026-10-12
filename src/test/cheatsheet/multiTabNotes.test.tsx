import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObsidianNoteViewer } from '../../components/cheatsheet/ObsidianNoteViewer';
import { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { GlobalVariables } from '../../types';

const mockGlobalVars: GlobalVariables = {
  lhost: '10.10.14.42',
  lport: '4444',
  targetIp: '10.10.11.250',
  interface: 'tun0',
  customVars: {},
};

const mockNote1: CptsNoteEntry = {
  id: 'note-00--pt',
  title: "00 - מתודולוגיית PT-צ'קליסט מלא",
  titleEn: "00 - Penetration Test Methodology Checklist",
  category: 'General Tactical',
  rawCategory: 'General Tactical',
  subCategory: 'Pre-Engagement',
  tags: ['pentest', 'methodology', 'cpts', 'checklist'],
  difficulty: 'Intermediate',
  summary: 'Comprehensive penetration testing checklist and execution methodology.',
  commands: ['nmap -sC -sV 10.10.11.250', 'whoami'],
  relPath: '00 - מתודולוגיית PT-צ\'קליסט מלא.md',
  rawMarkdown: '# 00 - מתודולוגיית PT-צ\'קליסט מלא\n\n- [ ] Pre-engagement setup\n- [x] Initial enumeration\n\n```bash\nnmap -sC -sV <TARGET_IP>\n```\n\nCheck out [[01 - Active Directory]] and [[02 - Linux PrivEsc]].',
};

const mockNote2: CptsNoteEntry = {
  id: 'note-01--ad',
  title: '01 - Active Directory Enumeration',
  titleEn: '01 - Active Directory Enumeration',
  category: 'Active Directory',
  rawCategory: 'Active Directory',
  subCategory: 'Reconnaissance',
  tags: ['ad', 'kerberos', 'bloodhound'],
  difficulty: 'Hard',
  summary: 'Domain reconnaissance and Kerberoasting tactics.',
  commands: ['bloodhound-python -u user -p pass -d domain.local -ns 10.10.11.250 -c All'],
  relPath: '01 - Active Directory Enumeration.md',
  rawMarkdown: '# 01 - Active Directory Enumeration\n\nDomain controller enumeration tactics.\n\n[[00 - מתודולוגיית PT-צ\'קליסט מלא]]',
};

const mockNote3: CptsNoteEntry = {
  id: 'note-02--privesc',
  title: '02 - Linux Privilege Escalation',
  titleEn: '02 - Linux Privilege Escalation',
  category: 'Linux Privilege Escalation',
  rawCategory: 'Linux Privilege Escalation',
  subCategory: 'SUID & Sudo',
  tags: ['linux', 'privesc', 'sudo'],
  difficulty: 'Medium',
  summary: 'Automated script enumeration and sudo abuse.',
  commands: ['sudo -l', 'find / -perm -4000 2>/dev/null'],
  relPath: '02 - Linux Privilege Escalation.md',
  rawMarkdown: '# 02 - Linux Privilege Escalation\n\nPrivilege escalation techniques.',
};

describe('Multi-Tab Note Workspace in ObsidianNoteViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TAB-01: renders multiple open tabs with active state and correct titles', () => {
    const handleSelectNote = vi.fn();
    const handleCloseTab = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2, mockNote3]}
        onSelectNote={handleSelectNote}
        onCloseTab={handleCloseTab}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    // Assert all 3 tabs are rendered in the tab strip
    const tab1 = screen.getByTestId('note-tab-note-00--pt');
    const tab2 = screen.getByTestId('note-tab-note-01--ad');
    const tab3 = screen.getByTestId('note-tab-note-02--privesc');

    expect(tab1).toBeInTheDocument();
    expect(tab2).toBeInTheDocument();
    expect(tab3).toBeInTheDocument();

    // Tab 1 is active
    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab2).toHaveAttribute('aria-selected', 'false');
    expect(tab3).toHaveAttribute('aria-selected', 'false');

    // Tab counter indicator
    expect(screen.getByText(/3 TABS/i)).toBeInTheDocument();
  });

  it('TAB-02: switches active tab when another tab is clicked', () => {
    const handleSelectNote = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2]}
        onSelectNote={handleSelectNote}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const tab2 = screen.getByTestId('note-tab-note-01--ad');
    fireEvent.click(tab2);

    expect(handleSelectNote).toHaveBeenCalledWith('note-01--ad');
  });

  it('TAB-03: closes a specific tab when clicking its close button', () => {
    const handleCloseTab = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2]}
        onCloseTab={handleCloseTab}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const closeBtn2 = screen.getByTestId('close-tab-note-01--ad');
    fireEvent.click(closeBtn2);

    expect(handleCloseTab).toHaveBeenCalledWith('note-01--ad');
  });

  it('TAB-04: opens Quick Note Picker, filters notes, and selects a new note for a tab', async () => {
    const handleNewTab = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1]}
        allAvailableNotes={[mockNote1, mockNote2, mockNote3]}
        onNewTab={handleNewTab}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    // Click "+" New Tab button
    const newTabBtn = screen.getByTestId('new-tab-button');
    fireEvent.click(newTabBtn);

    // Quick picker popover should be open
    const picker = screen.getByTestId('quick-note-picker');
    expect(picker).toBeInTheDocument();

    // Type in search box
    const searchInput = screen.getByTestId('picker-search-input');
    fireEvent.change(searchInput, { target: { value: 'Privilege' } });

    // Note 3 should be displayed in the results
    const note3Option = screen.getByTestId('picker-note-note-02--privesc');
    expect(note3Option).toBeInTheDocument();

    // Click to open Note 3 in new tab
    fireEvent.click(note3Option);
    expect(handleNewTab).toHaveBeenCalledWith(mockNote3);
  });

  it('TAB-05: keyboard shortcuts - Ctrl+W closes active tab, Ctrl+Tab cycles tabs', () => {
    const handleCloseTab = vi.fn();
    const handleSelectNote = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2, mockNote3]}
        onCloseTab={handleCloseTab}
        onSelectNote={handleSelectNote}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    // Press Ctrl+W to close active tab
    fireEvent.keyDown(window, { key: 'w', ctrlKey: true });
    expect(handleCloseTab).toHaveBeenCalledWith('note-00--pt');

    // Press Ctrl+Tab to cycle to next tab (index 0 -> index 1)
    fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true });
    expect(handleSelectNote).toHaveBeenCalledWith('note-01--ad');
  });

  it('TAB-06: Alt+1..9 hotkeys directly switch to the corresponding tab index', () => {
    const handleSelectNote = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2, mockNote3]}
        onSelectNote={handleSelectNote}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    // Press Alt+2 to switch directly to Tab 2 (mockNote2)
    fireEvent.keyDown(window, { key: '2', altKey: true });
    expect(handleSelectNote).toHaveBeenCalledWith('note-01--ad');

    // Press Alt+3 to switch directly to Tab 3 (mockNote3)
    fireEvent.keyDown(window, { key: '3', altKey: true });
    expect(handleSelectNote).toHaveBeenCalledWith('note-02--privesc');
  });

  it('TAB-07: closes all tabs when Close All button is clicked', () => {
    const handleCloseAllTabs = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2]}
        onCloseAllTabs={handleCloseAllTabs}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const closeAllBtn = screen.getByTestId('close-all-tabs-button');
    fireEvent.click(closeAllBtn);

    expect(handleCloseAllTabs).toHaveBeenCalled();
  });

  it('TAB-08: single tab close - clicking close on the only open tab triggers onCloseTab and onClose', () => {
    const handleCloseTab = vi.fn();
    const handleClose = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1]}
        onCloseTab={handleCloseTab}
        onClose={handleClose}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onNavigateToNote={vi.fn()}
      />
    );

    const closeBtn = screen.getByTestId('close-tab-note-00--pt');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    expect(handleCloseTab).toHaveBeenCalledWith('note-00--pt');
    expect(handleClose).toHaveBeenCalled();
  });

  it('TAB-09: safe Alt+W shortcut closes tab, and Alt+ArrowRight / Alt+ArrowLeft cycle tabs', () => {
    const handleCloseTab = vi.fn();
    const handleSelectNote = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2, mockNote3]}
        onCloseTab={handleCloseTab}
        onSelectNote={handleSelectNote}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    // Alt+W to close active tab
    fireEvent.keyDown(window, { key: 'w', altKey: true });
    expect(handleCloseTab).toHaveBeenCalledWith('note-00--pt');

    // Alt+ArrowRight cycles to next tab
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true });
    expect(handleSelectNote).toHaveBeenCalledWith('note-01--ad');

    // Alt+ArrowLeft cycles to previous tab (from index 0 -> index 2)
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    expect(handleSelectNote).toHaveBeenCalledWith('note-02--privesc');
  });

  it('TAB-10: tab resurrection prevention - openNotes is authoritative and does not re-add closed notes', () => {
    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote2, mockNote3]}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    expect(screen.queryByTestId('note-tab-note-00--pt')).not.toBeInTheDocument();
    expect(screen.getByTestId('note-tab-note-01--ad')).toBeInTheDocument();
    expect(screen.getByTestId('note-tab-note-02--privesc')).toBeInTheDocument();
    expect(screen.getByText(/2 TABS/i)).toBeInTheDocument();
  });

  it('TAB-11: middle-click (auxclick) on tab closes that tab', () => {
    const handleCloseTab = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2]}
        onCloseTab={handleCloseTab}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const tab2 = screen.getByTestId('note-tab-note-01--ad');
    fireEvent(tab2, new MouseEvent('auxclick', { button: 1, bubbles: true }));
    expect(handleCloseTab).toHaveBeenCalledWith('note-01--ad');
  });

  it('TAB-12: mouse wheel over tab container translates vertical deltaY to horizontal scrollLeft', () => {
    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2, mockNote3]}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const tabStrip = screen.getByTestId('tab-strip-scroll-container');
    expect(tabStrip).toBeInTheDocument();

    Object.defineProperty(tabStrip, 'scrollLeft', {
      value: 0,
      writable: true,
    });

    fireEvent.wheel(tabStrip, { deltaY: 120 });
    expect(tabStrip.scrollLeft).toBe(120);
  });

  it('TAB-13: supports docked displayMode without portal overlay and renders in-page with region role', () => {
    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2]}
        displayMode="docked"
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const region = screen.getByRole('region', { name: /Field manual note/i });
    expect(region).toBeInTheDocument();
    expect(region).toHaveClass('w-full', 'h-full');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('TAB-14: triggers onToggleDisplayMode when clicking dock/modal toggle button or pressing Alt+M', () => {
    const handleToggleDisplayMode = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2]}
        displayMode="modal"
        onToggleDisplayMode={handleToggleDisplayMode}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-dock-mode');
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(handleToggleDisplayMode).toHaveBeenCalledTimes(1);

    // Alt+M hotkey trigger
    fireEvent.keyDown(window, { key: 'm', altKey: true });
    expect(handleToggleDisplayMode).toHaveBeenCalledTimes(2);
  });

  it('TAB-15: renders popout window trigger and invokes onPopoutWindow or window.open', () => {
    const handlePopoutWindow = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2]}
        onPopoutWindow={handlePopoutWindow}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const popoutBtn = screen.getByTestId('popout-window-button');
    expect(popoutBtn).toBeInTheDocument();
    fireEvent.click(popoutBtn);
    expect(handlePopoutWindow).toHaveBeenCalledTimes(1);
  });

  it('TAB-16: opens and toggles vertical quick-tabs drawer listing all open tabs with close actions', () => {
    const handleSelectNote = vi.fn();
    const handleCloseTab = vi.fn();

    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2, mockNote3]}
        onSelectNote={handleSelectNote}
        onCloseTab={handleCloseTab}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const drawerToggle = screen.getByTestId('toggle-tabs-drawer');
    expect(drawerToggle).toBeInTheDocument();
    expect(screen.queryByTestId('tabs-drawer-popover')).not.toBeInTheDocument();

    // Open drawer
    fireEvent.click(drawerToggle);
    const popover = screen.getByTestId('tabs-drawer-popover');
    expect(popover).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE NOTE TABS \(3\)/i)).toBeInTheDocument();

    // Close button inside drawer for tab 3
    const drawerCloseTab3 = screen.getByTestId('drawer-close-tab-note-02--privesc');
    fireEvent.click(drawerCloseTab3);
    expect(handleCloseTab).toHaveBeenCalledWith('note-02--privesc');

    // Click tab item inside drawer for tab 2
    const drawerItemTab2 = screen.getByTestId('drawer-tab-item-note-01--ad');
    fireEvent.click(drawerItemTab2);
    expect(handleSelectNote).toHaveBeenCalledWith('note-01--ad');
    // Drawer auto-closes after selecting tab
    expect(screen.queryByTestId('tabs-drawer-popover')).not.toBeInTheDocument();
  });

  it('TAB-17: scales reader font size with A- / A+ buttons and persists to localStorage', () => {
    localStorage.clear();
    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1]}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const decreaseBtn = screen.getByTestId('decrease-font-size-button');
    const increaseBtn = screen.getByTestId('increase-font-size-button');
    const indicator = screen.getByTestId('font-size-indicator');

    expect(indicator).toHaveTextContent(/base/i);

    // Increase to lg
    fireEvent.click(increaseBtn);
    expect(indicator).toHaveTextContent(/lg/i);
    expect(localStorage.getItem('zerobox_note_font_size')).toBe('lg');

    // Increase to xl
    fireEvent.click(increaseBtn);
    expect(indicator).toHaveTextContent(/xl/i);
    expect(localStorage.getItem('zerobox_note_font_size')).toBe('xl');

    // Decrease back to lg
    fireEvent.click(decreaseBtn);
    expect(indicator).toHaveTextContent(/lg/i);
  });

  it('TAB-18: toggles maximize / restore mode via button click and Alt+F shortcut', () => {
    const handleToggleMaximize = vi.fn();

    const { rerender } = render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1]}
        isMaximized={false}
        onToggleMaximize={handleToggleMaximize}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const maxBtn = screen.getByTestId('toggle-maximize-button');
    expect(maxBtn).toBeInTheDocument();

    fireEvent.click(maxBtn);
    expect(handleToggleMaximize).toHaveBeenCalledTimes(1);

    // Press Alt+F
    fireEvent.keyDown(window, { key: 'f', altKey: true });
    expect(handleToggleMaximize).toHaveBeenCalledTimes(2);

    // When maximized, displays Restore state
    rerender(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1]}
        isMaximized={true}
        onToggleMaximize={handleToggleMaximize}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/Restore view/i)).toBeInTheDocument();
  });

  it('TAB-19: tab scroll chevrons trigger horizontal scrolling on tabStripScrollRef', () => {
    render(
      <ObsidianNoteViewer
        note={mockNote1}
        openNotes={[mockNote1, mockNote2, mockNote3]}
        globalVars={mockGlobalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
      />
    );

    const leftChevron = screen.getByLabelText('Scroll tabs left');
    const rightChevron = screen.getByLabelText('Scroll tabs right');
    const scrollContainer = screen.getByTestId('tab-strip-scroll-container');

    const scrollBySpy = vi.fn();
    scrollContainer.scrollBy = scrollBySpy;

    fireEvent.click(rightChevron);
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 180, behavior: 'smooth' });

    fireEvent.click(leftChevron);
    expect(scrollBySpy).toHaveBeenCalledWith({ left: -180, behavior: 'smooth' });
  });
});
