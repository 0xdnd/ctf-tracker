import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import vm from 'node:vm';
import { WELCOME_ROWS, WELCOME_STEP } from '../../onboarding/guideMeta';
import { CARD_SHADOW, DIM, buttonStyles, cardBody, cardSurface, cardTitle } from '../../onboarding/guideMotion';
import { FIRST_RUN_KEY, isFirstRunTourExcludedPath } from '../../onboarding/useFirstRunTour';
import { ONBOARDING_STORAGE_KEY } from '../../onboarding/onboardingStorage';

const req = createRequire(import.meta.url);
const ws = req('../../../scripts/lib/welcome-static.cjs');
const { applyCsp, inlineScriptHashes, hashScript } = req('../../../scripts/lib/csp.cjs');

describe('static welcome card markup', () => {
  it('carries the same copy as the React welcome card', () => {
    expect(ws.CARD_HTML).toContain(`>${WELCOME_STEP.title}</div>`);
    expect(ws.CARD_HTML).toContain(`>${WELCOME_STEP.body}</p>`);
    for (const row of WELCOME_ROWS) {
      expect(ws.CARD_HTML).toContain(`>${row.title}</span>`);
      expect(ws.CARD_HTML).toContain(`>${row.body}</span>`);
    }
    for (const label of ['Import your solved boxes', 'Skip', 'Start tour']) expect(ws.CARD_HTML).toContain(`>${label}</button>`);
  });

  it('reuses the React card class strings, so it is the same size and look', () => {
    expect(ws.C.card).toContain(cardSurface);
    expect(ws.C.title).toBe(`mt-4 ${cardTitle}`);
    expect(ws.C.body).toBe(cardBody);
    expect(ws.BTN_PRIMARY).toBe(buttonStyles.primary);
    expect(ws.BTN_GHOST).toBe(`-ml-3 ${buttonStyles.ghost}`);
    expect(ws.DIM).toBe(DIM);
    expect(ws.CARD_SHADOW).toBe(CARD_SHADOW);
  });

  it('is hidden from assistive tech and keeps its buttons out of the tab order', () => {
    expect(ws.CARD_HTML).toMatch(/^<div data-zb-welcome [^>]*aria-hidden="true"/);
    const buttons: string[] = ws.CARD_HTML.match(/<button [^>]*>/g) ?? [];
    expect(buttons).toHaveLength(3);
    for (const b of buttons) expect(b).toContain('tabindex="-1"');
    expect(ws.CARD_HTML).not.toMatch(/\sid="/);
  });
});

describe('injectWelcome', () => {
  const page =
    '<html><head><meta http-equiv="Content-Security-Policy" content="script-src \'self\' \'unsafe-inline\';" /></head><body><div id="root"><div id="boot-splash"></div></div></body></html>';

  it('puts the gate in the head and the card before #root, not inside it', () => {
    const out: string = ws.injectWelcome(page);
    expect(out.indexOf(ws.GATE_SCRIPT)).toBeGreaterThan(-1);
    expect(out.indexOf(ws.GATE_SCRIPT)).toBeLessThan(out.indexOf('</head>'));
    expect(out.indexOf('data-zb-welcome')).toBeLessThan(out.indexOf('<div id="root">'));
    expect(out).toContain('<div id="root"><div id="boot-splash">');
  });

  it('is idempotent and skips pages without #root', () => {
    const once = ws.injectWelcome(page);
    expect(ws.injectWelcome(once)).toBe(once);
    expect(ws.injectWelcome('<html><head></head><body>x</body></html>')).toBe('<html><head></head><body>x</body></html>');
  });

  it('gets its inline script hashed into the page CSP', () => {
    const injected: string = ws.injectWelcome(page);
    expect(inlineScriptHashes(injected)).toContain(hashScript(ws.GATE_SCRIPT));
    const out: string = applyCsp(injected).html;
    expect(out).toContain(hashScript(ws.GATE_SCRIPT));
    expect(out).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
});

interface Env {
  path?: string;
  search?: string;
  width?: number;
  store?: Record<string, string>;
  throws?: boolean;
}

function runGate(env: Env) {
  const classes = new Set<string>(['dark']);
  const styleProps: Record<string, string> = {};
  const listeners: Array<(e: unknown) => void> = [];
  const root = {
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
    style: { zoom: '', setProperty: (k: string, v: string) => (styleProps[k] = v) },
  };
  const win: Record<string, unknown> = {
    document: { documentElement: root, addEventListener: (_: string, fn: (e: unknown) => void) => listeners.push(fn) },
    location: { pathname: env.path ?? '/tracker/', search: env.search ?? '' },
    localStorage: {
      getItem: (k: string) => {
        if (env.throws) throw new Error('blocked');
        return env.store?.[k] ?? null;
      },
    },
    innerWidth: env.width ?? 412,
  };
  win.window = win;
  vm.runInNewContext(ws.GATE_SCRIPT, win);
  return { classes, root, styleProps, listeners, win };
}

describe('welcome gate script', () => {
  it('reads the same keys as the app', () => {
    expect(ws.FIRST_RUN_KEY).toBe(FIRST_RUN_KEY);
    expect(ws.ONBOARDING_KEY).toBe(ONBOARDING_STORAGE_KEY);
  });

  it('shows the card to a first-time visitor', () => {
    expect(runGate({}).classes.has('zb-first')).toBe(true);
  });

  it('never shows it to a returning visitor', () => {
    expect(runGate({ store: { [FIRST_RUN_KEY]: 'true' } }).classes.has('zb-first')).toBe(false);
    expect(runGate({ store: { [ONBOARDING_STORAGE_KEY]: JSON.stringify({ tourDone: true }) } }).classes.has('zb-first')).toBe(false);
  });

  it('ignores a corrupt onboarding record, as the app does', () => {
    expect(runGate({ store: { [ONBOARDING_STORAGE_KEY]: '{nope' } }).classes.has('zb-first')).toBe(true);
    expect(runGate({ store: { [ONBOARDING_STORAGE_KEY]: 'null' } }).classes.has('zb-first')).toBe(true);
  });

  it('stays hidden when storage is blocked', () => {
    expect(runGate({ throws: true }).classes.has('zb-first')).toBe(false);
  });

  it('skips the same landing paths as the tour', () => {
    for (const path of ['/tracker/', '/tracker', '/', '/oscp-points-calculator/', '/oscp-points-calculator', '/notes', '/notes/', '/field-manual/', '/NOTES/', '/Oscp-Points-Calculator/', '/notes/x', '/exam/']) {
      expect(runGate({ path }).classes.has('zb-first'), path).toBe(!isFirstRunTourExcludedPath(path));
    }
  });

  it('skips a popout window', () => {
    expect(runGate({ search: '?popout=true' }).classes.has('zb-first')).toBe(false);
    expect(runGate({ search: '?a=1&popout=true&b=2' }).classes.has('zb-first')).toBe(false);
    expect(runGate({ search: '?popout=false' }).classes.has('zb-first')).toBe(true);
  });

  it('skips shared machine links, which open a modal that holds the tour back', () => {
    expect(runGate({ search: '?target=RootMe' }).classes.has('zb-first')).toBe(false);
    expect(runGate({ search: '?search=x&machine=Lame' }).classes.has('zb-first')).toBe(false);
    expect(runGate({ search: '?search=target' }).classes.has('zb-first')).toBe(true);
    expect(runGate({ search: '?import=1' }).classes.has('zb-first')).toBe(true);
  });

  it('applies the same auto zoom as App so the card does not resize on mount', () => {
    expect(runGate({ width: 412 }).root.style.zoom).toBe('');
    expect(runGate({ width: 800 }).root.style.zoom).toBe('0.85');
    expect(runGate({ width: 1100 }).styleProps['--app-zoom']).toBe('0.90');
    expect(runGate({ width: 1350 }).root.style.zoom).toBe('');
  });

  it('records a pressed button for React and hides the card on Skip', () => {
    const g = runGate({});
    expect(g.listeners).toHaveLength(1);
    const target = (act: string) => ({ closest: () => ({ getAttribute: () => act }) });
    g.listeners[0]({ target: target('start') });
    expect(g.win.__zbWelcomeIntent).toBe('start');
    expect(g.classes.has('zb-first')).toBe(true);
    g.listeners[0]({ target: target('skip') });
    expect(g.win.__zbWelcomeIntent).toBe('skip');
    expect(g.classes.has('zb-first')).toBe(false);
    g.win.__zbWelcomeIntent = undefined;
    g.listeners[0]({ target: { closest: () => null } });
    expect(g.win.__zbWelcomeIntent).toBeUndefined();
  });
});
