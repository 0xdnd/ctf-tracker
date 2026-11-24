import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsDropdownMenu from '../layout/SettingsDropdownMenu';
import { SettingsModal } from './SettingsModal';
import { DesktopNotificationsToggle } from './DesktopNotificationsToggle';
import { useCtfStore } from '../../store/useCtfStore';
import { ThemeProvider } from '../../hooks/useTheme';
import * as helpers from '../../utils/helpers';

describe('SettingsDropdownMenu & SettingsModal polish and contracts', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('zerobox-theme-mode', 'dark');
    document.documentElement.className = 'dark';
    document.documentElement.setAttribute('data-mode', 'dark');
    document.documentElement.setAttribute('data-theme', 'obsidian');
    useCtfStore.setState({
      settingsModalOpen: true,
      themePreset: 'obsidian',
      soundEnabled: false,
      uiScale: 'normal',
      unexportedChangesCount: 0,
      globalVars: {
        lhost: '10.10.14.10',
        lport: '4444',
        targetIp: '',
        interface: 'tun0',
        customVars: {},
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('SettingsDropdownMenu displays active theme summary, unexported badge, sound switch state, and bounded scale stepper', () => {
    useCtfStore.setState({ themePreset: 'htb', unexportedChangesCount: 3, uiScale: 'tiny', soundEnabled: false });
    const onClose = vi.fn();
    const onPickFile = vi.fn();

    render(
      <MemoryRouter>
        <ThemeProvider>
          <SettingsDropdownMenu onClose={onClose} onPickFile={onPickFile} />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Preferences and tools')).toBeInTheDocument();
    expect(screen.getByText('3 not backed up')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Settings & Themes/ })).toHaveTextContent('Hack The Box');
    expect(screen.getByTestId('settings-last-backup')).toHaveTextContent('Never backed up');

    const soundSwitch = screen.getByRole('switch', { name: /Sound effects/ });
    expect(soundSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(soundSwitch);
    expect(useCtfStore.getState().soundEnabled).toBe(true);
    expect(soundSwitch).toHaveAttribute('aria-checked', 'true');

    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    expect(zoomOut).toBeDisabled();
    expect(zoomIn).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '80%' })).toBeInTheDocument();

    // Reset zoom to 100%
    fireEvent.click(screen.getByRole('button', { name: '80%' }));
    expect(useCtfStore.getState().uiScale).toBe('normal');
    expect(screen.getByRole('button', { name: '100%' })).toBeInTheDocument();

    // Upper boundary disables zoom in
    act(() => useCtfStore.setState({ uiScale: 'huge' }));
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '122%' })).toBeInTheDocument();
  });

  it('SettingsModal preserves all tour anchors, single scroll container, unclipped token focus, and full token copy', () => {
    vi.useFakeTimers();
    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);

    const { unmount } = render(
      <MemoryRouter>
        <ThemeProvider>
          <SettingsModal />
        </ThemeProvider>
      </MemoryRouter>
    );

    const dialog = screen.getByRole('dialog', { name: 'Settings configuration modal' });
    expect(dialog.querySelector('[data-tour="settings-themes"]')).not.toBeNull();
    expect(dialog.querySelector('[data-tour="settings-display"]')).not.toBeNull();
    expect(dialog.querySelector('[data-tour="settings-vars"]')).not.toBeNull();
    expect(dialog.querySelector('[data-tour="guide-controls"]')).not.toBeNull();

    // Modal owns the single scroll container (no nested overflow-y-auto inside SettingsModal)
    expect(dialog.querySelectorAll('.overflow-y-auto')).toHaveLength(1);
    expect(dialog.className).toContain('surface-elevated-depth');

    // Design tokens container must not use overflow-hidden (would clip summary focus-visible outline)
    const details = dialog.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.className).not.toContain('overflow-hidden');

    // Design tokens expose complete variable names and copy cleanly with timer reset
    const successTokenBtn = screen.getByRole('button', { name: /--callout-success-fg/ });
    const dangerTokenBtn = screen.getByRole('button', { name: /--callout-danger-fg/ });
    expect(successTokenBtn).toHaveTextContent('--callout-success-fg');
    expect(dangerTokenBtn).toHaveTextContent('--callout-danger-fg');

    fireEvent.click(successTokenBtn);
    expect(copySpy).toHaveBeenCalledWith('--callout-success-fg');
    expect(successTokenBtn).toHaveTextContent('Copied');

    fireEvent.click(dangerTokenBtn);
    expect(copySpy).toHaveBeenCalledWith('--callout-danger-fg');
    expect(dangerTokenBtn).toHaveTextContent('Copied');

    act(() => vi.advanceTimersByTime(1500));
    expect(dangerTokenBtn).not.toHaveTextContent('Copied');

    // Audio Feedback switch & interface scale stops + reset action
    const audioSwitch = screen.getByRole('switch', { name: 'Audio Feedback' });
    expect(audioSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(audioSwitch);
    expect(useCtfStore.getState().soundEnabled).toBe(true);

    const largeBtn = screen.getByRole('button', { name: /large/i });
    fireEvent.click(largeBtn);
    expect(useCtfStore.getState().uiScale).toBe('large');
    expect(largeBtn).toHaveAttribute('aria-pressed', 'true');

    const resetScaleBtn = screen.getByRole('button', { name: /Reset \(110%\)/i });
    fireEvent.click(resetScaleBtn);
    expect(useCtfStore.getState().uiScale).toBe('normal');

    // Default attacker variable inputs
    const lhost = screen.getByLabelText('Attacker IP (LHOST)') as HTMLInputElement;
    fireEvent.change(lhost, { target: { value: '10.10.16.42' } });
    expect(useCtfStore.getState().globalVars.lhost).toBe('10.10.16.42');

    // Clean unmount while a copy timer is active should not throw
    fireEvent.click(successTokenBtn);
    unmount();
    act(() => vi.advanceTimersByTime(2000));
  });

  it('DesktopNotificationsToggle supports embedded, standalone, and denied status callout', async () => {
    const origNotification = window.Notification;
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'denied', requestPermission: vi.fn().mockResolvedValue('denied') },
    });

    const { rerender } = render(<DesktopNotificationsToggle embedded />);
    const sw = screen.getByTestId('desktop-notifications-toggle');
    expect(sw).toHaveAttribute('role', 'switch');
    expect(sw).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(sw);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Notifications are blocked/i);
    });

    rerender(<DesktopNotificationsToggle />);
    expect(screen.getByTestId('desktop-notifications-toggle')).toBeInTheDocument();

    Object.defineProperty(window, 'Notification', { configurable: true, value: origNotification });
  });
});
