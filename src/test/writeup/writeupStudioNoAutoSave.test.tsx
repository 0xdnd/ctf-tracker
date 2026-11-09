import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import { WriteupStudio } from '../../components/writeup/WriteupStudio';

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

const box = (id: string, name: string, extra: Partial<Machine> = {}) =>
  ({
    id,
    name,
    ip: '10.10.10.1',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'backlog',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  }) as unknown as Machine;

const open = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/writeup/${id}`]}>
      <Routes>
        <Route path="/writeup/:id" element={<WriteupStudio />} />
      </Routes>
    </MemoryRouter>
  );

const editor = () => screen.getByLabelText('Markdown report editor') as HTMLTextAreaElement;
const machine = (id: string) => useCtfStore.getState().machines.find((m) => m.id === id)!;

describe('WriteupStudio does not save on open', () => {
  beforeEach(() => {
    useCtfStore.setState({
      machines: [box('a', 'Alpha'), box('b', 'Bravo')],
      credentials: [],
      writeupMachineId: null,
      activeTargetId: null,
      isDeepStorageLoaded: true,
      isCatalogLoaded: true,
      soundEnabled: false,
      currentProfileId: 'prof-1',
      unexportedChangesCount: 0,
    } as never);
  });
  afterEach(() => cleanup());

  it('opening a machine with no writeup shows the template but leaves the machine and change counter untouched', () => {
    open('a');
    expect(editor().value).toContain('Alpha - Writeup & Penetration Testing Report');
    expect(machine('a').writeupMarkdown).toBeUndefined();
    expect(useCtfStore.getState().unexportedChangesCount).toBe(0);
  });

  it('the first edit saves the full editor content, template included', () => {
    vi.useFakeTimers();
    try {
      open('a');
      fireEvent.change(editor(), { target: { value: `${editor().value}\nmy note` } });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      const saved = machine('a').writeupMarkdown!;
      expect(saved).toContain('Alpha - Writeup & Penetration Testing Report');
      expect(saved).toContain('my note');
      expect(useCtfStore.getState().unexportedChangesCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('WriteupStudio Vault Loot insert', () => {
  beforeEach(() => {
    useCtfStore.setState({
      machines: [box('a', 'Alpha'), box('b', 'Bravo')],
      credentials: [],
      writeupMachineId: null,
      activeTargetId: null,
      isDeepStorageLoaded: true,
      isCatalogLoaded: true,
      soundEnabled: false,
      currentProfileId: 'prof-1',
      unexportedChangesCount: 0,
    } as never);
    useToastStore.setState({ toasts: [] } as never);
  });
  afterEach(() => cleanup());

  it('never inserts credentials captured on another machine', () => {
    useCtfStore.getState().addCredential({ type: 'password', username: 'bravo_user', secret: 'bravo_secret', sourceMachineId: 'b' });
    open('a');
    const before = editor().value;
    fireEvent.click(screen.getByTestId('insert-vault-loot-btn'));
    expect(editor().value).toBe(before);
    expect(editor().value).not.toContain('bravo_user');
    expect(machine('a').writeupMarkdown).toBeUndefined();
    expect(useToastStore.getState().toasts.some((t: { type: string }) => t.type === 'info')).toBe(true);
  });

  it('inserts only this machine\'s credentials', () => {
    useCtfStore.getState().addCredential({ type: 'password', username: 'alpha_user', secret: 'alpha_secret', sourceMachineId: 'a' });
    useCtfStore.getState().addCredential({ type: 'password', username: 'bravo_user', secret: 'bravo_secret', sourceMachineId: 'b' });
    open('a');
    fireEvent.click(screen.getByTestId('insert-vault-loot-btn'));
    expect(editor().value).toContain('alpha_user');
    expect(editor().value).not.toContain('bravo_user');
  });
});
