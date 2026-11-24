import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as tauriUpdater from '@tauri-apps/plugin-updater';
import { DesktopUpdateProvider, AUTO_CHECK_DELAY_MS } from './DesktopUpdateContext';
import { UpdateControl } from '../components/common/OperatorDossierModal';
import { useToastStore } from '../store/useToastStore';
import { useUpdateUiStore } from '../store/useUpdateUiStore';
import { useExamStore } from '../store/examStore';

vi.mock('@tauri-apps/api/app', () => ({ getVersion: vi.fn().mockResolvedValue('2.5.2') }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../store/useCtfStore', () => ({
  checkpointTimerAndFlush: vi.fn(),
  useCtfStore: { getState: () => ({}) },
}));

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

/** What @tauri-apps/api's isTauri() reads; the hook checks it directly so the package stays out of the web entry bundle. */
const setTauri = (on: boolean) => {
  (window as unknown as { isTauri?: boolean }).isTauri = on;
};

describe('DesktopUpdateProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    useUpdateUiStore.setState({ updateAvailableOpen: false, webUpdateWaiting: false, webReloadAction: null });
    useExamStore.setState({ status: 'idle' });
    delete (window as unknown as Record<string, unknown>).electronAPI;
    setTauri(false);
  });
  afterEach(() => vi.useRealTimers());

  it('does nothing on the web build', async () => {
    render(tree);
    await advance();
    expect(tauriUpdater.check).not.toHaveBeenCalled();
    expect(screen.queryByText('Check for updates')).toBeNull();
  });

  it('checks once on desktop and stays silent when the check fails', async () => {
    setTauri(true);
    vi.mocked(tauriUpdater.check).mockRejectedValue(new Error('offline'));
    render(tree);
    expect(tauriUpdater.check).not.toHaveBeenCalled();
    await advance();
    expect(tauriUpdater.check).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    expect(screen.queryByText('offline')).toBeNull();
    expect(screen.getByText('Check for updates')).toBeTruthy();
  });

  it('opens the Update Available modal and shows the restart button when idle and an update is ready', async () => {
    setTauri(true);
    vi.mocked(tauriUpdater.check).mockResolvedValue({
      version: '2.6.0',
      body: '- Improved pivot graph',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn(),
    } as never);
    render(tree);
    await advance();
    expect(useUpdateUiStore.getState().updateAvailableOpen).toBe(true);
    expect(screen.getByText('Update and restart')).toBeTruthy();
    expect(screen.getByText('Version 2.6.0 is available')).toBeTruthy();
  });

  it('defers the modal to a non-blocking toast when an exam is running', async () => {
    setTauri(true);
    useExamStore.setState({ status: 'running' });
    vi.mocked(tauriUpdater.check).mockResolvedValue({
      version: '2.6.1',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn(),
    } as never);
    render(tree);
    await advance();
    expect(useUpdateUiStore.getState().updateAvailableOpen).toBe(false);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toContain('2.6.1');
    expect(toasts[0].action?.label).toBe('View update');
  });

  it('reports the latest version after a manual check', async () => {
    setTauri(true);
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
    setTauri(true);
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
