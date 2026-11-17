import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { afterFirstPaint, resetAfterFirstPaintForTests } from './afterFirstPaint';

describe('afterFirstPaint', () => {
  beforeEach(() => {
    resetAfterFirstPaintForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves only after frames and the settle floor, and shares one promise', async () => {
    const done = vi.fn();
    const p = afterFirstPaint();
    expect(afterFirstPaint()).toBe(p);
    void p.then(done);
    await vi.advanceTimersByTimeAsync(0);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('waits for the load event when the document is still loading', async () => {
    const state = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const done = vi.fn();
    void afterFirstPaint().then(done);
    await vi.advanceTimersByTimeAsync(2000);
    expect(done).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(done).toHaveBeenCalledTimes(1);
    state.mockRestore();
  });

  it('does not wait forever for a load event that never fires', async () => {
    const state = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const done = vi.fn();
    void afterFirstPaint().then(done);
    await vi.advanceTimersByTimeAsync(10000);
    expect(done).toHaveBeenCalledTimes(1);
    state.mockRestore();
  });

  it('settles without throwing when window disappears before the idle callback (torn-down environment)', async () => {
    const done = vi.fn();
    void afterFirstPaint().then(done);
    // Frames are queued; run them, then remove window before the settle timer fires.
    await vi.advanceTimersByTimeAsync(40);
    vi.stubGlobal('window', undefined);
    try {
      await expect(vi.advanceTimersByTimeAsync(5000)).resolves.not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(done).toHaveBeenCalledTimes(1);
  });
});
