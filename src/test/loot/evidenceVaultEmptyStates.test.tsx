import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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

const BOX = {
  id: 'box-1',
  name: 'Forest',
  ip: '10.10.10.161',
  platform: 'HTB',
  os: 'Windows',
  tags: [],
  certifications: [],
  difficulty: 'Medium',
  status: 'foothold',
  timeSpentSeconds: 0,
  createdAt: '2026-09-02T09:00:00Z',
  updatedAt: '2026-09-02T10:00:00Z',
  userFlag: 'HTB{user_flag}',
} as unknown as Machine;

const setup = () =>
  render(
    <MemoryRouter>
      <EvidenceVaultPage />
    </MemoryRouter>
  );

describe('EvidenceVaultPage empty and filter-miss states', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({
      currentProfileId: 'guest',
      machines: [],
      soundEnabled: false,
      credentials: [],
      credAttempts: [],
      lootItems: [],
    });
  });
  afterEach(() => cleanup());

  it('shows the empty-vault state with a log action when nothing is stored', () => {
    setup();
    expect(screen.getByText('Your vault is empty')).toBeTruthy();
    expect(screen.queryByText(/No evidence matches these filters/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Log new evidence/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows the filter-miss state and Clear filters restores the list', () => {
    useCtfStore.setState({ machines: [BOX] });
    setup();
    expect(screen.queryByText('Your vault is empty')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zzz-no-match' } });
    expect(screen.getByText(/No evidence matches these filters/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/i }));
    expect(screen.queryByText(/No evidence matches these filters/i)).toBeNull();
    expect(screen.getAllByText('Forest').length).toBeGreaterThan(0);
  });
});
