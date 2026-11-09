import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpdateReadyButton } from '../../components/layout/UpdateReadyButton';
import { useConfirmStore } from '../../store/useConfirmStore';

const state = vi.hoisted(() => ({
  value: { isDesktop: true, status: 'downloaded', latestVersion: '9.9.9', quitAndInstall: vi.fn() } as Record<string, unknown>,
}));
vi.mock('../../hooks/DesktopUpdateContext', () => ({ useDesktopUpdate: () => state.value }));

const setState = (over: Record<string, unknown>) => {
  state.value = { isDesktop: true, status: 'downloaded', latestVersion: '9.9.9', quitAndInstall: vi.fn(), ...over };
};

describe('UpdateReadyButton', () => {
  beforeEach(() => {
    useConfirmStore.setState({ pending: null });
    setState({});
  });

  it('is hidden on web', () => {
    setState({ isDesktop: false });
    const { container } = render(<UpdateReadyButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is hidden unless the update is downloaded', () => {
    setState({ status: 'downloading' });
    const { container } = render(<UpdateReadyButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the version in its accessible name', () => {
    render(<UpdateReadyButton />);
    expect(
      screen.getByRole('button', { name: 'Update ready: version 9.9.9. Click to update and restart' }),
    ).toBeTruthy();
  });

  it('installs after confirmation', async () => {
    render(<UpdateReadyButton />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(useConfirmStore.getState().pending).not.toBeNull());
    useConfirmStore.getState().settle(true);
    await waitFor(() => expect(state.value.quitAndInstall).toHaveBeenCalledTimes(1));
  });

  it('does not install when cancelled', async () => {
    render(<UpdateReadyButton />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(useConfirmStore.getState().pending).not.toBeNull());
    useConfirmStore.getState().settle(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(state.value.quitAndInstall).not.toHaveBeenCalled();
  });
});
