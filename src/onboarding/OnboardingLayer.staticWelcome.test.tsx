import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingLayer } from './OnboardingLayer';
import { useOnboardingStore } from './useOnboardingStore';
import { useCtfStore } from '../store/useCtfStore';

// The runner chunk never resolves, as on a slow network.
vi.mock('./TourRunner', async () => {
  await new Promise(() => {});
  return { default: () => null };
});

const Where: React.FC = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
};

const renderLayer = () =>
  render(
    <MemoryRouter initialEntries={['/tracker']}>
      <OnboardingLayer />
      <Where />
    </MemoryRouter>,
  );

const addStaticCard = () => {
  const el = document.createElement('div');
  el.setAttribute('data-zb-welcome', '');
  document.body.appendChild(el);
};
const staticCard = () => document.querySelector('[data-zb-welcome]');
const intentWindow = window as Window & { __zbWelcomeIntent?: string };

describe('HTML welcome card handoff', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete intentWindow.__zbWelcomeIntent;
    useOnboardingStore.setState({ tourDone: false, tourActive: false, stepIndex: 0, guide: null });
    addStaticCard();
  });
  afterEach(() => staticCard()?.remove());

  it('covers the HTML card with the React card in the same commit, keeping it in the DOM', () => {
    // As in the app: useFirstRunTour has already started the tour when the layer mounts.
    useOnboardingStore.setState({ tourActive: true });
    renderLayer();
    expect(screen.getByTestId('tour-welcome-fallback')).toBeInTheDocument();
    expect(staticCard()).not.toBeNull();
    expect((staticCard() as HTMLElement).style.visibility).toBe('hidden');
  });

  it('drops it for good when the tour ends', () => {
    useOnboardingStore.setState({ tourActive: true });
    renderLayer();
    act(() => useOnboardingStore.getState().finishTour());
    expect(staticCard()).toBeNull();
  });

  it('removes it when no tour is going to show', () => {
    renderLayer();
    expect(staticCard()).toBeNull();
  });

  it('drops it when the page opens a modal by itself, which holds the tour back', () => {
    useOnboardingStore.setState({ tourActive: true });
    useCtfStore.setState({ selectedMachineId: 'htb-lame' });
    renderLayer();
    expect(screen.queryByTestId('tour-welcome-fallback')).toBeNull();
    expect(staticCard()).toBeNull();
    act(() => useCtfStore.setState({ selectedMachineId: null }));
  });

  it('replays Start tour pressed on the HTML card', () => {
    intentWindow.__zbWelcomeIntent = 'start';
    renderLayer();
    act(() => useOnboardingStore.getState().startTour('first-run'));
    expect(useOnboardingStore.getState().stepIndex).toBe(1);
    expect(intentWindow.__zbWelcomeIntent).toBeUndefined();
  });

  it('replays Skip: the tour ends and no card is left behind', () => {
    intentWindow.__zbWelcomeIntent = 'skip';
    renderLayer();
    act(() => useOnboardingStore.getState().startTour('first-run'));
    expect(useOnboardingStore.getState().tourActive).toBe(false);
    expect(useOnboardingStore.getState().tourDone).toBe(true);
    expect(screen.queryByTestId('tour-welcome-fallback')).toBeNull();
    expect(staticCard()).toBeNull();
  });

  it('replays Import your solved boxes', () => {
    intentWindow.__zbWelcomeIntent = 'import';
    renderLayer();
    act(() => useOnboardingStore.getState().startTour('first-run'));
    expect(useOnboardingStore.getState().tourActive).toBe(false);
    expect(screen.getByTestId('where').textContent).toBe('/tracker?import=1');
  });

  it('ignores an unknown intent', () => {
    intentWindow.__zbWelcomeIntent = 'bogus';
    renderLayer();
    act(() => useOnboardingStore.getState().startTour('first-run'));
    expect(useOnboardingStore.getState().tourActive).toBe(true);
    expect(useOnboardingStore.getState().stepIndex).toBe(0);
  });
});
