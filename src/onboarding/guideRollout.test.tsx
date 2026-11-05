import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GUIDE_META, TOUR_STEPS, guideSteps, resolveStep, type TourStep } from './content';
import { GUIDE_COUNT, GUIDE_GROUPS, GUIDE_ORDER, guideAvailability } from './guideRegistry';
import { OnboardingLayer } from './OnboardingLayer';
import { useOnboardingStore } from './useOnboardingStore';
import { KeyboardShortcutsModal } from '../components/common/KeyboardShortcutsModal';
import { SettingsModal } from '../components/common/SettingsModal';
import { MobileNav } from '../components/layout/MobileNav';
import { useTacticalHotkeys } from '../hooks/useTacticalHotkeys';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { useNotesWorkspaceStore } from '../store/useNotesWorkspaceStore';

const reset = () => {
  window.localStorage.clear();
  useOnboardingStore.getState().cancelLaunch();
  useOnboardingStore.setState({
    tourDone: true,
    dismissedHints: [],
    completedGuides: [],
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
    hintShowing: false,
  });
  useExamStore.setState({ status: 'idle' });
  useCtfStore.setState({
    viewMode: 'kanban',
    selectedMachineId: null,
    activeTargetId: null,
    commandPaletteOpen: false,
    backupModalOpen: false,
    settingsModalOpen: false,
    revShellModalOpen: false,
    snippetsDrawerOpen: false,
    shortcutsModalOpen: false,
    newMachineModalOpen: false,
    notesImportModalOpen: false,
    mobileMenuOpen: false,
  });
  useNotesWorkspaceStore.setState({ isOpen: false });
};

const Hotkeys: React.FC = () => {
  useTacticalHotkeys();
  return null;
};

const renderAt = (path: string, extra?: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OnboardingLayer />
      {extra}
    </MemoryRouter>,
  );

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

const anchors: HTMLElement[] = [];
const addAnchor = (name: string, size = 40) => {
  const el = document.createElement('div');
  el.setAttribute('data-tour', name);
  el.getBoundingClientRect = () =>
    ({ top: 50, left: 20, width: size * 2, height: size, right: 20 + size * 2, bottom: 50 + size, x: 20, y: 50, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);
  anchors.push(el);
  return el;
};

beforeEach(reset);
afterEach(() => {
  anchors.splice(0).forEach((el) => el.remove());
  setPhone(false);
  vi.restoreAllMocks();
});

const everyStep: { where: string; step: TourStep }[] = [
  ...TOUR_STEPS.map((step) => ({ where: `tour/${step.id}`, step })),
  ...GUIDE_ORDER.flatMap((id) => guideSteps(id).map((step) => ({ where: `${id}/${step.id}`, step }))),
];

/** Steps meant to have no spotlight at any size, and why. */
const CENTERED_BY_DESIGN = new Set([
  // Welcome and closing cards of the tour.
  'tour/welcome',
  'tour/final',
  // CommandPalette.tsx holds another piece of work, so it cannot carry anchors yet.
  'palette/palette-type',
  'palette/palette-pick',
  'palette/palette-open',
]);

describe('guide anchors', () => {
  const files = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const source = Object.entries(files)
    .filter(([path]) => !path.includes('.test.'))
    .map(([, text]) => text)
    .join('\n');
  const exists = (name: string) =>
    source.includes(`data-tour="${name}"`) || source.includes(`overflowAnchor="${name}"`) || source.includes(`tourAnchor="${name}"`);

  it.each(everyStep)('$where points at an anchor in the source, or is explicitly centered', ({ where, step }) => {
    if (!step.anchor) {
      expect(CENTERED_BY_DESIGN.has(where), `${where} has no anchor and is not listed as centered`).toBe(true);
      return;
    }
    for (const name of [step.anchor, step.altAnchor, step.phoneAnchor]) {
      if (name) expect(exists(name), `${where}: no data-tour="${name}" in the source`).toBe(true);
    }
  });

  it('keeps every guide on the same number of steps at both sizes', () => {
    for (const id of GUIDE_ORDER) {
      const steps = guideSteps(id);
      expect(steps.map((s) => resolveStep(s, true).id)).toEqual(steps.map((s) => resolveStep(s, false).id));
    }
  });

  it('a phone gets its own anchor and copy, and a phone-centered step loses its spotlight', () => {
    const reveal = guideSteps('vault').find((s) => s.id === 'vault-reveal')!;
    expect(resolveStep(reveal, false).anchor).toBe('vault-reveal');
    expect(resolveStep(reveal, true)).toMatchObject({ anchor: 'vault-menu', body: reveal.phoneBody });
    const palette = TOUR_STEPS.find((s) => s.id === 'palette')!;
    expect(resolveStep(palette, false).anchor).toBe('command-palette');
    expect(resolveStep(palette, true).anchor).toBeUndefined();
  });
});

describe('guide copy', () => {
  const copyAt = (isPhone: boolean) =>
    everyStep.map(({ where, step }) => {
      const s = resolveStep(step, isPhone);
      return { where, text: `${s.title} ${s.body} ${s.altTitle ?? ''} ${s.altBody ?? ''}` };
    });
  const intros = Object.values(GUIDE_META).map((m) => ({ where: `intro/${m.id}`, text: m.intro }));
  const all = [...copyAt(false), ...copyAt(true), ...intros];

  it.each(all)('$where has no em-dash, hover or command text', ({ where, text }) => {
    expect(text, where).not.toMatch(/[—–]/);
    expect(text, where).not.toMatch(/\bhover/i);
    expect(text, where).not.toMatch(/`|\$\(|--\w|\bsudo\b|\bnmap\b|\bnetcat\b|\bmsfvenom\b/i);
  });

  it.each([...copyAt(true), ...intros])('$where says nothing a phone cannot do', ({ where, text }) => {
    expect(text, where).not.toMatch(/\b(Ctrl|Cmd|Alt)\+|\barrow keys\b|\bkeys \d|\bEsc\b|\bscroll to\b|\bright-click\b|\bsidebar\b/i);
    expect(text, where).not.toMatch(/\bclick\b/i);
    expect(text, where).not.toMatch(/\bdrop\b/i);
  });

  it('keeps titles short and steps to one idea', () => {
    for (const { where, step } of everyStep) {
      for (const isPhone of [false, true]) {
        const s = resolveStep(step, isPhone);
        expect(s.title.split(' ').length, `${where} title`).toBeLessThanOrEqual(7);
        expect(s.body.split(/(?<=[.?!])\s/).length, `${where} body`).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe('guide cards', () => {
  it('a page tip is the shared card, with its two ways forward', () => {
    renderAt('/analytics');
    const hint = screen.getByTestId('page-hint');
    expect(hint).toHaveAttribute('data-trap-companion');
    expect(hint.className).toContain('rounded-2xl');
    expect(within(hint).getByRole('heading', { name: 'Analytics' }).className).toContain('text-[17px]');
    expect(within(hint).getByRole('button', { name: 'Show me' })).toBeInTheDocument();
    expect(within(hint).getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('every page tip offers the guide now that every guide has steps', () => {
    renderAt('/analytics');
    expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
    expect(useOnboardingStore.getState().guide).toEqual({ id: 'analytics', stepIndex: 0 });
  });

  it('the welcome card keeps the tour working in the shared style', async () => {
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startTour());
    const card = await screen.findByTestId('tour-card');
    expect(within(card).getByRole('heading', { name: 'Welcome to ZeroBox' }).className).toContain('text-[17px]');
    fireEvent.click(within(card).getByRole('button', { name: 'Start tour' }));
    expect(screen.getByRole('heading', { name: 'Find your way around' })).toBeInTheDocument();
  });
});

describe('spotlight targets', () => {
  it('a step falls back to its stand-in at once when its main anchor is not on the page', async () => {
    addAnchor('analytics-totals');
    addAnchor('analytics-empty');
    useOnboardingStore.setState({ dismissedHints: ['analytics'] });
    renderAt('/analytics');
    act(() => useOnboardingStore.getState().startGuide('analytics'));
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // No anchor wait: the card is back well inside the 1.5s a missing anchor would otherwise take.
    await waitFor(() => expect(screen.getByTestId('tour-card')).toHaveStyle({ opacity: '1' }), { timeout: 400 });
    expect(screen.getByTestId('tour-spotlight')).toBeInTheDocument();
  });

  it('lights the copy that is on screen when an anchor exists once per screen size', async () => {
    setPhone(true);
    // The desktop panel comes first in the page, and is hidden at this size.
    addAnchor('notes-list-toggle', 0);
    addAnchor('notes-list-toggle');
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
    useOnboardingStore.setState({ dismissedHints: ['notes'] });
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startGuide('notes'));
    await screen.findByTestId('tour-card');
    expect(await screen.findByTestId('tour-spotlight')).toBeInTheDocument();
  });

  it('phone copy reaches the card, and its sizing layer', async () => {
    setPhone(true);
    addAnchor('notes-list-toggle');
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
    useOnboardingStore.setState({ dismissedHints: ['notes'] });
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startGuide('notes'));
    const card = await screen.findByTestId('tour-card');
    expect(card).toHaveTextContent('This button shows or hides your notes and cheatsheets.');
    expect(card).not.toHaveTextContent('Alt+K');
  });
});

describe('name-only machines', () => {
  it('a stand-in step says what is really on the page', async () => {
    addAnchor('machine-header');
    useOnboardingStore.setState({ dismissedHints: ['machine'] });
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startGuide('machine'));
    const card = await screen.findByTestId('tour-card');
    expect(within(card).getByRole('heading', { name: 'Track this machine' })).toBeInTheDocument();
    expect(card).toHaveTextContent('still active on Hack The Box');
    expect(card.querySelector('[role="status"]')).toHaveTextContent('Track this machine');
  });

  it('the main copy runs when its control is on the page', async () => {
    addAnchor('machine-header');
    addAnchor('machine-summary');
    useOnboardingStore.setState({ dismissedHints: ['machine'] });
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startGuide('machine'));
    const card = await screen.findByTestId('tour-card');
    expect(within(card).getByRole('heading', { name: 'Check where you stand' })).toBeInTheDocument();
  });

  it('the focus guide is shut for an active machine, because the app offers no focus mode there', () => {
    const { machines } = useCtfStore.getState();
    useCtfStore.setState({ activeTargetId: 'active-box', machines: [{ ...machines[0], id: 'active-box', isActive: true }, ...machines] });
    const status = guideAvailability('focus');
    expect(status.available).toBe(false);
    expect(status.available === false && status.reason).toMatch(/not for active machines/i);
    expect(guideAvailability('machine').available).toBe(true);
    useCtfStore.setState({ activeTargetId: null, machines });
  });
});

describe('Guide Center groups', () => {
  it('lists every guide once, under an area, in the order they are suggested', () => {
    expect(GUIDE_GROUPS.flatMap((g) => g.guides)).toEqual(GUIDE_ORDER);
    expect(new Set(GUIDE_ORDER).size).toBe(GUIDE_COUNT);
    for (const group of GUIDE_GROUPS) expect(group.guides.length, group.id).toBeGreaterThan(0);
  });

  it('shows each group with a count of what is done, and overall progress', async () => {
    useOnboardingStore.setState({ completedGuides: ['methodology', 'vault', 'analytics'] });
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().openGuideCenter());
    const dialog = await screen.findByTestId('guide-center');
    expect(dialog.querySelectorAll('[data-guide-group]')).toHaveLength(GUIDE_GROUPS.length);
    const records = within(dialog.querySelector('[data-guide-group="records"]') as HTMLElement);
    expect(records.getByRole('heading', { name: 'Your records' })).toBeInTheDocument();
    expect(records.getByText('2 of 3 done')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `3 of ${GUIDE_COUNT} guides done` })).toBeInTheDocument();
  });

  it('launches a guide from a group row', async () => {
    addAnchor('vault-search');
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().openGuideCenter());
    const dialog = await screen.findByTestId('guide-center');
    fireEvent.click(dialog.querySelector('[data-guide-row="vault"]') as HTMLElement);
    await waitFor(() => expect(useOnboardingStore.getState().guide?.id).toBe('vault'), { timeout: 10000 });
  });
});

describe('guides that need context', () => {
  it('a target guide says to pick a machine first, and opens the active one when there is one', () => {
    for (const id of ['machine', 'focus', 'machine-quick']) {
      const status = guideAvailability(id);
      expect(status.available, id).toBe(false);
      expect(status.available === false && status.reason, id).toMatch(/pick a machine first/i);
    }
    useCtfStore.setState({ activeTargetId: 'htb-lame' });
    for (const id of ['machine', 'focus', 'machine-quick']) expect(guideAvailability(id).available, id).toBe(true);
  });

  it('the exam room stays disabled outside an exam, and no guide can start one', async () => {
    const start = vi.spyOn(useExamStore.getState(), 'startExam');
    renderAt('/tracker');
    await act(async () => {
      await expect(useOnboardingStore.getState().launchGuide('exam-room')).resolves.toBe(false);
    });
    expect(useExamStore.getState().status).toBe('idle');
    addAnchor('exam-tracks');
    await act(async () => {
      await expect(useOnboardingStore.getState().launchGuide('exam')).resolves.toBe(true);
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(useExamStore.getState().status).toBe('idle');
    expect(start).not.toHaveBeenCalled();
  });
});

describe('entry points', () => {
  it('the mobile More menu opens Guide Center and closes itself', () => {
    useCtfStore.setState({ mobileMenuOpen: true });
    render(
      <MemoryRouter>
        <MobileNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Full guide' }));
    expect(useOnboardingStore.getState().guideCenterOpen).toBe(true);
    expect(useCtfStore.getState().mobileMenuOpen).toBe(false);
  });

  it('the shortcuts sheet opens Guide Center and closes itself', () => {
    useCtfStore.setState({ shortcutsModalOpen: true });
    render(<KeyboardShortcutsModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Show full guide' }));
    expect(useOnboardingStore.getState().guideCenterOpen).toBe(true);
    expect(useCtfStore.getState().shortcutsModalOpen).toBe(false);
  });

  it('Settings opens Guide Center and closes itself', async () => {
    useCtfStore.setState({ settingsModalOpen: true });
    render(
      <MemoryRouter>
        <SettingsModal />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Show full guide' }));
    expect(useOnboardingStore.getState().guideCenterOpen).toBe(true);
    expect(useCtfStore.getState().settingsModalOpen).toBe(false);
  });
});

describe('keys while a guide surface is up', () => {
  /** A page or modal with its own listener, like the command palette running its selection on Enter. */
  const pageKey = vi.fn();
  beforeEach(() => {
    pageKey.mockClear();
    window.addEventListener('keydown', pageKey);
    document.addEventListener('keydown', pageKey);
  });
  afterEach(() => {
    window.removeEventListener('keydown', pageKey);
    document.removeEventListener('keydown', pageKey);
  });
  const press = (key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(document.body, { key, ...init });

  it('reach the page when nothing is up', () => {
    renderAt('/tracker');
    press('/');
    expect(pageKey).toHaveBeenCalled();
  });

  it.each([
    ['/'],
    ['1'],
    ['Enter'],
    ['ArrowDown'],
    ['z'],
  ])('stop before the page while Guide Center is open: %s', async (key) => {
    renderAt('/tracker', <Hotkeys />);
    act(() => useOnboardingStore.getState().openGuideCenter());
    await screen.findByTestId('guide-center');
    press(key, key === 'z' ? { ctrlKey: true } : {});
    expect(pageKey).not.toHaveBeenCalled();
    expect(useCtfStore.getState().viewMode).toBe('kanban');
  });

  it('stop before the page while a launch is pending, while page tips stay down', async () => {
    renderAt('/vault', <Hotkeys />);
    expect(screen.getByTestId('page-hint')).toBeInTheDocument();
    act(() => useOnboardingStore.setState({ launchPending: 'methodology' }));
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    press('?');
    press('k', { ctrlKey: true });
    expect(pageKey).not.toHaveBeenCalled();
    expect(useCtfStore.getState().shortcutsModalOpen).toBe(false);
    expect(useCtfStore.getState().commandPaletteOpen).toBe(false);
    act(() => useOnboardingStore.setState({ launchPending: null }));
    await waitFor(() => expect(screen.getByTestId('page-hint')).toBeInTheDocument());
    press('?');
    expect(pageKey).toHaveBeenCalled();
  });

  it('stop before the page under a running guide, and Escape still closes the guide', async () => {
    addAnchor('vault-search');
    useOnboardingStore.setState({ dismissedHints: ['vault'] });
    renderAt('/vault');
    act(() => useOnboardingStore.getState().startGuide('vault'));
    await screen.findByTestId('tour-card');
    press('Enter');
    expect(pageKey).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(useOnboardingStore.getState().guide).toBeNull());
  });

  it('a hands-on step keeps its keys', async () => {
    addAnchor('layout-switcher');
    renderAt('/tracker', <Hotkeys />);
    act(() => useOnboardingStore.getState().startTour());
    act(() => useOnboardingStore.setState({ stepIndex: 2 }));
    await waitFor(() => expect(useOnboardingStore.getState().handsOn).toBe('layout'));
    press('2');
    expect(pageKey).toHaveBeenCalled();
    act(() => useOnboardingStore.getState().finishTour());
  });
});

