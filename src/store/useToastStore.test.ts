import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToastStore, toast } from './useToastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });
  afterEach(() => vi.useRealTimers());

  it('keeps a durationMs:0 toast with an action sticky', () => {
    const onClick = vi.fn();
    useToastStore.getState().addToast({ type: 'info', message: 'hi', durationMs: 0, action: { label: 'Reload', onClick } });
    vi.advanceTimersByTime(60_000);
    const [t] = useToastStore.getState().toasts;
    expect(t.action?.label).toBe('Reload');
    t.action!.onClick();
    expect(onClick).toHaveBeenCalled();
  });

  it('still auto-dismisses default toasts', () => {
    toast.success('ok');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(3600);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
