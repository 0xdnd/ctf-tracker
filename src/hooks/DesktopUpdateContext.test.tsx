import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as tauriCore from '@tauri-apps/api/core';
import * as tauriUpdater from '@tauri-apps/plugin-updater';
import { DesktopUpdateProvider, AUTO_CHECK_DELAY_MS } from './DesktopUpdateContext';
import { UpdateControl } from '../components/common/OperatorDossierModal';
import { useToastStore } from '../store/useToastStore';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => false) }));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: vi.fn().mockResolvedValue('2.5.2') }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../store/useCtfStore', () => ({ checkpointTimerAndFlush: vi.fn() }));

const tree = (
  <DesktopUpdateProvider>
    <UpdateControl />
  </DesktopUpdateProvider>
);

async function advance() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTO_CHECK_DELAY_MS + 50);
  });
}

describe('DesktopUpdateProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    delete (window as any).electronAPI;
    vi.mocked(tauriCore.isTauri).mockReturnValue(false);
  });
  afterEach(() => vi.useRealTimers());

  it('does nothing on the web build', async () => {
    render(tree);
    await advance();
    expect(tauriUpdater.check).not.toHaveBeenCalled();
    expect(screen.queryByText('Check for updates')).toBeNull();
  });

  it('checks once on desktop and stays silent when the check fails', async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriUpdater.check).mockRejectedValue(new Error('offline'));
    render(tree);
    expect(tauriUpdater.check).not.toHaveBeenCalled();
    await advance();
    expect(tauriUpdater.check).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    expect(screen.queryByText('offline')).toBeNull();
    expect(screen.getByText('Check for updates')).toBeTruthy();
  });

  it('shows a notice and the restart button when an update is ready', async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriUpdater.check).mockResolvedValue({
      version: '2.6.0',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn(),
    } as any);
    render(tree);
    await advance();
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toContain('2.6.0');
    expect(toasts[0].action?.label).toBe('Update and restart');
    expect(screen.getByText('Update and restart')).toBeTruthy();
    expect(screen.getByText('Version 2.6.0 is available')).toBeTruthy();
  });

  it('reports the latest version after a manual check', async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriUpdater.check).mockResolvedValue(null);
    render(tree);
    await advance();
    expect(screen.queryByText("You're on the latest version")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByText('Check for updates'));
    });
    expect(tauriUpdater.check).toHaveBeenCalledTimes(2);
    expect(screen.getByText("You're on the latest version")).toBeTruthy();
  });

  it('shows a short error after a failed manual check', async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriUpdater.check).mockResolvedValue(null);
    render(tree);
    await advance();
    vi.mocked(tauriUpdater.check).mockRejectedValue(new Error('boom'));
    await act(async () => {
      fireEvent.click(screen.getByText('Check for updates'));
    });
    expect(screen.getByText('boom')).toBeTruthy();
  });
});
