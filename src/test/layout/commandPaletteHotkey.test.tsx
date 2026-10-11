import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useTacticalHotkeys } from '../../hooks/useTacticalHotkeys';
import { CommandPalette } from '../../components/layout/CommandPalette';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
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

Element.prototype.scrollIntoView = vi.fn();

const Harness: React.FC = () => {
  useTacticalHotkeys();
  return <CommandPalette />;
};

const press = (init: KeyboardEventInit) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  });
};

afterEach(() => {
  cleanup();
  useCtfStore.setState({ commandPaletteOpen: false, reconAutomationModalOpen: false });
});

describe('Ctrl+K command palette ownership', () => {
  it('toggles exactly once per press and swallows single-key hotkeys while open', () => {
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    );

    press({ key: 'k', ctrlKey: true });
    expect(useCtfStore.getState().commandPaletteOpen).toBe(true);

    press({ key: 'p' });
    expect(useCtfStore.getState().reconAutomationModalOpen).toBe(false);

    press({ key: 'k', ctrlKey: true });
    expect(useCtfStore.getState().commandPaletteOpen).toBe(false);
  });
});
