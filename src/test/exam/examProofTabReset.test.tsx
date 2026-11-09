import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamSimulatorPage } from '../../pages/ExamSimulatorPage';
import { useExamStore } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('ExamSimulatorPage proof tab when switching boxes', () => {
  beforeEach(() => {
    useExamStore.getState().resetExam('OSCP');
    useExamStore.setState({ status: 'idle', candidateName: 'Test', candidateCallsign: 'x', osid: 'OS-1' });
    useCtfStore.setState({ soundEnabled: false });
    useExamStore.getState().startExam('OSCP');
  });

  it('opens the next box on the User tab even if the previous box was left on Root', () => {
    // Only boxes with both a user and a root flag show the tab switcher.
    const [first, second] = useExamStore.getState().boxes.filter((b) => b.userPoints > 0 && b.rootPoints > 0);
    render(
      <MemoryRouter>
        <ExamSimulatorPage />
      </MemoryRouter>
    );

    // Scope to one card: the previous drawer may still be mid exit-animation.
    const cardOf = (name: string) =>
      screen.getByRole('heading', { name }).closest('[class*="machined-edge"]') as HTMLElement;
    const userTab = (name: string) => within(cardOf(name)).getByRole('button', { name: /User Evidence/ });
    const rootTab = (name: string) => within(cardOf(name)).getByRole('button', { name: /Root Evidence/ });
    const isSelected = (el: HTMLElement) => el.className.includes('border-accent');

    const expand = (name: string) =>
      fireEvent.click(within(cardOf(name)).getByRole('button', { name: 'Expand evidence drawer' }));
    expand(first.name);
    fireEvent.click(rootTab(first.name));
    expect(isSelected(rootTab(first.name))).toBe(true);

    // Opening another box replaces the open drawer and must start on User again.
    expand(second.name);
    expect(isSelected(userTab(second.name))).toBe(true);
    expect(isSelected(rootTab(second.name))).toBe(false);
  });
});
