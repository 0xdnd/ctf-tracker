import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OnboardingLayer } from './OnboardingLayer';
import { FIRST_RUN_STEP_IDS, SECTION_GUIDES, TOUR_STEPS, guideIdForPath } from './content';
import { useOnboardingStore } from './useOnboardingStore';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { useNotesWorkspaceStore } from '../store/useNotesWorkspaceStore';

const resetStores = () => {
  window.localStorage.clear();
  useOnboardingStore.setState({
    tourDone: false,
    dismissedHints: [],
    tipsOff: false,
    tourActive: false,
    stepIndex: 0,
    guide: null,
    finishedGuide: null,
    guideCenterOpen: false,
    launchPending: null,
    handsOn: null,
    requestedBackupTab: null,
    backupTab: null,
  });
  useExamStore.setState({ status: 'idle' });
  useCtfStore.setState({
    viewMode: 'kanban',
    selectedMachineId: null,
    commandPaletteOpen: false,
    backupModalOpen: false,
    settingsModalOpen: false,
    revShellModalOpen: false,
    snippetsDrawerOpen: false,
    shortcutsModalOpen: false,
    newMachineModalOpen: false,
    notesImportModalOpen: false,
    // Nothing solved, so every tour keeps its import step and the indexes below hold.
    machines: [],
  });
  useNotesWorkspaceStore.setState({ isOpen: false });
};

const Where: React.FC = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OnboardingLayer />
      <Where />
    </MemoryRouter>,
  );

const anchors: HTMLElement[] = [];
const addAnchor = (name: string, r = { top: 50, left: 20, width: 100, height: 200 }) => {
  const el = document.createElement('div');
  el.setAttribute('data-tour', name);
  el.getBoundingClientRect = () =>
    ({ ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);
  anchors.push(el);
  return el;
};

const startTourAt = (stepIndex: number, kind: 'first-run' | 'full' = 'full') => {
  act(() => useOnboardingStore.getState().startTour(kind));
  act(() => useOnboardingStore.setState({ stepIndex }));
};

const setPhone = (phone: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: phone
      ? (query: string) => ({
          matches: query.includes('max-width: 767px'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        })
      : undefined,
  });
};

afterEach(() => {
  anchors.splice(0).forEach((el) => el.remove());
  document.documentElement.style.removeProperty('--app-zoom');
  setPhone(false);
});

describe('guideIdForPath', () => {
  it('maps guided routes and ignores the rest', () => {
    expect(guideIdForPath('/vault/')).toBe('vault');
    expect(guideIdForPath('/cheatsheets')).toBe('cheatsheets');
    expect(guideIdForPath('/writeup/abc')).toBe('writeup');
    expect(guideIdForPath('/target/x')).toBe('machine');
    expect(guideIdForPath('/reverse-shell/')).toBe('reverse-shells');
    expect(guideIdForPath('/tracker')).toBeNull();
  });
});

describe('guide content', () => {
  it('every spotlight anchor in the content exists as a data-tour attribute in the source', async () => {
    const files = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const source = Object.entries(files)
      .filter(([path]) => !path.includes('.test.'))
      .map(([, text]) => text)
      .join('\n');
    const anchorsUsed = new Set<string>();
    TOUR_STEPS.forEach((s) => s.anchor && anchorsUsed.add(s.anchor));
    Object.values(SECTION_GUIDES).forEach((g) => g.steps?.forEach((s) => s.anchor && anchorsUsed.add(s.anchor)));
    for (const name of anchorsUsed) {
      expect(source, `missing data-tour="${name}"`).toMatch(new RegExp(`(data-tour="${name}"|overflowAnchor="${name}"|tourAnchor="${name}")`));
    }
  });
});

describe('section guides', () => {
  beforeEach(resetStores);

  it('a page tip shows once and stays dismissed', () => {
    const first = renderAt('/analytics');
    expect(screen.getByRole('region', { name: 'Analytics' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    expect(useOnboardingStore.getState().dismissedHints).toContain('analytics');
    first.unmount();
    renderAt('/analytics');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
  });

  it('offers Show me and Not now, and Not now is remembered', () => {
    const first = renderAt('/vault');
    expect(screen.getByRole('button', { name: 'Show me' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    first.unmount();
    renderAt('/vault');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
  });

  it('Show me runs the section steps, and finishing marks the guide as seen', async () => {
    addAnchor('vault-search');
    renderAt('/vault');
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    await screen.findByTestId('tour-card');
    expect(screen.getByRole('heading', { name: 'Search your vault' })).toBeInTheDocument();
    while (screen.queryByRole('button', { name: 'Next' })) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByTestId('tour-card')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState().dismissedHints).toContain('vault');
    expect(useOnboardingStore.getState().guide).toBeNull();
  });

  it('Esc closes a running guide and marks it seen', async () => {
    renderAt('/exam');
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
    await screen.findByTestId('tour-card');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('tour-card')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState().dismissedHints).toContain('exam');
  });

  it("Don't show tips turns every guide off", () => {
    renderAt('/exam');
    fireEvent.click(screen.getByRole('button', { name: "Don't show tips" }));
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    expect(useOnboardingStore.getState().tipsOff).toBe(true);
  });

  it('is hidden while a modal is open, then appears when it closes', () => {
    renderAt('/vault');
    expect(screen.getByTestId('page-hint')).toBeInTheDocument();
    act(() => useCtfStore.getState().setShortcutsModalOpen(true));
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    act(() => useCtfStore.getState().setShortcutsModalOpen(false));
    expect(screen.getByTestId('page-hint')).toBeInTheDocument();
  });

  it('is hidden on unguided routes', () => {
    renderAt('/tracker');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
  });

  it('queues behind the main tour and appears once the tour ends', async () => {
    renderAt('/writeup');
    expect(screen.getByTestId('page-hint')).toBeInTheDocument();
    act(() => useOnboardingStore.getState().startTour());
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    await screen.findByTestId('tour-card');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    act(() => useOnboardingStore.getState().finishTour());
    await waitFor(() => expect(screen.getByTestId('page-hint')).toBeInTheDocument());
  });

  it('opening the notes panel offers the notes guide first, then the route guide', () => {
    renderAt('/vault');
    act(() => useNotesWorkspaceStore.setState({ isOpen: true }));
    expect(screen.getByRole('region', { name: 'Notes panel' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByRole('region', { name: 'Vault' })).toBeInTheDocument();
  });

  it('shows the backup intro over the backup modal on first open only', () => {
    renderAt('/tracker');
    act(() => useCtfStore.getState().setBackupModalOpen(true));
    expect(screen.getByRole('region', { name: 'Backup' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    act(() => useCtfStore.getState().setBackupModalOpen(false));
    act(() => useCtfStore.getState().setBackupModalOpen(true));
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
  });

  it('Reset tips and Replay tour clear seen guides and any running guide', () => {
    useOnboardingStore.setState({ dismissedHints: ['vault', 'exam'], tipsOff: true, guide: { id: 'vault', stepIndex: 1 } });
    useOnboardingStore.getState().resetTips();
    expect(useOnboardingStore.getState()).toMatchObject({ dismissedHints: [], tipsOff: false, guide: null });
    useOnboardingStore.setState({ guide: { id: 'vault', stepIndex: 0 } });
    useOnboardingStore.getState().replayTour();
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: true, guide: null });
  });
});

describe('tour', () => {
  beforeEach(resetStores);

  it('opens on a welcome screen with Start tour and Skip', async () => {
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startTour());
    await screen.findByTestId('tour-card');
    expect(screen.getByRole('heading', { name: 'Welcome to ZeroBox' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(screen.getByRole('heading', { name: 'Find your way around' })).toBeInTheDocument();
    expect(screen.getByTestId('tour-progress')).toHaveAttribute('aria-valuemax', String(TOUR_STEPS.length));
  });

  it('the first run shows the short list in its progress', async () => {
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startTour('first-run'));
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(screen.getByTestId('tour-progress')).toHaveAttribute('aria-valuemax', String(FIRST_RUN_STEP_IDS.length));
    expect(screen.getByTestId('tour-progress')).toHaveAttribute('aria-valuemax', '5');
  });

  it('Skip on the welcome screen ends the tour for good', async () => {
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startTour());
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => expect(screen.queryByTestId('tour-card')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true });
  });

  it('Esc skips the tour and restores focus to the previous element', async () => {
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <button type="button">opener</button>
        <OnboardingLayer />
      </MemoryRouter>,
    );
    const opener = screen.getByRole('button', { name: 'opener' });
    opener.focus();
    act(() => useOnboardingStore.getState().startTour());
    await screen.findByTestId('tour-card');
    expect(screen.getByRole('dialog', { name: 'Welcome to ZeroBox' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('tour-card')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true });
    expect(opener).toHaveFocus();
  });

  it('Next and Back move between steps', async () => {
    renderAt('/tracker');
    startTourAt(1);
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Change how machines look' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Find your way around' })).toBeInTheDocument();
  });

  it('falls back to a card with no spotlight when the anchor is missing', async () => {
    renderAt('/tracker');
    startTourAt(1);
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveStyle({ opacity: '1' }), { timeout: 3000 });
    expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument();
  });

  it('spotlights a present anchor, dividing its rect by the app zoom', async () => {
    document.documentElement.style.setProperty('--app-zoom', '0.5');
    addAnchor('sidebar-nav');
    renderAt('/tracker');
    startTourAt(1);
    const spot = await screen.findByTestId('tour-spotlight');
    // 100 / 0.5 = 200 wide plus 6px padding each side.
    expect(spot).toHaveStyle({ width: '212px', height: '412px', top: '94px', left: '34px' });
  });
});

describe('more guides', () => {
  beforeEach(resetStores);

  const cases: [string, () => void, string][] = [
    ['add-machine modal', () => useCtfStore.getState().setNewMachineModalOpen(true), 'Add a machine'],
    ['notes import modal', () => useCtfStore.getState().setNotesImportModalOpen(true), 'Import notes'],
    ['settings modal', () => useCtfStore.getState().setSettingsModalOpen(true), 'Settings'],
    ['machine quick view', () => useCtfStore.getState().setSelectedMachineId('x'), 'Quick view'],
    ['reverse shell crafter', () => useCtfStore.getState().setRevShellModalOpen(true), 'Reverse shell crafter'],
    ['snippets drawer', () => useCtfStore.getState().setSnippetsDrawerOpen(true), 'Snippets drawer'],
    ['graph view', () => useCtfStore.getState().setViewMode('graph'), 'Graph view'],
  ];
  it.each(cases)('%s is explained the first time it opens', (_n, open, title) => {
    renderAt('/tracker');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    act(open);
    expect(screen.getByRole('region', { name: title })).toBeInTheDocument();
  });

  it('the bulk import tab gets its own guide', () => {
    renderAt('/tracker');
    act(() => {
      useOnboardingStore.getState().setBackupTab('bulk_pwn');
      useCtfStore.getState().setBackupModalOpen(true);
    });
    expect(screen.getByRole('region', { name: 'Bulk import' })).toBeInTheDocument();
  });

  it('the /notes page, focus mode and the running exam room have guides', () => {
    const a = renderAt('/notes');
    expect(screen.getByRole('region', { name: 'Field manual' })).toBeInTheDocument();
    a.unmount();
    act(() => useCtfStore.setState({ machines: [{ id: 'abc', name: 'Abc', isActive: false } as never], isCatalogLoaded: true }));
    const b = renderAt('/target/abc/focus');
    expect(screen.getByRole('region', { name: 'Focus mode' })).toBeInTheDocument();
    b.unmount();
    act(() => useExamStore.setState({ status: 'running' }));
    renderAt('/exam');
    expect(screen.getByRole('region', { name: 'Your exam is running' })).toBeInTheDocument();
  });
});

describe('hands-on steps', () => {
  beforeEach(resetStores);

  it('layout step is non-modal, passes hotkeys, and advances when the layout changes', async () => {
    addAnchor('layout-switcher');
    renderAt('/tracker');
    startTourAt(2);
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveAttribute('role', 'region'));
    expect(card).not.toHaveAttribute('aria-modal');
    expect(useOnboardingStore.getState().handsOn).toBe('layout');
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();

    act(() => useCtfStore.getState().setViewMode('table'));
    await waitFor(() => expect(useOnboardingStore.getState().stepIndex).toBe(3), { timeout: 3000 });
  });

  it('Esc still skips on a non-modal step', async () => {
    addAnchor('layout-switcher');
    renderAt('/tracker');
    startTourAt(2);
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveAttribute('role', 'region'));
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(useOnboardingStore.getState().tourActive).toBe(false));
    expect(useOnboardingStore.getState().tourDone).toBe(true);
  });

  it('machine step advances after a machine is opened and closes it again', async () => {
    addAnchor('tracker-board');
    renderAt('/tracker');
    startTourAt(3);
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveAttribute('role', 'region'));
    act(() => useCtfStore.getState().setSelectedMachineId('some-machine'));
    await waitFor(() => expect(useOnboardingStore.getState().stepIndex).toBe(4), { timeout: 3000 });
    expect(useCtfStore.getState().selectedMachineId).toBeNull();
  });

  it('palette step lets the palette open, then closes it and advances', async () => {
    addAnchor('command-palette');
    renderAt('/tracker');
    startTourAt(4);
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveAttribute('role', 'region'));
    expect(useOnboardingStore.getState().handsOn).toBe('palette');
    act(() => useCtfStore.getState().setCommandPaletteOpen(true));
    await waitFor(() => expect(useOnboardingStore.getState().stepIndex).toBe(5), { timeout: 3000 });
    expect(useCtfStore.getState().commandPaletteOpen).toBe(false);
    expect(useOnboardingStore.getState().dismissedHints).toContain('palette');
  });

  it('Next skips a hands-on step without doing it', async () => {
    addAnchor('layout-switcher');
    renderAt('/tracker');
    startTourAt(2);
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(useOnboardingStore.getState().stepIndex).toBe(3);
  });

  it('a hands-on step with a missing anchor falls back to a modal card', async () => {
    renderAt('/tracker');
    startTourAt(2);
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveStyle({ opacity: '1' }), { timeout: 3000 });
    expect(card).toHaveAttribute('role', 'dialog');
    expect(useOnboardingStore.getState().handsOn).toBeNull();
  });
});

describe('import step', () => {
  beforeEach(resetStores);
  const fullAt = TOUR_STEPS.findIndex((st) => st.id === 'import');
  const firstRunAt = FIRST_RUN_STEP_IDS.indexOf('import');
  const TITLE = "Import what you've solved";

  /** A stand-in for the paste panel: the anchor, with a text box inside. */
  const addPanel = () => {
    const panel = addAnchor('import-panel', { top: 80, left: 20, width: 600, height: 300 });
    const box = document.createElement('textarea');
    box.setAttribute('aria-label', 'Box names');
    panel.appendChild(box);
    return box;
  };

  it('sits just before the final step in both tours', () => {
    expect(fullAt).toBe(TOUR_STEPS.length - 2);
    expect(firstRunAt).toBe(FIRST_RUN_STEP_IDS.length - 2);
  });

  it('with the panel on the page it is hands-on: no buttons but Skip for now, and the text box has focus', async () => {
    const box = addPanel();
    renderAt('/tracker');
    startTourAt(firstRunAt, 'first-run');
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveAttribute('role', 'region'));
    expect(card).not.toHaveAttribute('aria-modal');
    expect(screen.getByRole('heading', { name: TITLE })).toBeInTheDocument();
    expect(useOnboardingStore.getState().handsOn).toBe('import');
    expect(screen.queryByRole('button', { name: 'Open the importer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(box));
  });

  it('without the panel it is a centered dialog, and Open the importer goes to the tracker importer', async () => {
    renderAt('/vault');
    startTourAt(fullAt);
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveStyle({ opacity: '1' }), { timeout: 3000 });
    expect(card).toHaveAttribute('role', 'dialog');
    expect(card).toHaveAttribute('aria-modal', 'true');
    expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open the importer' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/tracker?import=1');
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true });
    expect(useCtfStore.getState().backupModalOpen).toBe(false);
    expect(useOnboardingStore.getState().requestedBackupTab).toBeNull();
  });

  it('Skip for now moves on to the final step', async () => {
    addPanel();
    renderAt('/tracker');
    startTourAt(firstRunAt, 'first-run');
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(useOnboardingStore.getState().stepIndex).toBe(firstRunAt + 1);
    expect(screen.getByRole('heading', { name: "You're set" })).toBeInTheDocument();
  });

  it('Esc ends the tour from the hands-on step', async () => {
    addPanel();
    renderAt('/tracker');
    startTourAt(firstRunAt, 'first-run');
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveAttribute('role', 'region'));
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(useOnboardingStore.getState().tourActive).toBe(false));
    expect(useOnboardingStore.getState().tourDone).toBe(true);
  });

  it('on a phone it is a plain card with Open the importer, never hands-on', async () => {
    setPhone(true);
    addPanel();
    renderAt('/tracker');
    startTourAt(firstRunAt, 'first-run');
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveStyle({ opacity: '1' }), { timeout: 3000 });
    expect(card).toHaveAttribute('role', 'dialog');
    expect(screen.queryByRole('region', { name: TITLE })).not.toBeInTheDocument();
    expect(useOnboardingStore.getState().handsOn).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open the importer' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/tracker?import=1');
    expect(useOnboardingStore.getState().tourActive).toBe(false);
  });
});

describe('final step', () => {
  beforeEach(resetStores);
  const last = TOUR_STEPS.length - 1;

  it('shows three actions plus Done', async () => {
    renderAt('/tracker');
    startTourAt(last);
    await screen.findByTestId('tour-card');
    expect(screen.getByRole('heading', { name: "You're set" })).toBeInTheDocument();
    for (const name of ['Add your first machine', 'Import your notes', 'Try the exam simulator', 'Done']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('Add your first machine opens the add-machine modal and ends the tour', async () => {
    renderAt('/tracker');
    startTourAt(last);
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Add your first machine' }));
    expect(useCtfStore.getState().newMachineModalOpen).toBe(true);
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true });
  });

  it('Import your notes opens the notes import modal', async () => {
    renderAt('/tracker');
    startTourAt(last);
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Import your notes' }));
    expect(useCtfStore.getState().notesImportModalOpen).toBe(true);
    expect(useOnboardingStore.getState().tourActive).toBe(false);
  });

  it('Try the exam simulator navigates to /exam', async () => {
    renderAt('/tracker');
    startTourAt(last);
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Try the exam simulator' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/exam');
    expect(useOnboardingStore.getState().tourActive).toBe(false);
  });

  it('Done just ends the tour', async () => {
    renderAt('/tracker');
    startTourAt(last);
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true });
    expect(useCtfStore.getState().newMachineModalOpen).toBe(false);
  });
});
