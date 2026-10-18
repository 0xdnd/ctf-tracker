import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type RGB = [number, number, number];

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8').replace(/\r\n/g, '\n');

const TEXT_TOKENS = ['text-primary', 'text-secondary', 'text-muted', 'text-tertiary', 'text-dim'] as const;
const SURFACE_TOKENS = ['surface-base', 'surface-card', 'surface-elevated', 'surface-sunken', 'surface-hover'] as const;

// Selector fragment that uniquely identifies each preset x mode block's selector list.
const BLOCKS: Record<string, string> = {
  'obsidian-light': ':root,\n[data-theme="obsidian"]:not(.dark)',
  'obsidian-dark': '.dark,\n[data-theme="obsidian"].dark',
  'monolith-light': '[data-theme="monolith"]:not(.dark)',
  'monolith-dark': '[data-theme="monolith"].dark',
  'htb-light': '[data-theme="htb"]:not(.dark) {',
  'htb-dark': '[data-theme="htb"].dark {',
};

function parseBlock(selectorNeedle: string): Record<string, RGB> {
  const start = css.indexOf(selectorNeedle);
  if (start < 0) throw new Error(`Block not found: ${selectorNeedle}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  const out: Record<string, RGB> = {};
  const re = /--([a-z0-9-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

function lum([r, g, b]: RGB): number {
  const c = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function ratio(a: RGB, b: RGB): number {
  const [hi, lo] = [Math.max(lum(a), lum(b)), Math.min(lum(a), lum(b))];
  return (hi + 0.05) / (lo + 0.05);
}

const CALLOUTS = ['info', 'tip', 'warn', 'danger', 'success'] as const;

// Callout tokens live in shared blocks: light default on :root, dark override on .dark selector list.
const CALLOUT_BLOCKS = {
  light: ':root {\n  --callout-info-fg',
  dark: '[data-theme="industrial"].dark {\n  --callout-info-fg',
} as const;

function calloutTokens(mode: 'light' | 'dark'): Record<string, RGB> {
  return parseBlock(CALLOUT_BLOCKS[mode]);
}

const CAT_INDICES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const INVERSE_TOKENS = [
  'surface-inverse',
  'surface-inverse-elevated',
  'border-inverse',
  'text-on-inverse',
  'text-on-inverse-muted',
] as const;
const INVERSE_SURFACES = ['surface-inverse', 'surface-inverse-elevated'] as const;
const INVERSE_TEXT = ['text-on-inverse', 'text-on-inverse-muted'] as const;
const SYNTAX_NAMES = ['keyword', 'string', 'number', 'flag', 'variable', 'comment'] as const;

// Syntax tokens are shared by every preset x mode: they only ever render on the (always dark) inverse surface.
const SYNTAX_BLOCK = ':root {\n  --syntax-keyword';

describe('Token contrast matrix: every text token on every surface token (WCAG AA 4.5:1)', () => {
  for (const [combo, needle] of Object.entries(BLOCKS)) {
    const tokens = parseBlock(needle);

    it(`[${combo}] defines all text and surface tokens`, () => {
      for (const t of [...TEXT_TOKENS, ...SURFACE_TOKENS, 'accent-fg', 'border-accent']) {
        expect(tokens[t], `${combo} missing --${t}`).toBeDefined();
      }
    });

    for (const text of TEXT_TOKENS) {
      for (const surface of SURFACE_TOKENS) {
        it(`[${combo}] ${text} on ${surface} >= 4.5:1`, () => {
          const r = ratio(tokens[text], tokens[surface]);
          expect(r, `${combo}: ${text} [${tokens[text]}] on ${surface} [${tokens[surface]}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    it(`[${combo}] accent-fg on accent >= 4.5:1`, () => {
      const r = ratio(tokens['accent-fg'], tokens['border-accent']);
      expect(r, `${combo}: accent-fg on border-accent = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    });

    for (const surface of SURFACE_TOKENS) {
      it(`[${combo}] accent (border-accent) as text on ${surface} >= 4.5:1`, () => {
        const r = ratio(tokens['border-accent'], tokens[surface]);
        expect(r, `${combo}: border-accent [${tokens['border-accent']}] on ${surface} [${tokens[surface]}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      });
    }

    if (combo.endsWith('-light')) {
      for (const tk of ['cyber-cyan', 'cyber-neon'] as const) {
        for (const surface of SURFACE_TOKENS) {
          it(`[${combo}] ${tk} as text on ${surface} >= 4.5:1`, () => {
            const r = ratio(tokens[tk], tokens[surface]);
            expect(r, `${combo}: ${tk} [${tokens[tk]}] on ${surface} [${tokens[surface]}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
          });
        }
      }
    }

    // Categorical tokens: --cat-N-{fg,bg,border}
    for (const n of CAT_INDICES) {
      const fg = tokens[`cat-${n}-fg`];
      const bg = tokens[`cat-${n}-bg`];
      const border = tokens[`cat-${n}-border`];
      it(`[${combo}] cat-${n} fg/bg/border defined`, () => {
        expect(fg, `${combo} missing --cat-${n}-fg`).toBeDefined();
        expect(bg, `${combo} missing --cat-${n}-bg`).toBeDefined();
        expect(border, `${combo} missing --cat-${n}-border`).toBeDefined();
      });
      it(`[${combo}] cat-${n}-fg on cat-${n}-bg >= 4.5:1`, () => {
        const r = ratio(fg, bg);
        expect(r, `${combo}: cat-${n}-fg [${fg}] on cat-${n}-bg [${bg}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      });
      for (const surface of SURFACE_TOKENS) {
        it(`[${combo}] cat-${n}-fg on ${surface} >= 4.5:1`, () => {
          const r = ratio(fg, tokens[surface]);
          expect(r, `${combo}: cat-${n}-fg [${fg}] on ${surface} [${tokens[surface]}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    // Inverse (intentionally fixed-dark) surface, dark in BOTH modes
    it(`[${combo}] defines all inverse tokens`, () => {
      for (const t of INVERSE_TOKENS) expect(tokens[t], `${combo} missing --${t}`).toBeDefined();
    });
    for (const surface of INVERSE_SURFACES) {
      it(`[${combo}] ${surface} is dark (luminance < 0.05)`, () => {
        expect(lum(tokens[surface]), `${combo}: ${surface} [${tokens[surface]}] must be dark`).toBeLessThan(0.05);
      });
      for (const text of INVERSE_TEXT) {
        it(`[${combo}] ${text} on ${surface} >= 4.5:1`, () => {
          const r = ratio(tokens[text], tokens[surface]);
          expect(r, `${combo}: ${text} [${tokens[text]}] on ${surface} [${tokens[surface]}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
        });
      }
      for (const name of SYNTAX_NAMES) {
        it(`[${combo}] syntax-${name} on ${surface} >= 4.5:1`, () => {
          const fg = parseBlock(SYNTAX_BLOCK)[`syntax-${name}`];
          expect(fg, `missing --syntax-${name}`).toBeDefined();
          const r = ratio(fg, tokens[surface]);
          expect(r, `${combo}: syntax-${name} [${fg}] on ${surface} [${tokens[surface]}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    const mode = combo.endsWith('-dark') ? 'dark' : 'light';
    const callouts = calloutTokens(mode);
    for (const c of CALLOUTS) {
      const fg = callouts[`callout-${c}-fg`];
      const bg = callouts[`callout-${c}-bg`];
      it(`[${combo}] callout-${c}-fg defined`, () => {
        expect(fg, `missing callout-${c}-fg`).toBeDefined();
        expect(bg, `missing callout-${c}-bg`).toBeDefined();
      });
      for (const surface of SURFACE_TOKENS) {
        it(`[${combo}] callout-${c}-fg on ${surface} >= 4.5:1`, () => {
          const r = ratio(fg, tokens[surface]);
          expect(r, `${combo}: callout-${c}-fg [${fg}] on ${surface} [${tokens[surface]}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
        });
      }
      it(`[${combo}] callout-${c}-fg on callout-${c}-bg >= 4.5:1`, () => {
        const r = ratio(fg, bg);
        expect(r, `${combo}: callout-${c}-fg [${fg}] on bg [${bg}] = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
