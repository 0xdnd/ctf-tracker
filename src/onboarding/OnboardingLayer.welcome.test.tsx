import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingLayer } from './OnboardingLayer';
import { useOnboardingStore } from './useOnboardingStore';

// The runner chunk never resolves, as on a slow network: the welcome card must still appear.
vi.mock('./TourRunner', async () => {
  await new Promise(() => {});
  return { default: () => null };
});

const renderLayer = () =>
  render(
    <MemoryRouter initialEntries={['/tracker']}>
      <OnboardingLayer />
    </MemoryRouter>,
  );

describe('welcome while the runner chunk loads', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useOnboardingStore.setState({ tourDone: false, tourActive: false, stepIndex: 0, guide: null });
  });

  it('shows the welcome card right away and Start tour advances the tour', () => {
    renderLayer();
    act(() => useOnboardingStore.getState().startTour());
    expect(screen.getByTestId('tour-welcome-fallback')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Welcome to ZeroBox' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(useOnboardingStore.getState().stepIndex).toBe(1);
  });

  it('Skip on the fallback ends the tour', () => {
    renderLayer();
    act(() => useOnboardingStore.getState().startTour());
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true });
  });
});
