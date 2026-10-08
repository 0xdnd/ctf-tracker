import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EvidenceVaultPage } from '../../pages/EvidenceVaultPage';
import { getLootStorageKey } from '../../store/lootPersistence';
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

const CUSTOM_CRED = {
  id: 'custom-loot-confirm-1',
  type: 'password' as const,
  username: 'svc_confirm',
  secret: 'S3cret!confirm',
  createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
};

// Custom loot is persisted per profile under the v2 key by the store (the page no longer touches storage).
const storedCount = () => {
  const raw = localStorage.getItem(getLootStorageKey(useCtfStore.getState().currentProfileId));
  return raw ? JSON.parse(raw).credentials.length : 0;
};

describe('EvidenceVaultPage: delete custom loot confirmation', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({ soundEnabled: false, credentials: [], credAttempts: [], lootItems: [] });
    useCtfStore.getState().addCredential(CUSTOM_CRED);
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
