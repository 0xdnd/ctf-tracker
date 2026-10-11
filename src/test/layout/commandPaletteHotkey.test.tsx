import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Modal } from '../../components/common/Modal';
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

describe('command palette stacking above modals', () => {
  it('portals to <body> on the z-popover token (above z-modal / z-modalNested, below z-toast), never z-50', () => {
    const config = readFileSync(path.resolve(process.cwd(), 'tailwind.config.js'), 'utf8');
    const token = (name: string) => Number(new RegExp(`\\b${name}: '(\\d+)'`).exec(config)?.[1]);
    expect(token('popover')).toBeGreaterThan(token('modalNested'));
    expect(token('modalNested')).toBeGreaterThan(token('modal'));
    expect(token('popover')).toBeLessThan(token('toast'));

    // Ctrl+K while a migrated modal (Settings, MachineDetail) is open.
    const { container } = render(
      <MemoryRouter>
        <Modal open onClose={() => {}} ariaLabel="Settings" instant>
          <button type="button">inside settings</button>
        </Modal>
        <Harness />
      </MemoryRouter>
    );
    press({ key: 'k', ctrlKey: true });

    const palette = screen.getByRole('dialog', { name: 'Command palette' });
    const backdrop = palette.parentElement!;
    expect(backdrop).toHaveAttribute('data-command-palette-backdrop');
    expect(backdrop).toHaveClass('z-popover');
    expect(backdrop.className).not.toMatch(/\bz-50\b/);
    expect(backdrop.className).not.toMatch(/\b(animate-|transition)/); // instant
    expect(container.contains(backdrop)).toBe(false);
    expect(backdrop.parentElement).toBe(document.body);

    const modalBackdrop = screen.getByRole('dialog', { name: 'Settings' }).parentElement!;
    expect(modalBackdrop).toHaveClass('z-modal');

    // The palette's focus trap is on top of the stack: Esc closes the palette, not the modal underneath.
    press({ key: 'Escape' });
    expect(useCtfStore.getState().commandPaletteOpen).toBe(false);
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });
});
