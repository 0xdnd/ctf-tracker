import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
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

if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IntersectionObserverStub;
}

afterEach(() => {
  act(() => useConfirmStore.getState().settle(false));
  cleanup();
});

const SNIPPET_ID = 'cmd-confirm-snippet';

const setup = () => {
  useCtfStore.setState({
    soundEnabled: false,
    cheatsheets: [
      {
        id: SNIPPET_ID,
        title: 'Confirm Snippet Probe',
        category: 'recon',
        description: 'custom snippet used by the delete confirmation test',
        commandTemplate: 'echo confirm-probe',
        tags: ['probe'],
        isCustom: true,
        isStarred: false,
      },
    ],
  });
  return render(
    <MemoryRouter initialEntries={['/cheatsheet']}>
      <CheatsheetView defaultMode="tactical" />
      <ConfirmDialog />
    </MemoryRouter>,
  );
};

const hasSnippet = () => useCtfStore.getState().cheatsheets.some((c) => c.id === SNIPPET_ID);

describe('CheatsheetView: delete custom snippet confirmation', () => {
  it('cancel keeps the snippet', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete snippet' }));
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(hasSnippet()).toBe(true);
  });

  it('confirm deletes the snippet', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete snippet' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete snippet' }));
    await waitFor(() => expect(hasSnippet()).toBe(false));
  });
});
