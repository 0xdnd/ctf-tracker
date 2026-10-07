import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useTacticalHotkeys } from '../../hooks/useTacticalHotkeys';
import { KeyboardShortcutsModal } from '../../components/common/KeyboardShortcutsModal';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';

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

const Harness: React.FC = () => {
  useTacticalHotkeys();
  const open = useCtfStore((s) => s.shortcutsModalOpen);
  return open ? <KeyboardShortcutsModal /> : null;
};

const press = (init: KeyboardEventInit) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  });
};

/**
 * Hotkey map: every binding listed in the cheat sheet -> the key event that triggers it and,
 * where it can be observed without extra seeding, the store effect proving the binding is
 * wired in useTacticalHotkeys. `wired` entries need state we do not seed here (an active
 * target, file downloads) and are only asserted to be a known binding.
 */
interface Binding {
  init: KeyboardEventInit;
  check?: () => boolean;
}

const ctf = () => useCtfStore.getState();

const HOTKEY_MAP: Record<string, Binding> = {
  '1': { init: { key: '1' }, check: () => ctf().viewMode === 'kanban' },
  '2': { init: { key: '2' }, check: () => ctf().viewMode === 'grid' },
  '3': { init: { key: '3' }, check: () => ctf().viewMode === 'table' },
  '4': { init: { key: '4' }, check: () => ctf().viewMode === 'graph' },
  j: { init: { key: 'j' } },
  'Alt+↓': { init: { key: 'ArrowDown', altKey: true } },
  k: { init: { key: 'k' } },
  'Alt+↑': { init: { key: 'ArrowUp', altKey: true } },
  Space: { init: { key: ' ' } },
  '/': { init: { key: '/' } },
  'Ctrl+S': { init: { key: 's', ctrlKey: true } },
  'Ctrl+P': { init: { key: 'p', ctrlKey: true }, check: () => ctf().reportMachineId !== null },
  'Alt+S': { init: { key: 's', altKey: true }, check: () => ctf().snippetsDrawerOpen },
  'Alt+E': { init: { key: 'e', altKey: true }, check: () => useExamStore.getState().isQuickDrawerOpen },
  'Alt+N': { init: { key: 'n', altKey: true }, check: () => useNotesWorkspaceStore.getState().isOpen },
  'Alt+R': { init: { key: 'r', altKey: true }, check: () => ctf().revShellModalOpen },
  'Alt+O': { init: { key: 'o', altKey: true }, check: () => useAuthStore.getState().operatorProfileModalOpen },
  t: { init: { key: 't' }, check: () => ctf().isTimerRunning },
  u: { init: { key: 'u' } },
  r: { init: { key: 'r' } },
  p: { init: { key: 'p' }, check: () => ctf().reconAutomationModalOpen },
  v: { init: { key: 'v' } },
  '-': { init: { key: '-' } },
  '+': { init: { key: '+' } },
  '0': { init: { key: '0' }, check: () => ctf().uiScale === 'normal' },
  'Ctrl+K': { init: { key: 'k', ctrlKey: true }, check: () => ctf().commandPaletteOpen },
  '?': { init: { key: '?', shiftKey: true }, check: () => ctf().shortcutsModalOpen },
  Esc: { init: { key: 'Escape' } },
};

const MODIFIERS = new Set(['Ctrl', 'Alt', 'Shift']);

/** Binding labels shown by the modal, normalising "Ctrl"+"S" rows to "Ctrl+S". */
const listedBindings = (): string[] => {
  const labels: string[] = [];
  document.querySelectorAll('div.p-2\\.5').forEach((row) => {
    const keys = Array.from(row.querySelectorAll('kbd')).map((k) => k.textContent || '');
    if (keys.length === 0) return;
    if (MODIFIERS.has(keys[0])) labels.push(keys.join('+'));
    else labels.push(...keys);
  });
  return labels;
};

const resetSlices = () => {
  useCtfStore.setState({
    soundEnabled: false,
    shortcutsModalOpen: false,
    commandPaletteOpen: false,
    snippetsDrawerOpen: false,
    revShellModalOpen: false,
    reconAutomationModalOpen: false,
    reportMachineId: null,
    isTimerRunning: false,
    viewMode: 'kanban',
    uiScale: 'large',
  });
  useExamStore.setState({ isQuickDrawerOpen: false });
  useAuthStore.setState({ operatorProfileModalOpen: false });
  useNotesWorkspaceStore.setState({ isOpen: false });
};

describe('Keyboard shortcuts cheat sheet', () => {
  beforeEach(() => {
    resetSlices();
    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  afterEach(cleanup);

  const setup = () =>
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );

  it('opens when "?" is pressed and closes on Escape', () => {
    setup();
    expect(document.querySelectorAll('kbd').length).toBe(0);
    press({ key: '?', shiftKey: true });
    expect(useCtfStore.getState().shortcutsModalOpen).toBe(true);
    expect(document.querySelectorAll('kbd').length).toBeGreaterThan(10);
    press({ key: 'Escape' });
    expect(useCtfStore.getState().shortcutsModalOpen).toBe(false);
  });

  it('does not open on "?" while typing in an input', () => {
    render(
      <MemoryRouter>
        <Harness />
        <input data-testid="typing" />
      </MemoryRouter>,
    );
    screen.getByTestId('typing').focus();
    press({ key: '?', shiftKey: true });
    expect(useCtfStore.getState().shortcutsModalOpen).toBe(false);
  });

  it('every listed binding exists in the hotkey map, and every mapped binding is listed', () => {
    setup();
    press({ key: '?' });
    const listed = listedBindings();
    expect(listed.length).toBeGreaterThan(20);
    expect(listed.filter((l) => !(l in HOTKEY_MAP))).toEqual([]);
    expect(Object.keys(HOTKEY_MAP).filter((k) => !listed.includes(k))).toEqual([]);
    expect(listed).not.toContain('Alt+F');
  });

  it('each observable listed binding triggers its effect', () => {
    setup();
    press({ key: '?' });
    const checkable = listedBindings().filter((l) => HOTKEY_MAP[l]?.check);
    expect(checkable.length).toBeGreaterThanOrEqual(10);
    for (const label of checkable) {
      const b = HOTKEY_MAP[label];
      resetSlices();
      if (label === '1') useCtfStore.setState({ viewMode: 'grid' });
      expect(b.check!(), `precondition for "${label}"`).toBe(false);
      press(b.init);
      expect(b.check!(), `binding "${label}" had no effect`).toBe(true);
    }
  });
});
