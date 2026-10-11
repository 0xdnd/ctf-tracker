export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export interface SwUpdateOptions {
  navigator: Pick<Navigator, 'serviceWorker'>;
  location: Pick<Location, 'reload'>;
  notify: (details: { message: string; actionLabel: string; onAction: () => void }) => void;
  flushBeforeReload: () => void | Promise<void>;
  now: () => number;
  scriptUrl?: string;
  /** Visibility source; defaults to the global document. */
  document?: Pick<Document, 'addEventListener' | 'visibilityState'>;
}

export async function initServiceWorkerUpdates(opts: SwUpdateOptions): Promise<void> {
  const sw = opts.navigator.serviceWorker;
  const doc = opts.document ?? (typeof document !== 'undefined' ? document : undefined);
  // Without a controller beforehand this is the first install; the claim that follows must not reload.
  const hadController = !!sw.controller;
  let reloading = false;
  let lastCheck = opts.now();

  sw.addEventListener('controllerchange', async () => {
    if (!hadController || reloading) return;
    reloading = true;
    try {
      await opts.flushBeforeReload();
    } catch {
      // Reload anyway; the flush is best effort.
    }
    opts.location.reload();
  });

  const reg = await sw.register(opts.scriptUrl ?? '/sw.js', { scope: '/' });

  const promptReload = () =>
    opts.notify({
      message: 'A new version of ZeroBox is available',
      actionLabel: 'Reload',
      onAction: () => reg.waiting?.postMessage({ type: 'SKIP_WAITING' }),
    });

  if (reg.waiting) promptReload();

  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && sw.controller) promptReload();
    });
  });

  doc?.addEventListener('visibilitychange', () => {
    if (doc.visibilityState !== 'visible') return;
    const t = opts.now();
    if (t - lastCheck < UPDATE_CHECK_INTERVAL_MS) return;
    lastCheck = t;
    reg.update().catch(() => {});
  });
}
