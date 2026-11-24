import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TrackerView } from '../../components/tracker/TrackerView';
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

beforeEach(() => {
  window.localStorage.clear();
  useCtfStore.getState().resetFilters();
  useCtfStore.setState({
    machines: [box('htb-lame', 'Lame')],
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

describe('first run shows one import prompt', () => {
  it('keeps the import banner away while the welcome card is up, and shows it once that is closed', async () => {
    useOnboardingStore.setState({ tourActive: true, stepIndex: 0 });
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <TrackerView />
      </MemoryRouter>,
    );
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByTestId('import-banner')).not.toBeInTheDocument();

    act(() => useOnboardingStore.setState({ tourActive: false, tourDone: true }));
    expect(await screen.findByTestId('import-banner')).toBeInTheDocument();
  });
});
