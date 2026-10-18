import { describe, it, expect, vi } from 'vitest';
import { initServiceWorkerUpdates, UPDATE_CHECK_INTERVAL_MS } from './swUpdate';

type Handler = (...a: unknown[]) => unknown;
const emitter = () => {
  const map: Record<string, Handler[]> = {};
  return {
    addEventListener: (t: string, h: Handler) => {
      (map[t] ||= []).push(h);
    },
    emit: (t: string) => Promise.all((map[t] || []).map((h) => h())),
  };
};

function setup({ controller = true, waiting = false } = {}) {
  const swEv = emitter();
  const regEv = emitter();
  const docEv = emitter();
  const waitingWorker = { postMessage: vi.fn() };
  const reg: any = {
    ...regEv,
    waiting: waiting ? waitingWorker : null,
    installing: null,
    update: vi.fn().mockResolvedValue(undefined),
  };
  const sw: any = { ...swEv, controller: controller ? {} : null, register: vi.fn().mockResolvedValue(reg) };
  const doc: any = { ...docEv, visibilityState: 'visible' };
  const order: string[] = [];
  const location = { reload: vi.fn(() => order.push('reload')) };
  const notify = vi.fn();
  const flushBeforeReload = vi.fn(async () => {
    await Promise.resolve();
    order.push('flush');
  });
  let t = 1_000_000;
  const init = () =>
    initServiceWorkerUpdates({
      navigator: { serviceWorker: sw },
      location,
      notify,
      flushBeforeReload,
      now: () => t,
      document: doc,
    });
  return { sw, swEv, regEv, docEv, doc, reg, waitingWorker, location, notify, flushBeforeReload, order, init, advance: (ms: number) => (t += ms) };
}

const installing = (state: string) => {
  const ev = emitter();
  const w: any = { ...ev, state };
  return {
    w,
    fire: (s: string) => {
      w.state = s;
      return ev.emit('statechange');
    },
  };
};

describe('initServiceWorkerUpdates', () => {
  it('does not reload on controllerchange during first install', async () => {
    const s = setup({ controller: false });
    await s.init();
    await s.swEv.emit('controllerchange');
    expect(s.flushBeforeReload).not.toHaveBeenCalled();
    expect(s.location.reload).not.toHaveBeenCalled();
  });

  it('prompts when a waiting worker exists at registration', async () => {
    const s = setup({ waiting: true });
    await s.init();
    expect(s.notify).toHaveBeenCalledTimes(1);
    expect(s.notify.mock.calls[0][0]).toMatchObject({
      message: 'A new version of ZeroBox is available',
      actionLabel: 'Reload',
    });
  });

  it('prompts on updatefound -> installed only when a controller exists', async () => {
    const withCtl = setup();
    await withCtl.init();
    const a = installing('installing');
    withCtl.reg.installing = a.w;
    await withCtl.regEv.emit('updatefound');
    await a.fire('installed');
    expect(withCtl.notify).toHaveBeenCalledTimes(1);

    const noCtl = setup({ controller: false });
    await noCtl.init();
    const b = installing('installing');
    noCtl.reg.installing = b.w;
    await noCtl.regEv.emit('updatefound');
    await b.fire('installed');
    expect(noCtl.notify).not.toHaveBeenCalled();
  });

  it('action posts SKIP_WAITING to the waiting worker', async () => {
    const s = setup({ waiting: true });
    await s.init();
    s.notify.mock.calls[0][0].onAction();
    expect(s.waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('reloads exactly once after flush even if controllerchange fires twice', async () => {
    const s = setup();
    await s.init();
    await Promise.all([s.swEv.emit('controllerchange'), s.swEv.emit('controllerchange')]);
    expect(s.location.reload).toHaveBeenCalledTimes(1);
    expect(s.flushBeforeReload).toHaveBeenCalledTimes(1);
    expect(s.order).toEqual(['flush', 'reload']);
  });

  it('throttles reg.update() to once per hour on visibility', async () => {
    const s = setup();
    await s.init();
    await s.docEv.emit('visibilitychange');
    expect(s.reg.update).not.toHaveBeenCalled();
    s.advance(UPDATE_CHECK_INTERVAL_MS + 1);
    await s.docEv.emit('visibilitychange');
    expect(s.reg.update).toHaveBeenCalledTimes(1);
    s.advance(1000);
    await s.docEv.emit('visibilitychange');
    expect(s.reg.update).toHaveBeenCalledTimes(1);
    s.advance(UPDATE_CHECK_INTERVAL_MS);
    s.doc.visibilityState = 'hidden';
    await s.docEv.emit('visibilitychange');
    expect(s.reg.update).toHaveBeenCalledTimes(1);
    s.doc.visibilityState = 'visible';
    await s.docEv.emit('visibilitychange');
    expect(s.reg.update).toHaveBeenCalledTimes(2);
  });
});
