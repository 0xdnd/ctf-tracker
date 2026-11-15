import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loads = vi.hoisted(() => ({ count: 0 }));

/** A fresh layer per test: its lazy runner import and the shared settle promise are module state. */
async function setup() {
  vi.resetModules();
  // Counts requests for the runner chunk. It never resolves, so the welcome card is the only thing on screen.
  vi.doMock('./TourRunner', async () => {
    loads.count += 1;
    await new Promise(() => {});
    return { default: () => null };
  });
  const { OnboardingLayer } = await import('./OnboardingLayer');
  const { useOnboardingStore } = await import('./useOnboardingStore');
  useOnboardingStore.setState({ tourDone: false, tourActive: false, stepIndex: 0, guide: null });
  render(
    <MemoryRouter initialEntries={['/tracker']}>
      <OnboardingLayer />
    </MemoryRouter>,
  );
  act(() => useOnboardingStore.getState().startTour('first-run'));
  return useOnboardingStore;
}

const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });

describe('the runner chunk waits for the first paint to settle', () => {
  beforeEach(() => {
    loads.count = 0;
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('paints the welcome card first and requests the runner only after the settle', async () => {
    await setup();
    expect(screen.getByTestId('tour-welcome-fallback')).toBeInTheDocument();
    expect(loads.count).toBe(0);
    await settle();
    expect(loads.count).toBe(1);
    expect(screen.getByTestId('tour-welcome-fallback')).toBeInTheDocument();
  });

  it('Start tour before the settle mounts the runner at once', async () => {
    const store = await setup();
    expect(loads.count).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(loads.count).toBe(1);
    expect(store.getState().stepIndex).toBe(1);
  });

  it('Skip before the settle never requests the runner', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await settle();
    expect(loads.count).toBe(0);
    expect(screen.queryByTestId('tour-welcome-fallback')).toBeNull();
  });
});
