import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { GraphEdgeInspectorDrawer, NOTES_SAVE_DELAY_MS } from '../../components/tracker/GraphEdgeInspectorDrawer';
import type { AttackGraphEdge } from '../../types/graph';

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

const edgeA: AttackGraphEdge = {
  id: 'edge-a',
  sourceId: 'm1',
  targetId: 'm2',
  type: 'pivot-ssh',
  status: 'potential',
  notes: 'saved notes',
  createdAt: '2024-01-01T00:00:00.000Z',
} as AttackGraphEdge;

const setup = (edge: AttackGraphEdge | null = edgeA) => {
  const onUpdateEdge = vi.fn();
  const onClose = vi.fn();
  const props = { isOpen: Boolean(edge), onClose, onUpdateEdge, onDeleteEdge: vi.fn() };
  const view = render(<GraphEdgeInspectorDrawer edge={edge} {...props} />);
  const rerender = (next: AttackGraphEdge | null) =>
    view.rerender(<GraphEdgeInspectorDrawer edge={next} {...props} isOpen={Boolean(next)} />);
  // On an edge switch the previous drawer is still animating out: the newest textarea is the live one.
  const notes = () => screen.getAllByPlaceholderText(/Add operational notes/i).at(-1) as HTMLTextAreaElement;
  return { ...view, rerender, onUpdateEdge, onClose, notes };
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('pivot notes autosave (GraphEdgeInspectorDrawer)', () => {
  it('saves while typing, debounced, without needing a blur', () => {
    vi.useFakeTimers();
    const { onUpdateEdge, notes } = setup();
    fireEvent.change(notes(), { target: { value: 'ssh user:pass' } });
    act(() => vi.advanceTimersByTime(NOTES_SAVE_DELAY_MS - 50));
    expect(onUpdateEdge).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(onUpdateEdge).toHaveBeenCalledWith('edge-a', { notes: 'ssh user:pass' });
  });

  it('Escape saves the pending draft before closing', () => {
    const { onUpdateEdge, onClose, notes } = setup();
    fireEvent.change(notes(), { target: { value: 'typed then escaped' } });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onUpdateEdge).toHaveBeenCalledWith('edge-a', { notes: 'typed then escaped' });
    expect(onClose).toHaveBeenCalled();
  });

  it('unmounting saves the pending draft', () => {
    const { onUpdateEdge, notes, unmount } = setup();
    fireEvent.change(notes(), { target: { value: 'typed then unmounted' } });
    unmount();
    expect(onUpdateEdge).toHaveBeenCalledWith('edge-a', { notes: 'typed then unmounted' });
  });

  it('an update to the same edge does not reset the draft being typed', () => {
    const { notes, rerender } = setup();
    fireEvent.change(notes(), { target: { value: 'draft in progress' } });
    rerender({ ...edgeA, status: 'compromised' }); // e.g. status toggled: new edge object, same id
    expect(notes().value).toBe('draft in progress');
  });

  it("switching to another edge saves the previous edge's draft and shows the new edge's notes", () => {
    const { onUpdateEdge, notes, rerender } = setup();
    fireEvent.change(notes(), { target: { value: 'notes for a' } });
    rerender({ ...edgeA, id: 'edge-b', notes: 'notes of b' });
    expect(onUpdateEdge).toHaveBeenCalledWith('edge-a', { notes: 'notes for a' });
    expect(notes().value).toBe('notes of b');
  });
});
