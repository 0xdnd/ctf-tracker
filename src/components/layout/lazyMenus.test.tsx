import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { MobileNav } from './MobileNav';
import { SettingsDropdown } from './SettingsDropdown';

/** Both menus are their own chunks: nothing of them is mounted until the first time they open. */
describe('lazy header menus', () => {
  beforeEach(() => {
    useCtfStore.setState({ mobileMenuOpen: false, settingsModalOpen: false });
  });

  it('the Settings menu mounts on first open, runs its actions and closes', async () => {
    render(
      <MemoryRouter>
        <SettingsDropdown />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Preferences and tools')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Settings and options' }));
    expect(await screen.findByText('Preferences and tools')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /All Settings & Themes/ }));
    expect(useCtfStore.getState().settingsModalOpen).toBe(true);
    await waitFor(() => expect(screen.queryByText('Preferences and tools')).toBeNull());
  });

  it('the Settings menu closes on Escape', async () => {
    render(
      <MemoryRouter>
        <SettingsDropdown />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Settings and options' }));
    await screen.findByText('Preferences and tools');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Preferences and tools')).toBeNull());
  });

  it('the mobile menu mounts on first open and stays mounted so it can animate closed', async () => {
    render(
      <MemoryRouter>
        <MobileNav />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    expect(await screen.findByRole('dialog', { name: 'Navigation menu' })).toBeInTheDocument();

    act(() => useCtfStore.getState().setMobileMenuOpen(false));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).toBeNull());

    // Opening again works without another load.
    act(() => useCtfStore.getState().setMobileMenuOpen(true));
    expect(await screen.findByRole('dialog', { name: 'Navigation menu' })).toBeInTheDocument();
  });
});
