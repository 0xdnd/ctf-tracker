import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { WriteupStudio, pickWriteupMachine } from '../../components/writeup/WriteupStudio';
import { TargetDetailPage } from '../../pages/TargetDetailPage';

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

const lame = box('lame', 'Lame');
const legacy = box('legacy', 'Legacy');
const season = box('season', 'Season', { isActive: true });

describe('pickWriteupMachine', () => {
  const all = [season, lame, legacy];

  it('prefers the machine picked before', () => {
    expect(pickWriteupMachine(all, 'legacy', 'lame')).toBe(legacy);
  });

  it('uses the active target when nothing was picked and the selector lists it', () => {
    expect(pickWriteupMachine(all, null, 'legacy')).toBe(legacy);
  });

  it('ignores an active target the selector does not list (current-season machines)', () => {
    expect(pickWriteupMachine(all, null, 'season')).toBe(lame);
  });

  it('ignores an active target that no longer exists', () => {
    expect(pickWriteupMachine(all, null, 'gone')).toBe(lame);
  });

  it('falls back to the first retired machine, then the first machine', () => {
    expect(pickWriteupMachine(all, null, null)).toBe(lame);
    expect(pickWriteupMachine([season], null, null)).toBe(season);
  });

  it('skips a picked id that no longer exists', () => {
    expect(pickWriteupMachine(all, 'gone', 'legacy')).toBe(legacy);
  });
});

describe('WriteupStudio default target', () => {
  beforeEach(() => {
    useCtfStore.setState({
      machines: [season, lame, legacy],
      writeupMachineId: null,
      activeTargetId: null,
      isDeepStorageLoaded: true,
      isCatalogLoaded: true,
      currentProfileId: 'prof-1',
    });
  });

  const targetLabel = () =>
    screen
      .getAllByRole('button')
      .find((b) => b.getAttribute('aria-haspopup') === 'listbox' && /\(HTB\)/.test(b.textContent ?? ''))
      ?.textContent;

  const LocationProbe = () => <div data-testid="loc">{useLocation().pathname}</div>;

  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/writeup" element={<WriteupStudio />} />
          <Route path="/writeup/:id" element={<WriteupStudio />} />
          <Route path="/targets/:id" element={<TargetDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  const pathname = () => screen.getByTestId('loc').textContent;

  const pickTarget = (name: RegExp) => {
    fireEvent.click(screen.getByRole('button', { name: /\(HTB\)/ }));
    fireEvent.click(screen.getByRole('option', { name }));
  };

  it('opens on the active target when it is a retired machine', () => {
    useCtfStore.setState({ activeTargetId: 'legacy' });
    renderAt('/writeup');
    expect(targetLabel()).toContain('Legacy');
  });

  it('lets the route param win over the active target', () => {
    useCtfStore.setState({ activeTargetId: 'legacy' });
    renderAt('/writeup/lame');
    expect(targetLabel()).toContain('Lame');
  });

  it('ignores a writeupMachineId left over from an earlier session; the active target still wins', () => {
    // Simulates reopening the studio after `writeupMachineId` was persisted from a past session —
    // it must not outrank *today's* active target (the bug this default-target fix addresses).
    useCtfStore.setState({ activeTargetId: 'legacy', writeupMachineId: 'lame' });
    renderAt('/writeup');
    expect(targetLabel()).toContain('Legacy');
  });

  it('keeps a machine picked inside this open studio session over the active target', () => {
    useCtfStore.setState({ activeTargetId: 'legacy' });
    renderAt('/writeup');
    expect(targetLabel()).toContain('Legacy');

    // Pick a different retired machine from the in-studio selector.
    pickTarget(/Lame/);

    expect(targetLabel()).toContain('Lame');
    expect(pathname()).toBe('/writeup/lame');
  });

  it('opens the machine whose target page the writeup button was clicked on', () => {
    // Active target and the persisted pick both point elsewhere; the target page must win.
    useCtfStore.setState({ activeTargetId: 'lame', writeupMachineId: 'lame' });
    renderAt('/targets/legacy');
    fireEvent.click(screen.getByRole('button', { name: /Writeup Studio/ }));

    expect(pathname()).toBe('/writeup/legacy');
    expect(targetLabel()).toContain('Legacy');
    expect(useCtfStore.getState().writeupMachineId).toBe('legacy');
  });

  it('switches machine and URL from the dropdown while on /writeup/:id', () => {
    renderAt('/writeup/lame');
    expect(targetLabel()).toContain('Lame');

    pickTarget(/Legacy/);

    expect(targetLabel()).toContain('Legacy');
    expect(pathname()).toBe('/writeup/legacy');
    expect(useCtfStore.getState().writeupMachineId).toBe('legacy');
  });

  it('opens the active target on bare /writeup even with a stale stored pick', () => {
    useCtfStore.setState({ activeTargetId: 'legacy', writeupMachineId: 'lame' });
    renderAt('/writeup');
    expect(targetLabel()).toContain('Legacy');
    expect(pathname()).toBe('/writeup');
  });

  it('can pick the machine the store held at mount, then another one', () => {
    useCtfStore.setState({ activeTargetId: 'legacy', writeupMachineId: 'lame' });
    renderAt('/writeup');
    expect(targetLabel()).toContain('Legacy');

    pickTarget(/Lame/);
    expect(targetLabel()).toContain('Lame');
    expect(pathname()).toBe('/writeup/lame');

    pickTarget(/Legacy/);
    expect(targetLabel()).toContain('Legacy');
    expect(pathname()).toBe('/writeup/legacy');
  });

  it('does not offer a current-season active target; it falls back to the first retired machine', () => {
    useCtfStore.setState({ activeTargetId: 'season' });
    renderAt('/writeup');
    expect(targetLabel()).toContain('Lame');
  });
});
