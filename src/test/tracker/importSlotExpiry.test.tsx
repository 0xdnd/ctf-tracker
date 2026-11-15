import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TrackerView } from '../../components/tracker/TrackerView';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const setup = (storageLoaded: boolean) => {
  window.localStorage.clear();
  useCtfStore.getState().resetFilters();
  useCtfStore.setState({
    machines: [],
    isDeepStorageLoaded: storageLoaded,
    loadCatalog: vi.fn(),
    selectedMachineId: null,
    soundEnabled: false,
    viewMode: 'kanban',
  } as never);
  useOnboardingStore.setState({
    tourDone: false, dismissedHints: [], tipsOff: true, tourActive: false, stepIndex: 0, tourStepIds: [],
    guide: null, finishedGuide: null, handsOn: null,
  });
};

const view = () => (
  <MemoryRouter initialEntries={['/tracker']}>
    <TrackerView />
  </MemoryRouter>
);

beforeEach(() => setup(false));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('tracker import slot expiry', () => {
  it('drops the placeholder after 3 s when storage never loads', () => {
    vi.useFakeTimers();
    render(view());
    expect(screen.getByTestId('import-slot')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getByTestId('import-slot')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('import-slot')).not.toBeInTheDocument();
  });

  it('starts no slot timer when storage is already loaded; the card renders as before', async () => {
    setup(true);
    const spy = vi.spyOn(globalThis, 'setTimeout');
    render(view());
    expect(await screen.findByTestId('paste-import-panel')).toBeInTheDocument();
    expect(spy.mock.calls.some((c) => c[1] === 3000)).toBe(false);
  });
});
