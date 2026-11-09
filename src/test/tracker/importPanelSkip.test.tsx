import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TrackerView, IMPORT_PANEL_HINT_ID } from '../../components/tracker/TrackerView';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const box = (id: string, name: string): Machine =>
  ({
    id, name, ip: '10.10.10.3', os: 'Linux', platform: 'HTB', difficulty: 'Easy', status: 'backlog',
    tags: [], certifications: [], timeSpentSeconds: 0,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
  }) as Machine;

const view = (url: string) => (
  <MemoryRouter initialEntries={[url]}>
    <TrackerView />
  </MemoryRouter>
);

beforeEach(() => {
  window.localStorage.clear();
  useCtfStore.getState().resetFilters();
  useCtfStore.setState({
    machines: [box('htb-lame', 'Lame'), box('htb-forest', 'Forest')],
    isDeepStorageLoaded: true,
    loadCatalog: vi.fn(),
    selectedMachineId: null,
    soundEnabled: false,
    viewMode: 'kanban',
  } as never);
  useOnboardingStore.setState({
    tourDone: false, dismissedHints: [], tipsOff: true, tourActive: false, stepIndex: 0, tourStepIds: [],
    guide: null, finishedGuide: null, handsOn: null,
  });
});
afterEach(cleanup);

describe('tracker import card skip', () => {
  it('shows with nothing solved, skip hides it for good, ?import=1 brings it back', async () => {
    const first = render(view('/tracker'));
    expect(await screen.findByTestId('paste-import-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Skip, I'm starting fresh/ }));
    expect(screen.queryByTestId('paste-import-panel')).not.toBeInTheDocument();
    expect(useOnboardingStore.getState().dismissedHints).toContain(IMPORT_PANEL_HINT_ID);

    first.unmount();
    render(view('/tracker'));
    await Promise.resolve();
    expect(screen.queryByTestId('paste-import-panel')).not.toBeInTheDocument();
    cleanup();

    render(view('/tracker?import=1'));
    expect(await screen.findByTestId('paste-import-panel')).toBeInTheDocument();
  });

  it('the Import menu entry brings the card back after a skip', async () => {
    render(view('/tracker'));
    fireEvent.click(await screen.findByRole('button', { name: /Skip, I'm starting fresh/ }));
    expect(screen.queryByTestId('paste-import-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Import solved boxes' }));
    expect(await screen.findByTestId('paste-import-panel')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/Box names/)).toHaveFocus());
  });
});
