import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EvidenceVaultPage } from '../../pages/EvidenceVaultPage';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

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

const makeBox = (id: string, name: string, ip: string) =>
  ({
    id,
    name,
    ip,
    platform: 'HTB',
    os: 'Windows',
    tags: [],
    certifications: [],
    difficulty: 'Medium',
    status: 'foothold',
    timeSpentSeconds: 0,
    createdAt: '2026-09-02T09:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
  }) as unknown as Machine;

describe('EvidenceVaultPage ?target= deep link', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({
      currentProfileId: 'guest',
      machines: [makeBox('box-1', 'Forest', '10.10.10.161'), makeBox('box-2', 'Sauna', '10.10.10.175')],
      soundEnabled: false,
      credentials: [],
      credAttempts: [],
      lootItems: [],
    });
    useCtfStore.getState().addCredential({ type: 'password', username: 'forest_user', secret: 'a', sourceMachineId: 'box-1' });
    useCtfStore.getState().addCredential({ type: 'password', username: 'sauna_user', secret: 'b', sourceMachineId: 'box-2' });
  });

  afterEach(() => cleanup());

  const setup = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <EvidenceVaultPage />
      </MemoryRouter>
    );

  it('a known machine id lists only that machine\'s items', () => {
    setup('/vault?target=box-1');
    expect(screen.getByText('forest_user')).toBeInTheDocument();
    expect(screen.queryByText('sauna_user')).not.toBeInTheDocument();
  });

  it('an unknown machine id falls back to all', () => {
    setup('/vault?target=nope');
    expect(screen.getByText('forest_user')).toBeInTheDocument();
    expect(screen.getByText('sauna_user')).toBeInTheDocument();
  });

  it('no param keeps the default (all)', () => {
    setup('/vault');
    expect(screen.getByText('forest_user')).toBeInTheDocument();
    expect(screen.getByText('sauna_user')).toBeInTheDocument();
  });
});
