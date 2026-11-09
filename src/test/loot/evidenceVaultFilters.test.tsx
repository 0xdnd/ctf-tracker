import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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

const makeBox = (id: string, name: string, ip: string, platform: string) =>
  ({
    id,
    name,
    ip,
    platform,
    os: 'Windows',
    tags: [],
    certifications: [],
    difficulty: 'Medium',
    status: 'foothold',
    timeSpentSeconds: 0,
    createdAt: '2026-09-02T09:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
  }) as unknown as Machine;

describe('EvidenceVaultPage target and platform filters', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({
      currentProfileId: 'guest',
      machines: [makeBox('box-1', 'Forest', '10.10.10.161', 'HTB'), makeBox('box-2', 'Sauna', '10.10.10.175', 'THM')],
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

  it('shows the deep-linked target in a visible control and counts it as an active filter', () => {
    setup('/vault?target=box-1');
    expect(screen.getByRole('button', { name: /Filter by target/i })).toHaveTextContent('Forest');
    expect(screen.getByRole('button', { name: /Filter by platform/i })).toHaveTextContent('All platforms');
    expect(screen.getByRole('button', { name: /^Filters\s*1$/ })).toBeInTheDocument();
    expect(screen.queryByText('sauna_user')).not.toBeInTheDocument();
  });

  it('Clear filters resets a deep-linked target filter', () => {
    setup('/vault?target=box-1');
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/i }));
    expect(screen.getByText('forest_user')).toBeInTheDocument();
    expect(screen.getByText('sauna_user')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear filters/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filter by target/i })).toHaveTextContent('All targets');
  });

  it('the platform control filters the list and is cleared by Clear filters', () => {
    setup('/vault');
    expect(screen.queryByRole('button', { name: /Clear filters/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Filter by platform/i }));
    fireEvent.click(screen.getByRole('option', { name: /THM/ }));
    expect(screen.getByText('sauna_user')).toBeInTheDocument();
    expect(screen.queryByText('forest_user')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/i }));
    expect(screen.getByText('forest_user')).toBeInTheDocument();
  });
});
