import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateReadyButton } from '../../components/layout/UpdateReadyButton';
import { useUpdateUiStore } from '../../store/useUpdateUiStore';

const state = vi.hoisted(() => ({
  value: { isDesktop: true, status: 'downloaded', latestVersion: '9.9.9', quitAndInstall: vi.fn() } as Record<string, unknown>,
}));
vi.mock('../../hooks/DesktopUpdateContext', () => ({ useDesktopUpdate: () => state.value }));

const setState = (over: Record<string, unknown>) => {
  state.value = { isDesktop: true, status: 'downloaded', latestVersion: '9.9.9', quitAndInstall: vi.fn(), ...over };
};

describe('UpdateReadyButton', () => {
  beforeEach(() => {
    useUpdateUiStore.setState({
      updateAvailableOpen: false,
      webUpdateWaiting: false,
      webReloadAction: null,
    });
    setState({});
  });

  it('is hidden on web when no service worker update is waiting', () => {
    setState({ isDesktop: false });
    const { container } = render(<UpdateReadyButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is hidden on desktop unless the update is downloaded', () => {
    setState({ status: 'downloading' });
    const { container } = render(<UpdateReadyButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the version in its accessible name on desktop and opens the Update Available modal on click', () => {
    render(<UpdateReadyButton />);
    const btn = screen.getByRole('button', {
      name: 'Update ready: version 9.9.9. Click to update and restart',
    });
    expect(btn).toBeTruthy();

    fireEvent.click(btn);
    expect(useUpdateUiStore.getState().updateAvailableOpen).toBe(true);
  });

  it('renders on web when a service worker update is waiting and opens the Update Available modal', () => {
    setState({ isDesktop: false, status: 'idle', latestVersion: null });
    useUpdateUiStore.getState().setWebUpdateReady(vi.fn(), false);

    render(<UpdateReadyButton />);
    const btn = screen.getByRole('button', {
      name: 'Update ready: a new version of ZeroBox is available. Click to reload and update',
    });
    expect(btn).toBeTruthy();

    fireEvent.click(btn);
    expect(useUpdateUiStore.getState().updateAvailableOpen).toBe(true);
  });
});
