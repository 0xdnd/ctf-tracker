import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownEditor } from '../../components/cheatsheet/MarkdownEditor';
import { useCtfStore } from '../../store/useCtfStore';

let updateNoteContent: ReturnType<typeof vi.fn>;
const textarea = () => screen.getByRole('textbox') as HTMLTextAreaElement;
const renderEditor = () =>
  render(<MarkdownEditor noteId="note-1" initialContent="hello" onContentChange={() => {}} />);

describe('MarkdownEditor autosave', () => {
  beforeEach(() => {
    updateNoteContent = vi.fn().mockResolvedValue(undefined);
    useCtfStore.setState({ updateNoteContent } as any);
  });
  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });

  it('flushes the pending debounced save on unmount', () => {
    const view = renderEditor();
    fireEvent.change(textarea(), { target: { value: 'hello world' } });
    expect(updateNoteContent).not.toHaveBeenCalled();
    view.unmount();
    expect(updateNoteContent).toHaveBeenCalledWith('note-1', 'hello world');
  });

  it('flushes the pending debounced save when the tab is hidden and on pagehide', () => {
    renderEditor();
    fireEvent.change(textarea(), { target: { value: 'hidden edit' } });
    act(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(updateNoteContent).toHaveBeenLastCalledWith('note-1', 'hidden edit');

    fireEvent.change(textarea(), { target: { value: 'closing edit' } });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(updateNoteContent).toHaveBeenLastCalledWith('note-1', 'closing edit');
    expect(updateNoteContent).toHaveBeenCalledTimes(2);
  });

  it('schedules a save for a Tab-key indent', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      renderEditor();
      const el = textarea();
      el.setSelectionRange(0, 0);
      fireEvent.keyDown(el, { key: 'Tab' });
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(updateNoteContent).toHaveBeenCalledWith('note-1', '  hello');
    } finally {
      vi.useRealTimers();
    }
  });
});
