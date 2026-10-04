import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EvidenceVaultPage, STORAGE_KEY_CUSTOM_LOOT } from '../../pages/EvidenceVaultPage';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useCtfStore } from '../../store/useCtfStore';
import { useConfirmStore } from '../../store/useConfirmStore';

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

const CUSTOM_ITEM = {
  id: 'custom-loot-confirm-1',
  targetId: 'manual',
  targetName: 'ConfirmTarget',
  targetIp: '10.10.10.99',
  platform: 'HackTheBox',
  category: 'password',
  typeLabel: 'Password',
  username: 'svc_confirm',
  secret: 'S3cret!confirm',
  discoveredAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  notes: '',
  isCustom: true,
};

const profileKey = () =>
  `${STORAGE_KEY_CUSTOM_LOOT}_${useCtfStore.getState().currentProfileId || 'guest'}`;

// The page persists edits to the profile-scoped key (legacy key is read-only fallback).
const storedCount = () => JSON.parse(localStorage.getItem(profileKey()) || '[]').length;

describe('EvidenceVaultPage: delete custom loot confirmation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(profileKey(), JSON.stringify([CUSTOM_ITEM]));
    useCtfStore.setState({ soundEnabled: false });
  });

  afterEach(() => {
    act(() => useConfirmStore.getState().settle(false));
    cleanup();
  });

  const setup = () =>
    render(
      <MemoryRouter>
        <EvidenceVaultPage />
        <ConfirmDialog />
      </MemoryRouter>,
    );

  const clickDelete = () => {
    const btn = screen.getAllByRole('button', { name: /delete custom loot/i })[0];
    fireEvent.click(btn);
  };

  it('cancel keeps the custom loot entry', async () => {
    setup();
    expect(storedCount()).toBe(1);
    clickDelete();
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(storedCount()).toBe(1);
    expect(screen.getAllByRole('button', { name: /delete custom loot/i }).length).toBeGreaterThan(0);
  });

  it('confirm removes the custom loot entry', async () => {
    setup();
    clickDelete();
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }));
    await waitFor(() => expect(storedCount()).toBe(0));
    expect(screen.queryByRole('button', { name: /delete custom loot/i })).toBeNull();
  });
});
