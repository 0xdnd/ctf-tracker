import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuideControls } from './GuideControls';
import { OnboardingLayer } from './OnboardingLayer';
import { useOnboardingStore } from './useOnboardingStore';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { useNotesWorkspaceStore } from '../store/useNotesWorkspaceStore';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useTacticalHotkeys } from '../hooks/useTacticalHotkeys';

const reset = () => {
  window.localStorage.clear();
  // A launch left waiting by an earlier test must not land in this one.
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
  });
  useNotesWorkspaceStore.setState({ isOpen: false });
};

const Where: React.FC = () => <div data-testid="where">{useLocation().pathname}</div>;
const Hotkeys: React.FC = () => {
  useTacticalHotkeys();
  return null;
};

const renderAt = (path: string, extra?: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OnboardingLayer />
      <Where />
      {extra}
    </MemoryRouter>,
  );

const anchors: HTMLElement[] = [];
const addAnchor = (name: string) => {
  const el = document.createElement('div');
  el.setAttribute('data-tour', name);
  el.getBoundingClientRect = () =>
    ({ top: 50, left: 20, width: 100, height: 40, right: 120, bottom: 90, x: 20, y: 50, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);
  anchors.push(el);
  return el;
};

/** Presses Next until the guide's last step, then Done. */
const finishSteps = () => {
  while (screen.queryByRole('button', { name: 'Next' })) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
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

/** jsdom has no PointerEvent, and fireEvent falls back to one without coordinates. */
class TestPointerEvent extends MouseEvent {
  public pointerId: number;
  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

beforeEach(reset);
afterEach(() => {
  anchors.splice(0).forEach((el) => el.remove());
  setPhone(false);
  vi.restoreAllMocks();
});

describe('Show full guide button', () => {
  it('sits with Replay and Reset, closes the host modal and opens Guide Center', () => {
    const onBefore = vi.fn();
    render(<GuideControls onBeforeReplay={onBefore} />);
    expect(screen.getByRole('button', { name: 'Replay tour' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset tips' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show full guide' }));
    expect(onBefore).toHaveBeenCalledTimes(1);
    expect(useOnboardingStore.getState().guideCenterOpen).toBe(true);
  });
});

describe('Guide Center', () => {
  it('lists all 22 guides with done checks and overall progress', async () => {
    useOnboardingStore.setState({ completedGuides: ['methodology', 'vault'] });
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().openGuideCenter());
    const dialog = await screen.findByRole('dialog', { name: 'Full guide' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.querySelectorAll('[data-guide-row]')).toHaveLength(22);
    expect(screen.getByRole('img', { name: '2 of 22 guides done' })).toBeInTheDocument();
    expect(dialog.querySelector('[data-guide-row="methodology"]')).toHaveTextContent('Done');
    expect(dialog.querySelector('[data-guide-row="analytics"]')).not.toHaveTextContent('Done');
  });

  it('Escape closes it and focus stays inside while it is open', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().openGuideCenter());
    const dialog = await screen.findByTestId('guide-center');
    await waitFor(() => expect(dialog).toHaveFocus());

    // A modal finishing its exit hands focus back to its old opener. The center takes it back.
    act(() => outside.focus());
    expect(dialog).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useOnboardingStore.getState().guideCenterOpen).toBe(false);
    await waitFor(() => expect(screen.queryByTestId('guide-center')).not.toBeInTheDocument());
    outside.remove();
  });

  it('disabled guides explain why, and do nothing when pressed', async () => {
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().openGuideCenter());
    const dialog = await screen.findByTestId('guide-center');
    const examRow = dialog.querySelector('[data-guide-row="exam-room"]') as HTMLElement;
    expect(examRow).toHaveAttribute('aria-disabled', 'true');
    expect(examRow).toHaveTextContent('Exam room');
    expect(examRow).not.toHaveTextContent('Your exam is running');
    expect(examRow).toHaveTextContent('Opens while an exam is running');
    fireEvent.click(examRow);
    const machineRow = dialog.querySelector('[data-guide-row="machine"]') as HTMLElement;
    expect(machineRow).toHaveAttribute('aria-disabled', 'true');
    expect(machineRow).toHaveTextContent('Pick a machine first');
    fireEvent.click(machineRow);
    expect(useOnboardingStore.getState()).toMatchObject({ guideCenterOpen: true, launchPending: null, guide: null });
    expect(useExamStore.getState().status).toBe('idle');
    expect(screen.getByTestId('where')).toHaveTextContent('/tracker');
  });

  it('holds page tips and the backup reminder while it is open', async () => {
    renderAt('/vault');
    expect(screen.getByTestId('page-hint')).toBeInTheDocument();
    act(() => useOnboardingStore.getState().openGuideCenter());
    await screen.findByTestId('guide-center');
    expect(screen.queryByTestId('page-hint')).not.toBeInTheDocument();
    expect(useOnboardingStore.getState().hintShowing).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.getByTestId('page-hint')).toBeInTheDocument());
  });

  it('blocks tactical hotkeys while open and while a launch is pending', async () => {
    useOnboardingStore.setState({ dismissedHints: ['methodology'] });
    renderAt('/tracker', <Hotkeys />);
    act(() => useOnboardingStore.getState().openGuideCenter());
    await screen.findByTestId('guide-center');
    fireEvent.keyDown(window, { key: '?' });
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(useCtfStore.getState().shortcutsModalOpen).toBe(false);
    expect(useCtfStore.getState().commandPaletteOpen).toBe(false);

    fireEvent.keyDown(window, { key: 'Escape' });
    act(() => useOnboardingStore.setState({ launchPending: 'methodology' }));
    fireEvent.keyDown(document.body, { key: '?' });
    expect(useCtfStore.getState().shortcutsModalOpen).toBe(false);
    act(() => useOnboardingStore.setState({ launchPending: null }));

    fireEvent.keyDown(document.body, { key: '?' });
    await waitFor(() => expect(useCtfStore.getState().shortcutsModalOpen).toBe(true));
  });
});

describe('launchGuide', () => {
  it('closes the center, navigates, waits for the anchor, then starts', async () => {
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().openGuideCenter());
    let launch!: Promise<boolean>;
    await act(async () => {
      launch = useOnboardingStore.getState().launchGuide('methodology');
      await Promise.resolve();
    });
    expect(useOnboardingStore.getState()).toMatchObject({ guideCenterOpen: false, launchPending: 'methodology', guide: null });
    expect(screen.getByTestId('guide-launch-shield')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/methodology'), { timeout: 10000 });
    // Page changed, anchor not rendered yet: still waiting.
    expect(useOnboardingStore.getState().guide).toBeNull();
    expect(useOnboardingStore.getState().launchPending).toBe('methodology');
    addAnchor('methodology-tabs');
    await act(async () => {
      await expect(launch).resolves.toBe(true);
    });
    expect(useOnboardingStore.getState()).toMatchObject({ launchPending: null, guide: { id: 'methodology', stepIndex: 0 } });
    expect(await screen.findByRole('heading', { name: 'Switch views' })).toBeInTheDocument();
    expect(screen.queryByTestId('guide-launch-shield')).not.toBeInTheDocument();
  });

  it('does not accept the old page anchor while that page animates out', async () => {
    // /cheatsheets and /notes share CheatsheetView, so the same anchor exists on both.
    const old = addAnchor('notes-page-import');
    renderAt('/cheatsheets');
    let launch!: Promise<boolean>;
    await act(async () => {
      launch = useOnboardingStore.getState().launchGuide('field-manual');
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/notes'), { timeout: 10000 });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    // The old element is still mounted, as it is during an AnimatePresence exit. It must not count.
    expect(old.isConnected).toBe(true);
    expect(useOnboardingStore.getState().guide).toBeNull();
    old.remove();
    addAnchor('notes-page-import');
    await act(async () => {
      await expect(launch).resolves.toBe(true);
    });
    expect(useOnboardingStore.getState().guide?.id).toBe('field-manual');
  });

  it('accepts an anchor already on screen when no navigation is needed', async () => {
    addAnchor('vault-search');
    renderAt('/vault');
    await act(async () => {
      await expect(useOnboardingStore.getState().launchGuide('vault')).resolves.toBe(true);
    });
    expect(useOnboardingStore.getState().guide?.id).toBe('vault');
    expect(screen.getByTestId('where')).toHaveTextContent('/vault');
  });

  it('opens a modal guide through its store flag and starts only once the anchor is there', async () => {
    renderAt('/tracker');
    let launch!: Promise<boolean>;
    await act(async () => {
      launch = useOnboardingStore.getState().launchGuide('settings');
      await waitFor(() => expect(useCtfStore.getState().settingsModalOpen).toBe(true), { timeout: 10000 });
    });
    expect(useOnboardingStore.getState().guide).toBeNull();
    addAnchor('settings-themes');
    await act(async () => {
      await expect(launch).resolves.toBe(true);
    });
    expect(useOnboardingStore.getState().guide?.id).toBe('settings');
    expect(screen.getByTestId('where')).toHaveTextContent('/tracker');
  });

  it('opens the right Backup tab for each of its two guides', async () => {
    renderAt('/tracker');
    addAnchor('bulk-input');
    await act(async () => {
      await useOnboardingStore.getState().launchGuide('bulk-import');
    });
    expect(useCtfStore.getState().backupModalOpen).toBe(true);
    expect(useOnboardingStore.getState().requestedBackupTab).toBe('bulk_pwn');
  });

  it('closes an open modal before running a route guide', async () => {
    useCtfStore.setState({ settingsModalOpen: true });
    addAnchor('vault-search');
    renderAt('/tracker');
    await act(async () => {
      await useOnboardingStore.getState().launchGuide('vault');
    });
    expect(useCtfStore.getState().settingsModalOpen).toBe(false);
    expect(screen.getByTestId('where')).toHaveTextContent('/vault');
  });

  it('refuses a disabled guide outright, and never starts an exam', async () => {
    renderAt('/tracker');
    useOnboardingStore.setState({ guideCenterOpen: true });
    await act(async () => {
      await expect(useOnboardingStore.getState().launchGuide('exam-room')).resolves.toBe(false);
    });
    expect(useOnboardingStore.getState()).toMatchObject({ guide: null, launchPending: null, guideCenterOpen: true });
    expect(useExamStore.getState().status).toBe('idle');
    expect(screen.getByTestId('where')).toHaveTextContent('/tracker');
  });

  it('joins a running exam without touching it', async () => {
    useExamStore.setState({ status: 'running' });
    addAnchor('exam-room-clock');
    renderAt('/tracker');
    await act(async () => {
      await useOnboardingStore.getState().launchGuide('exam-room');
    });
    expect(screen.getByTestId('where')).toHaveTextContent('/exam');
    expect(useExamStore.getState().status).toBe('running');
    expect(useOnboardingStore.getState().guide?.id).toBe('exam-room');
  });

  it('uses the active target for a machine guide', async () => {
    useCtfStore.setState({ activeTargetId: 'box-1' });
    addAnchor('machine-summary');
    renderAt('/tracker');
    await act(async () => {
      await useOnboardingStore.getState().launchGuide('machine');
    });
    expect(screen.getByTestId('where')).toHaveTextContent('/target/box-1');
  });

  it('runs the palette guide, which has no anchors, as centered steps that can finish', async () => {
    renderAt('/tracker');
    const palette = document.createElement('div');
    palette.setAttribute('role', 'dialog');
    palette.setAttribute('aria-modal', 'true');
    document.body.appendChild(palette);
    anchors.push(palette);
    await act(async () => {
      await useOnboardingStore.getState().launchGuide('palette');
    });
    expect(await screen.findByRole('heading', { name: 'Type to search' })).toBeInTheDocument();
    expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument();
    finishSteps();
    expect(useOnboardingStore.getState().completedGuides).toEqual(['palette']);
  });

  it('a guide with no anchor waits for its own dialog, not the closing Guide Center', async () => {
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().openGuideCenter());
    await screen.findByTestId('guide-center');
    let launch!: Promise<boolean>;
    await act(async () => {
      launch = useOnboardingStore.getState().launchGuide('palette');
      await waitFor(() => expect(useCtfStore.getState().commandPaletteOpen).toBe(true), { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 80));
    });
    // Guide Center is still mounted and animating out here, and it is a modal dialog itself.
    expect(screen.getByTestId('guide-center')).toHaveAttribute('aria-modal', 'true');
    expect(useCtfStore.getState().commandPaletteOpen).toBe(true);
    expect(useOnboardingStore.getState().guide).toBeNull();

    const palette = document.createElement('div');
    palette.setAttribute('role', 'dialog');
    palette.setAttribute('aria-modal', 'true');
    document.body.appendChild(palette);
    anchors.push(palette);
    await act(async () => {
      await expect(launch).resolves.toBe(true);
    });
    expect(useOnboardingStore.getState().guide?.id).toBe('palette');
  });

  it('Escape calls off a launch on its way, and a late anchor then changes nothing', async () => {
    renderAt('/tracker');
    let launch!: Promise<boolean>;
    await act(async () => {
      launch = useOnboardingStore.getState().launchGuide('methodology');
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/methodology'), { timeout: 10000 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useOnboardingStore.getState().launchPending).toBeNull();
    addAnchor('methodology-tabs');
    await act(async () => {
      await expect(launch).resolves.toBe(false);
    });
    expect(useOnboardingStore.getState().guide).toBeNull();
  });

  it('Escape closes the guide, not the modal under it', async () => {
    const TrappedModal: React.FC = () => {
      const [open, setOpen] = useState(true);
      const ref = useFocusTrap<HTMLDivElement>({ isActive: open, onClose: () => setOpen(false) });
      if (!open) return <div data-testid="modal-closed" />;
      return (
        <div ref={ref} data-testid="host-modal">
          <button type="button">inside</button>
        </div>
      );
    };
    addAnchor('settings-themes');
    renderAt('/tracker', <TrappedModal />);
    await act(async () => {
      await useOnboardingStore.getState().launchGuide('settings');
    });
    await screen.findByTestId('tour-card');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useOnboardingStore.getState().guide).toBeNull();
    expect(screen.getByTestId('host-modal')).toBeInTheDocument();
    expect(useOnboardingStore.getState().completedGuides).toEqual([]);
  });
});

describe('finish moment', () => {
  it('Done shows the finish state, suggests the next guide, and that button launches it', async () => {
    addAnchor('methodology-tabs');
    renderAt('/methodology');
    act(() => useOnboardingStore.getState().startGuide('methodology'));
    await screen.findByTestId('tour-card');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    const finish = await screen.findByTestId('guide-finish');
    expect(finish).toHaveAttribute('role', 'dialog');
    expect(screen.getByRole('heading', { name: 'Methodology done' })).toBeInTheDocument();
    expect(finish).toHaveTextContent('Next up: Reverse shells.');
    await waitFor(() => expect(screen.getByRole('img', { name: '1 of 22 guides done' })).toBeInTheDocument());
    expect(useOnboardingStore.getState().hintShowing).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Start next guide' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/reverse-shell'), { timeout: 10000 });
    addAnchor('rs-details');
    await waitFor(() => expect(useOnboardingStore.getState().guide?.id).toBe('reverse-shells'), { timeout: 3000 });
  });

  it('Close and Escape leave the finish moment, and the guide stays finished', async () => {
    renderAt('/analytics');
    useOnboardingStore.setState({ dismissedHints: ['analytics'] });
    addAnchor('analytics-totals');
    act(() => useOnboardingStore.getState().startGuide('analytics'));
    await screen.findByTestId('tour-card');
    finishSteps();
    await screen.findByTestId('guide-finish');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('guide-finish')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState()).toMatchObject({ finishedGuide: null, completedGuides: ['analytics'] });
  });

  it('tells you when nothing is left to run', async () => {
    const ids = ['methodology', 'reverse-shells', 'cheatsheets', 'field-manual', 'writeup', 'vault', 'analytics', 'exam', 'graph', 'palette', 'new-machine', 'backup', 'bulk-import', 'notes-import', 'notes', 'snippets-drawer', 'revshell'];
    useOnboardingStore.setState({ completedGuides: ids, dismissedHints: ['settings'] });
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startGuide('settings'));
    await screen.findByTestId('tour-card');
    finishSteps();
    const finish = await screen.findByTestId('guide-finish');
    expect(finish).toHaveTextContent('That was the last one');
    expect(screen.queryByRole('button', { name: 'Start next guide' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(useOnboardingStore.getState().finishedGuide).toBeNull();
  });
});

describe('phone sheet', () => {
  beforeEach(() => {
    setPhone(true);
    (window as unknown as { PointerEvent: unknown }).PointerEvent = TestPointerEvent;
    // jsdom has no layout. Give the sheet a phone-sized place to sit, or nothing can clear it.
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
  });

  const startPhoneGuide = async () => {
    addAnchor('vault-search');
    useOnboardingStore.setState({ dismissedHints: ['vault'] });
    renderAt('/vault');
    act(() => useOnboardingStore.getState().startGuide('vault'));
    return screen.findByTestId('tour-card');
  };

  it('renders docked to the bottom, with the spotlight on', async () => {
    const card = await startPhoneGuide();
    expect(card).toHaveAttribute('data-dock', 'bottom');
    expect(card).toHaveAttribute('role', 'dialog');
    expect(await screen.findByTestId('tour-spotlight')).toBeInTheDocument();
  });

  it('docks to the top when the target cannot clear the sheet, and swipes away upward', async () => {
    const low = addAnchor('vault-search');
    low.getBoundingClientRect = () =>
      ({ top: 650, left: 20, width: 100, height: 40, right: 120, bottom: 690, x: 20, y: 650, toJSON: () => ({}) }) as DOMRect;
    useOnboardingStore.setState({ dismissedHints: ['vault'] });
    renderAt('/vault');
    act(() => useOnboardingStore.getState().startGuide('vault'));
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveAttribute('data-dock', 'top'));
    fireEvent(card, new TestPointerEvent('pointerdown', { bubbles: true, clientY: 100, button: 0 }));
    fireEvent(card, new TestPointerEvent('pointermove', { bubbles: true, clientY: 60 }));
    fireEvent(card, new TestPointerEvent('pointerup', { bubbles: true, clientY: 20 }));
    await waitFor(() => expect(useOnboardingStore.getState().guide).toBeNull());
  });

  it('a fast swipe closes the guide without finishing it', async () => {
    const card = await startPhoneGuide();
    await waitFor(() => expect(card).toHaveStyle({ opacity: '1' }));
    fireEvent(card, new TestPointerEvent('pointerdown', { bubbles: true, clientY: 600, button: 0 }));
    fireEvent(card, new TestPointerEvent('pointermove', { bubbles: true, clientY: 640 }));
    fireEvent(card, new TestPointerEvent('pointerup', { bubbles: true, clientY: 680 }));
    await waitFor(() => expect(useOnboardingStore.getState().guide).toBeNull());
    expect(useOnboardingStore.getState().completedGuides).toEqual([]);
    expect(useOnboardingStore.getState().dismissedHints).toContain('vault');
  });

  it('a small press stays a tap: no drag, and the guide stays up', async () => {
    const card = await startPhoneGuide();
    fireEvent(card, new TestPointerEvent('pointerdown', { bubbles: true, clientY: 600, button: 0 }));
    fireEvent(card, new TestPointerEvent('pointermove', { bubbles: true, clientY: 603 }));
    fireEvent(card, new TestPointerEvent('pointerup', { bubbles: true, clientY: 603 }));
    expect(useOnboardingStore.getState().guide?.id).toBe('vault');
  });

  it('a second finger does not take over the drag', async () => {
    const card = await startPhoneGuide();
    fireEvent(card, new TestPointerEvent('pointerdown', { bubbles: true, clientY: 600, button: 0, pointerId: 1 }));
    fireEvent(card, new TestPointerEvent('pointerdown', { bubbles: true, clientY: 100, button: 0, pointerId: 2 }));
    fireEvent(card, new TestPointerEvent('pointermove', { bubbles: true, clientY: 500, pointerId: 2 }));
    fireEvent(card, new TestPointerEvent('pointerup', { bubbles: true, clientY: 800, pointerId: 2 }));
    expect(useOnboardingStore.getState().guide?.id).toBe('vault');
  });

  it('a hidden anchor settles at once: no spotlight and no wait', async () => {
    const hidden = addAnchor('sidebar-nav');
    hidden.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startTour());
    act(() => useOnboardingStore.setState({ stepIndex: 1 }));
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveStyle({ opacity: '1' }), { timeout: 500 });
    expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument();
  });

  it('hands-on steps stay modal on a phone', async () => {
    addAnchor('tracker-views');
    renderAt('/tracker');
    act(() => useOnboardingStore.getState().startTour());
    act(() => useOnboardingStore.setState({ stepIndex: 2 }));
    const card = await screen.findByTestId('tour-card');
    await screen.findByTestId('tour-spotlight');
    expect(card).toHaveAttribute('role', 'dialog');
    expect(useOnboardingStore.getState().handsOn).toBeNull();
  });
});
