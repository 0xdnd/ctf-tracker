import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { WriteupStudio } from '../../components/writeup/WriteupStudio';

const MACHINE = {
  id: 'box-w',
  name: 'Whiskey',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'backlog',
  tags: ['recon'],
  certifications: [],
  roomUrl: '',
  ip: '',
  isActive: false,
  timeSpentSeconds: 0,
  writeupMarkdown: '# existing writeup',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const storedWriteup = () => useCtfStore.getState().machines.find((m) => m.id === MACHINE.id)?.writeupMarkdown;
const editor = () => screen.getByLabelText('Markdown report editor') as HTMLTextAreaElement;
const renderStudio = () =>
  render(
    <MemoryRouter>
      <WriteupStudio />
    </MemoryRouter>
  );

const setVisibility = (state: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeAll(() => {
  if (!window.matchMedia) {
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
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
});

beforeEach(() => {
  useCtfStore.setState({
    machines: [{ ...MACHINE }],
    writeupMachineId: MACHINE.id,
    customNotes: [],
    userNotes: [],
    soundEnabled: false,
    isDeepStorageLoaded: true,
  } as any);
});

afterEach(() => {
  cleanup();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

describe('WriteupStudio autosave', () => {
  it('flushes the pending debounced edit when the tab is hidden', () => {
    renderStudio();
    fireEvent.change(editor(), { target: { value: '# typed before switching tabs' } });
    expect(storedWriteup()).toBe('# existing writeup');
    act(() => setVisibility('hidden'));
    expect(storedWriteup()).toBe('# typed before switching tabs');
  });

  it('flushes the pending debounced edit on pagehide', () => {
    renderStudio();
    fireEvent.change(editor(), { target: { value: '# typed before closing' } });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(storedWriteup()).toBe('# typed before closing');
  });

  it('keeps an intentionally emptied writeup empty instead of re-seeding the template', async () => {
    const view = renderStudio();
    fireEvent.change(editor(), { target: { value: '' } });
    // Unmount flushes the pending empty value (previously '' was never flushed).
    view.unmount();
    expect(storedWriteup()).toBe('');
    renderStudio();
    await act(async () => {});
    expect(editor().value).toBe('');
    expect(storedWriteup()).toBe('');
  });

  it('still seeds the template for a writeup that was never written', async () => {
    useCtfStore.setState({ machines: [{ ...MACHINE, writeupMarkdown: undefined }] } as any);
    renderStudio();
    await act(async () => {});
    expect(storedWriteup()).toContain('Whiskey - Writeup');
  });
});
