import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TrackerView } from '../../components/tracker/TrackerView';
import { OnboardingLayer } from '../../onboarding/OnboardingLayer';
import { FIRST_RUN_STEP_IDS } from '../../onboarding/guideMeta';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import type { Machine } from '../../types';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const box = (id: string, name: string): Machine =>
  ({
    id, name, ip: '10.10.10.3', os: 'Linux', platform: 'HTB', difficulty: 'Easy', status: 'backlog',
    tags: [], certifications: [], timeSpentSeconds: 0,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
  }) as Machine;

const IMPORT_TITLE = "Import what you've solved";

beforeEach(() => {
  window.localStorage.clear();
  useToastStore.setState({ toasts: [] });
  useCtfStore.getState().resetFilters();
  useCtfStore.setState({
    machines: [box('htb-lame', 'Lame'), box('htb-forest', 'Forest'), box('htb-sauna', 'Sauna')],
    isDeepStorageLoaded: true,
    loadCatalog: vi.fn(),
    selectedMachineId: null,
    soundEnabled: false,
    viewMode: 'kanban',
    commandPaletteOpen: false,
    backupModalOpen: false,
  } as never);
  useOnboardingStore.setState({
    tourDone: false, dismissedHints: [], tipsOff: true, tourActive: false, stepIndex: 0, tourStepIds: [],
    guide: null, finishedGuide: null, handsOn: null,
  });
  // jsdom lays nothing out: give the paste panel a box so the runner can spotlight it.
  const real = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('data-tour') !== 'import-panel') return real.call(this);
    return { top: 80, left: 20, width: 600, height: 300, right: 620, bottom: 380, x: 20, y: 80, toJSON: () => ({}) } as DOMRect;
  });
});
afterEach(() => vi.restoreAllMocks());

describe('first-run tour import step on the tracker', () => {
  it('Apply moves the tour straight to the last card, and the panel goes', async () => {
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <OnboardingLayer />
        <TrackerView />
      </MemoryRouter>,
    );
    act(() => useOnboardingStore.getState().startTour('first-run'));
    act(() => useOnboardingStore.setState({ stepIndex: FIRST_RUN_STEP_IDS.indexOf('import') }));

    const textbox = await screen.findByLabelText(/Box names/);
    const card = await screen.findByTestId('tour-card');
    await waitFor(() => expect(card).toHaveAttribute('role', 'region'));
    expect(screen.getByRole('region', { name: IMPORT_TITLE })).toBeInTheDocument();
    await waitFor(() => expect(textbox).toHaveFocus());

    fireEvent.change(textbox, { target: { value: 'Lame, Forest' } });
    fireEvent.click(screen.getByRole('button', { name: /^Apply: 2 new/ }));

    // The same act: the store write, the step change and the panel leaving all land together.
    const s = useOnboardingStore.getState();
    expect(s.tourStepIds[s.stepIndex]).toBe('final');
    expect(s.tourStepIds).toEqual([...FIRST_RUN_STEP_IDS]);
    expect(screen.queryByTestId('paste-import-panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: IMPORT_TITLE })).not.toBeInTheDocument();
    expect(useCtfStore.getState().machines.filter((m) => m.status === 'completed').map((m) => m.id)).toEqual([
      'htb-lame',
      'htb-forest',
    ]);
    expect(useToastStore.getState().toasts).toHaveLength(1);

    await waitFor(() => expect(screen.getByRole('dialog', { name: "You're set" })).toHaveAttribute('aria-modal', 'true'));
    expect(document.querySelectorAll('[aria-modal="true"]')).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus());
  });
});
