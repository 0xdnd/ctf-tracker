/**
 * Runs work that must not compete with the first paint (the machine catalog, the tour runner chunk).
 * Resolves once the page has loaded (or LOAD_CAP_MS has passed, so one stalled subresource cannot hold it
 * back), two frames have been produced, the first contentful paint is a moment behind us and the main
 * thread is idle. The request then starts after the largest contentful paint instead of racing it. Every
 * caller shares one promise.
 */
const SETTLE_FLOOR_MS = 400;
/** Largest contentful paint candidates keep arriving for a moment after the first contentful paint. */
const AFTER_FCP_MS = 300;
const LOAD_CAP_MS = 3000;
const IDLE_TIMEOUT_MS = 2000;

let settled: Promise<void> | null = null;

export function afterFirstPaint(): Promise<void> {
  return (settled ??= new Promise<void>((resolve) => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const now = performance.now();
          const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
          const wait = Math.max(0, SETTLE_FLOOR_MS - now, fcp + AFTER_FCP_MS - now);
          setTimeout(() => {
            if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS });
            else setTimeout(resolve, 0);
          }, wait);
        })
      );
    };
    if (document.readyState === 'complete') start();
    else {
      window.addEventListener('load', start, { once: true });
      setTimeout(start, LOAD_CAP_MS);
    }
  }));
}

/** Test seam: forgets the shared promise. */
export function resetAfterFirstPaintForTests(): void {
  settled = null;
}
