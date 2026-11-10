// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const openUrl = vi.fn(() => Promise.resolve());
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl }));
const isTauriTarget = vi.fn(() => true);
vi.mock('../utils/runtimeTarget', () => ({ isTauriTarget: () => isTauriTarget() }));

const flush = () => new Promise((r) => setTimeout(r, 0));

const addLink = (href: string, target?: string) => {
  const a = document.createElement('a');
  a.setAttribute('href', href);
  if (target) a.target = target;
  const span = document.createElement('span');
  a.appendChild(span);
  document.body.appendChild(a);
  return span;
};

describe('externalLinks', () => {
  const added: Array<[string, EventListenerOrEventListenerObject]> = [];
  const realAdd = document.addEventListener.bind(document);
  const realOpen = window.open;

  afterEach(() => {
    for (const [type, fn] of added.splice(0)) document.removeEventListener(type, fn, true);
    window.open = realOpen;
  });

  beforeEach(() => {
    document.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
      added.push([type, fn]);
      realAdd(type, fn, opts as boolean);
    }) as typeof document.addEventListener;
    vi.resetModules();
    openUrl.mockClear();
    isTauriTarget.mockReturnValue(true);
    document.body.innerHTML = '';
  });

  it('intercepts external links under Tauri', async () => {
    const { installExternalLinkHandler } = await import('../utils/externalLinks');
    installExternalLinkHandler();
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    addLink('https://example.com/x', '_blank').dispatchEvent(ev);
    await flush();
    expect(ev.defaultPrevented).toBe(true);
    expect(openUrl).toHaveBeenCalledWith('https://example.com/x');
  });

  it('intercepts middle click', async () => {
    const { installExternalLinkHandler } = await import('../utils/externalLinks');
    installExternalLinkHandler();
    const ev = new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 });
    addLink('https://example.com/y').dispatchEvent(ev);
    await flush();
    expect(openUrl).toHaveBeenCalledWith('https://example.com/y');
  });

  it('leaves internal and hash links alone', async () => {
    const { installExternalLinkHandler } = await import('../utils/externalLinks');
    installExternalLinkHandler();
    for (const href of ['#/field-manual', '/tracker', `${window.location.origin}/a`, 'mailto:a@b.c']) {
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      addLink(href).dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
    }
    await flush();
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('does nothing outside Tauri', async () => {
    isTauriTarget.mockReturnValue(false);
    const { installExternalLinkHandler } = await import('../utils/externalLinks');
    const before = window.open;
    installExternalLinkHandler();
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    addLink('https://example.com/z').dispatchEvent(ev);
    await flush();
    expect(ev.defaultPrevented).toBe(false);
    expect(openUrl).not.toHaveBeenCalled();
    expect(window.open).toBe(before);
  });

  it('routes external window.open to the opener, internal to native', async () => {
    const native = vi.fn(() => null);
    window.open = native as unknown as typeof window.open;
    const { installExternalLinkHandler } = await import('../utils/externalLinks');
    installExternalLinkHandler();
    window.open('https://example.com/w', '_blank');
    await flush();
    expect(openUrl).toHaveBeenCalledWith('https://example.com/w');
    expect(native).not.toHaveBeenCalled();
    window.open(`${window.location.origin}/popout`, '_blank');
    expect(native).toHaveBeenCalledTimes(1);
  });
});
