import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OnboardingLayer } from './OnboardingLayer';
import { FIRST_RUN_STEP_IDS } from './content';
import { useOnboardingStore } from './useOnboardingStore';
import { useCtfStore } from '../store/useCtfStore';

// Framer Motion reads prefers-reduced-motion once per module load, so this lives in its own file.
const REDUCED_QUERY = 'prefers-reduced-motion';

describe('import step with prefers-reduced-motion', () => {
  let anchor: HTMLElement;

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes(REDUCED_QUERY),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }),
    });
    useCtfStore.setState({ machines: [], commandPaletteOpen: false });
    anchor = document.createElement('div');
    anchor.setAttribute('data-tour', 'import-panel');
    anchor.getBoundingClientRect = () =>
      ({ top: 80, left: 20, width: 600, height: 300, right: 620, bottom: 380, x: 20, y: 80, toJSON: () => ({}) }) as DOMRect;
    const box = document.createElement('textarea');
    box.setAttribute('aria-label', 'Box names');
    anchor.appendChild(box);
    document.body.appendChild(anchor);
  });

  afterEach(() => {
    anchor.remove();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: undefined });
    act(() => useOnboardingStore.setState({ tourActive: false, tourDone: false, stepIndex: 0 }));
  });

  it('shows the step copy without sliding it in', async () => {
    const seen: string[] = [];
    const record = () => {
      document.querySelectorAll('#tour-title').forEach((h) => seen.push(h.getAttribute('style') || ''));
    };
    const observer = new MutationObserver(record);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <OnboardingLayer />
      </MemoryRouter>,
    );
    act(() => useOnboardingStore.getState().startTour('first-run'));
    act(() => useOnboardingStore.setState({ stepIndex: FIRST_RUN_STEP_IDS.indexOf('import') - 1 }));
    await screen.findByTestId('tour-card');
    await waitFor(() => expect(screen.getByTestId('tour-card')).toHaveStyle({ opacity: '1' }), { timeout: 3000 });
    act(() => useOnboardingStore.getState().next());

    const heading = await screen.findByRole('heading', { name: "Import what you've solved" });
    await waitFor(() => expect(heading).toHaveStyle({ opacity: '1' }), { timeout: 3000 });
    record();
    observer.disconnect();
    expect(seen.length).toBeGreaterThan(0);
    // A sliding step starts offset on x (translateX(14px)); with reduced motion it only fades.
    expect(seen.filter((v) => /translate/.test(v) && !/translate\(?X?\(?0(px)?\)/.test(v))).toEqual([]);
  });
});
