import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingLayer } from './OnboardingLayer';
import { useOnboardingStore } from './useOnboardingStore';

vi.mock('./TourRunner', () => ({
  default: () => {
    throw new Error('boom');
  },
}));

describe('runner error boundary', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useOnboardingStore.setState({
      tourDone: false,
      dismissedHints: [],
      tipsOff: false,
      tourActive: false,
      stepIndex: 0,
      guide: null,
      handsOn: 'layout',
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('a crashing tour renders nothing and ends the tour', async () => {
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <OnboardingLayer />
      </MemoryRouter>,
    );
    act(() => useOnboardingStore.getState().startTour());
    await waitFor(() => expect(useOnboardingStore.getState().tourActive).toBe(false));
    expect(screen.queryByTestId('tour-overlay')).not.toBeInTheDocument();
    expect(useOnboardingStore.getState().handsOn).toBeNull();
  });

  it('a crashing guide renders nothing and clears the guide', async () => {
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <OnboardingLayer />
      </MemoryRouter>,
    );
    act(() => useOnboardingStore.getState().startGuide('vault'));
    await waitFor(() => expect(useOnboardingStore.getState().guide).toBeNull());
    expect(screen.queryByTestId('tour-overlay')).not.toBeInTheDocument();
    expect(useOnboardingStore.getState().handsOn).toBeNull();
  });
});
