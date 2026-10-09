#!/usr/bin/env node
/**
 * Captures the real-app screenshots used on the marketing landing page.
 *
 *   npm run shots:landing            (or: node scripts/capture-landing-shots.mjs)
 *   node scripts/capture-landing-shots.mjs --canvas  (encode WebP with the in-page canvas instead of Pillow)
 *   node scripts/capture-landing-shots.mjs --debug   (also keep the raw PNG captures)
 *   node scripts/capture-landing-shots.mjs --only=graph,table   (re-capture only these shots; the manifest keeps the others)
 *
 * Output:
 *   public/images/landing/{name}-2400.webp, {name}-1600.webp, {name}-800.webp
 *   scripts/templates/landing-shots.json   (read by prerender)
 *
 * How it works
 *   - Builds the app with `vite build` into a private directory (.landing-shots-dist, removed
 *     afterwards) and serves it with `vite preview` on port 4173. Only the Vite build is needed,
 *     not the full site build.
 *   - A brand new Chromium context is used every run (no profile, no storage), dark colour scheme,
 *     reduced motion, deviceScaleFactor 3. Viewport 1100x760 for the tracker, vault and table shots,
 *     1440x1200 for the graph, 1024x900 for the exam and hero-app shots.
 *   - Determinism: the clock is installed at a fixed instant and then PAUSED, so time only moves
 *     when this script calls clock.runFor(); Math.random is replaced by a seeded PRNG; the
 *     pointer is parked off-screen and the caret is hidden.
 *   - Demo data comes from the app's own onboarding flow ("Load Demo Baseline"): a public
 *     reference roster with placeholder flags and masked IPs. The exam candidate identity is
 *     overwritten with a generic one before the exam starts. The vault shot uses five obviously
 *     fake credentials seeded into localStorage before boot; the script asserts every secret is
 *     masked and never reveals one. Writeups, target detail and the exam evidence drawer are not
 *     captured.
 *   - Captures are device-scale 3 crops of one focused region each (no full-window shots).
 *   - Encoding: Lanczos downscale + WebP (Pillow, method 6) at quality 92 -> 88, the highest that
 *     fits the budgets (2400w <= 380 KB, 1600w <= 200 KB, 800w <= 70 KB). Falls back to an in-page
 *     canvas encoder (toDataURL) when Python/Pillow is unavailable or with --canvas. A width larger
 *     than the crop's native pixel width is skipped rather than upscaled.
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'landing');
const MANIFEST = path.join(ROOT, 'scripts', 'templates', 'landing-shots.json');
const DEBUG_DIR = path.join(os.tmpdir(), 'landing-shots-debug');
// Private build output: other tooling rebuilding ./dist mid-run cannot break the capture.
const DIST_DIR = path.join(ROOT, '.landing-shots-dist');

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const VIEW_TRACKER = { width: 1100, height: 760 };
// hero-app: the app's narrowest desktop layout (1024 is where the sidebar and side-by-side lanes appear).
const VIEW_HERO = { width: 1024, height: 1000 };
// The graph svg keeps a 4:3 viewBox, so a 1120px-wide crop with no letterbox strips needs a canvas at least 840px tall.
const VIEW_GRAPH = { width: 1440, height: 1200 };
const VIEW_EXAM = { width: 1024, height: 900 };
// Width the app is laid out at for hero-app (rail 58px + two lanes of ~210px); chosen so the crop is <= 533 CSS px.
const HERO_LAYOUT_W = 600;
const SCALE = 3;
const T0 = new Date('2026-10-01T09:00:00Z');
const PAUSE_AT = new Date('2026-10-01T09:00:30Z');
const WIDTHS = [2400, 1600, 800];
const BUDGET_KB = { 2400: 380, 1600: 200, 800: 70 };
// WebP quality window (percent). Quality drops below the floor only if a budget cannot be met.
const Q_MAX = 92;
const Q_MIN = 88;
const PRNG_SEED = 12345;

const args = new Set(process.argv.slice(2));
const DEBUG = args.has('--debug');
const FORCE_CANVAS = args.has('--canvas');
const ONLY = (process.argv.slice(2).find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const want = (...names) => ONLY.length === 0 || names.some((n) => ONLY.includes(n));

/** Shot names and alt text (the crop of every shot is computed in main()). */
const SHOTS = {
  'hero-app': {
    alt: 'ZeroBox tracker with the sidebar collapsed to an icon rail, the filter bar, and the Foothold and Completed lanes of a kanban board of HTB and THM machines.',
  },
  'burn-chart': {
    alt: 'ZeroBox exam burn-down chart against the 70 point pass line.',
  },
  graph: {
    alt: 'ZeroBox attack graph after Auto layout: the Included, Bike, Unified and Funnel host nodes linked by SSH tunnel, chisel and ligolo edges.',
  },
  table: {
    alt: 'ZeroBox machine table with three rows selected and the bulk action bar showing Set status, Add tag and Remove tag.',
  },
  vault: {
    alt: 'ZeroBox evidence vault rows listing a target, its principal and a masked secret behind a reveal toggle.',
  },
  exam: {
    alt: 'ZeroBox OSCP exam simulator three hours in: the OSCP track, total score, countdown clock and the first Active Directory targets.',
  },
};

/** Obviously fake credentials seeded into the vault: the three requested (mike password, svc_backup NTLM hash, root key) plus two more to fill a 3:2 crop. */
const FAKE_CREDENTIALS = [
  { id: 'cred_demo_1', type: 'password', username: 'mike', secret: 'DemoPass-NotReal-1!', sourceMachineId: 'htb-bike', notes: 'demo data', createdAt: '2026-08-01T10:00:00.000Z' },
  { id: 'cred_demo_2', type: 'hash', username: 'svc_backup', hashType: 'NTLM', secret: '00000000000000000000000000000000', sourceMachineId: 'htb-unified', notes: 'demo data', createdAt: '2026-08-01T10:05:00.000Z' },
  { id: 'cred_demo_3', type: 'key', username: 'root', secret: '-----BEGIN OPENSSH PRIVATE KEY-----\nDEMO-ONLY-NOT-A-REAL-KEY\n-----END OPENSSH PRIVATE KEY-----', sourceMachineId: 'htb-funnel', notes: 'demo data', createdAt: '2026-08-01T10:10:00.000Z' },
  { id: 'cred_demo_4', type: 'password', username: 'admin', secret: 'DemoPass-NotReal-2!', sourceMachineId: 'htb-three', notes: 'demo data', createdAt: '2026-08-01T10:15:00.000Z' },
  { id: 'cred_demo_5', type: 'token', username: 'web_deploy', secret: 'demo-token-not-a-real-secret', sourceMachineId: 'htb-oopsie', notes: 'demo data', createdAt: '2026-08-01T10:20:00.000Z' },
];
const FAKE_SECRETS = ['DemoPass-NotReal-1!', 'DemoPass-NotReal-2!', 'DEMO-ONLY-NOT-A-REAL-KEY', 'demo-token-not-a-real-secret'];

// --------------------------------------------------------------------------------------------
// Server
// --------------------------------------------------------------------------------------------

const isUp = () =>
  new Promise((resolve) => {
    const req = http.get(`${BASE}/`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });

const run = (script, scriptArgs) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], { cwd: ROOT, stdio: 'ignore' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${scriptArgs.join(' ')} exited ${code}`))));
  });

const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

async function startServer() {
  if (await isUp()) throw new Error(`port ${PORT} is already in use; stop that server first`);
  console.log('> vite build');
  await run(VITE_BIN, ['build', '--outDir', DIST_DIR, '--emptyOutDir']);
  console.log('> vite preview');
  const child = spawn(
    process.execPath,
    [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort', '--outDir', DIST_DIR],
    { cwd: ROOT, stdio: 'ignore' },
  );
  for (let i = 0; i < 60; i++) {
    if (await isUp()) return child;
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error('vite preview did not start');
}

// --------------------------------------------------------------------------------------------
// Seeded state injected before the app boots
// --------------------------------------------------------------------------------------------

function initScript({ seed, credentials }) {
  // Seeded PRNG (mulberry32): the tracker's "Randomized" order and generated ids become stable.
  let s = seed;
  Math.random = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Five fake credentials for the vault shot. Profile id is 'guest' (no auth session), see
  // getInitialProfileId() in useCtfStore and getLootStorageKey() in lootPersistence.
  try {
    const LOOT_KEY = 'zerobox_loot_v2_guest';
    if (!localStorage.getItem(LOOT_KEY)) {
      localStorage.setItem(LOOT_KEY, JSON.stringify({ schemaVersion: 1, credentials, credAttempts: [], lootItems: [] }));
    }
  } catch {
    /* storage unavailable */
  }

  // A small pivot chain for the attack-graph shot (app's own persisted graph format).
  try {
    const KEY = 'zerobox-attack-graph-state';
    if (!localStorage.getItem(KEY)) {
      const edge = (id, source, target, type, status, label, port) => ({
        id,
        sourceId: `htb-${source}`,
        targetId: `htb-${target}`,
        type,
        status,
        label,
        port,
        protocol: 'tcp',
        createdAt: '2026-09-30T10:00:00.000Z',
      });
      const edges = [
        edge('shot-e1', 'included', 'bike', 'pivot-ssh', 'compromised', 'SSH tunnel', 22),
        edge('shot-e2', 'bike', 'unified', 'pivot-chisel', 'compromised', 'chisel :8000', 8000),
        edge('shot-e3', 'unified', 'funnel', 'pivot-ligolo', 'compromised', 'ligolo agent', 11601),
      ];
      localStorage.setItem(KEY, JSON.stringify({ graphNodePositions: {}, graphEdges: edges, nodePositions: {}, edges }));
    }
  } catch {
    /* storage unavailable: the graph shot will simply have no edges */
  }

  // No blinking caret in any screenshot.
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = '* { caret-color: transparent !important; }';
    document.head.appendChild(style);
  });
}

// --------------------------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------------------------

/**
 * Advances the paused fake clock in small steps, yielding to the real event loop between steps so
 * React can render and framer-motion can paint. The amount of virtual time is fixed, so the same
 * state is reached on every run regardless of machine speed.
 */
async function settle(page, ms = 2500) {
  const STEP = 100;
  for (let t = 0; t < ms; t += STEP) {
    await page.clock.runFor(STEP);
    await page.waitForTimeout(40);
  }
  // Let any in-flight paint finish without moving the clock.
  await page.waitForTimeout(150);
}

/** Waits for a locator while advancing the paused clock (animations/lazy routes need virtual time). */
async function until(page, locator, { tries = 80 } = {}) {
  for (let i = 0; i < tries; i++) {
    if (await locator.first().isVisible().catch(() => false)) return;
    await settle(page, 200);
  }
  throw new Error(`timed out waiting for ${locator}`);
}

/** Waits until the element and all its ancestors are fully opaque (enter animations finished). */
async function untilOpaque(page, locator, { tries = 80 } = {}) {
  for (let i = 0; i < tries; i++) {
    const ok = await locator
      .first()
      .evaluate((el) => {
        for (let n = el; n; n = n.parentElement) if (parseFloat(getComputedStyle(n).opacity) < 0.99) return false;
        return true;
      })
      .catch(() => false);
    if (ok) return;
    await settle(page, 200);
  }
  if (DEBUG) {
    console.log(await locator.first().evaluate((el) => {
      const out = [];
      for (let n = el; n; n = n.parentElement) out.push(`${n.tagName}.${String(n.className).slice(0, 50)} op=${getComputedStyle(n).opacity} tf=${getComputedStyle(n).transform}`);
      return out;
    }));
  }
  throw new Error(`timed out waiting for opacity of ${locator}`);
}

/** Advance long stretches of virtual time (exam hours) in 1-minute steps. */
async function advance(page, minutes) {
  for (let i = 0; i < minutes; i++) {
    await page.clock.runFor(60_000);
    if (i % 10 === 9) await page.waitForTimeout(20);
  }
  await settle(page, 300);
}

/** Scroll every scrolled container back to the top (clicking low controls scrolls the page's inner panes). */
async function scrollTop(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) if (el.scrollTop > 0) el.scrollTop = 0;
  });
}

/** Bounding box of the nearest ancestor-or-self of `locator` that matches the size/class filter. */
async function rectOf(locator, { minW = 0, minH = 0, cls } = {}) {
  return locator.evaluate(
    (el, o) => {
      let n = el;
      for (; n; n = n.parentElement) {
        const r = n.getBoundingClientRect();
        if (r.width >= o.minW && r.height >= o.minH && (!o.cls || String(n.className).includes(o.cls))) break;
      }
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    },
    { minW, minH, cls },
  );
}

async function rectOfSelector(page, selector) {
  return page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

/** Lane container for a lane title (the title text that is not inside a button, e.g. not a filter pill). */
async function laneRect(page, title) {
  return page.evaluate(
    ({ title }) => {
      const el = [...document.querySelectorAll('div, span, h2, h3')].find(
        (e) => e.children.length === 0 && e.textContent.trim() === title && !e.closest('button'),
      );
      if (!el) return null;
      let n = el;
      for (; n; n = n.parentElement) {
        const r = n.getBoundingClientRect();
        if (r.width >= 150 && r.height >= 250 && String(n.className).includes('rounded')) break;
      }
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    },
    { title },
  );
}

function union(rects) {
  const x1 = Math.min(...rects.map((r) => r.x));
  const y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Throws if visible text `needle` intersects the clip (e.g. an empty-lane placeholder). */
async function assertNoText(page, needle, clip) {
  const hit = await page.evaluate(
    ({ needle, clip }) =>
      [...document.querySelectorAll('*')].some((e) => {
        if (e.children.length > 0 || !e.textContent.includes(needle)) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > clip.x && r.left < clip.x + clip.width && r.bottom > clip.y && r.top < clip.y + clip.height;
      }),
    { needle, clip },
  );
  if (hit) throw new Error(`"${needle}" is visible inside the crop ${JSON.stringify(clip)}`);
}

async function parkPointer(page) {
  await page.mouse.move(1, 1);
}

async function capture(page, name, clip) {
  await parkPointer(page);
  await settle(page, 600);
  // Two consecutive paints must be identical before we accept the frame.
  let prev = await page.screenshot({ clip, animations: 'disabled' });
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(120);
    const next = await page.screenshot({ clip, animations: 'disabled' });
    if (next.equals(prev)) break;
    prev = next;
  }
  if (DEBUG) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
    fs.writeFileSync(path.join(DEBUG_DIR, `${name}.png`), prev);
  }
  return prev;
}

const PY_ENCODER = `
import json, os, sys
from PIL import Image
src, outdir, name, qmax = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
widths = json.loads(sys.argv[5]); budgets = json.loads(sys.argv[6])
im = Image.open(src).convert("RGB")
out = []
todo = []
for w in widths:
    if w <= im.width:
        todo.append((w, budgets[str(w)]))  # never upscale
bigger = [w for w in widths if w > im.width]
if bigger:
    # The crop is smaller than the next standard width: also ship it at its native width
    # (budget of the smallest standard width above it) instead of upscaling.
    todo.append((im.width, budgets[str(min(bigger))]))
for w, budget in todo:
    h = round(im.height * w / im.width)
    r = im.resize((w, h), Image.Resampling.LANCZOS) if w != im.width else im
    q = qmax
    while True:
        path = f"{outdir}/{name}-{w}.webp"
        r.save(path, "WEBP", quality=q, method=6)
        if os.path.getsize(path) <= budget * 1000 or q <= 40:
            break
        q -= 1
    out.append({"w": w, "width": w, "height": h, "quality": q, "budget": budget})
print(json.dumps(out))
`;

function hasPillow() {
  const r = spawnSync('python', ['-I', '-c', 'import sys, PIL.features as f; sys.exit(0 if f.check("webp") else 1)'], { stdio: 'ignore' });
  return r.status === 0;
}

/** Lanczos resize + WebP with Pillow; quality is the highest (from Q_MAX down) that fits the budget. */
function encodeWithPillow(name, png) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-shots-'));
  try {
    const src = path.join(dir, `${name}.png`);
    fs.writeFileSync(src, png);
    const r = spawnSync(
      'python',
      ['-I', '-c', PY_ENCODER, src, dir, name, String(Q_MAX), JSON.stringify(WIDTHS), JSON.stringify(BUDGET_KB)],
      { encoding: 'utf8' },
    );
    if (r.status !== 0) throw new Error(`Pillow encoding failed: ${r.stderr}`);
    return JSON.parse(r.stdout.trim()).map((v) => ({
      ...v,
      file: `${name}-${v.w}.webp`,
      data: fs.readFileSync(path.join(dir, `${name}-${v.w}.webp`)),
    }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Fallback: in-page canvas -> toDataURL('image/webp', q). */
async function encodeWithCanvas(page, name, png) {
  const out = [];
  for (const w of WIDTHS) {
    const enc = await page.evaluate(
      async ({ b64, width, maxBytes, qMax }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        if (width > img.naturalWidth) return null; // never upscale
        const height = Math.round((img.naturalHeight * width) / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        let q = qMax;
        let url;
        let bytes;
        for (;;) {
          url = canvas.toDataURL('image/webp', q / 100);
          if (!url.startsWith('data:image/webp')) throw new Error('canvas WebP encoding unsupported');
          bytes = Math.floor(((url.length - url.indexOf(',') - 1) * 3) / 4);
          if (bytes <= maxBytes || q <= 40) break;
          q -= 1;
        }
        return { b64: url.slice(url.indexOf(',') + 1), width, height, quality: q };
      },
      { b64: png.toString('base64'), width: w, maxBytes: BUDGET_KB[w] * 1000, qMax: Q_MAX },
    );
    if (enc) out.push({ w, file: `${name}-${w}.webp`, width: enc.width, height: enc.height, quality: enc.quality, data: Buffer.from(enc.b64, 'base64') });
  }
  return out;
}

// --------------------------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------------------------

async function main() {
  const server = await startServer();
  const browser = await chromium.launch();
  const results = {}; // name -> { png, cssWidth }
  try {
    const ctx = await browser.newContext({
      viewport: VIEW_TRACKER,
      deviceScaleFactor: SCALE,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      locale: 'en-US',
      timezoneId: 'UTC',
      serviceWorkers: 'block',
    });
    await ctx.addInitScript(initScript, { seed: PRNG_SEED, credentials: FAKE_CREDENTIALS });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.warn('  [pageerror]', e.message));
    globalThis.__page = page;

    const setView = async (v) => {
      await page.setViewportSize(v);
      await settle(page, 1500);
    };
    const take = async (name, clip) => {
      results[name] = { png: await capture(page, name, clip), cssWidth: clip.width };
    };

    await page.clock.install({ time: T0 });
    await page.goto(`${BASE}/tracker/`);
    const demoBtn = page.getByRole('button', { name: /Load Demo Baseline/ });
    await demoBtn.waitFor({ state: 'visible' }); // real time: clock still runs here
    // From here on virtual time only moves through clock.runFor().
    await page.clock.pauseAt(PAUSE_AT);
    await demoBtn.click();
    await settle(page, 3000);

    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (themeAttr !== 'obsidian') throw new Error(`expected default dark preset "obsidian", got "${themeAttr}"`);

    // Toolbar view switchers (present with the sidebar expanded or collapsed).
    const viewBtn = (label) => page.getByRole('button', { name: `${label} View`, exact: true });
    const statusPill = (label) => page.getByRole('button', { name: label, exact: true });

    // ---- hero-app: the app at its narrowest desktop layout, sidebar collapsed to the icon rail ----
    // Lanes sit side by side only from 1024px (Tailwind lg). To get a window about 600 CSS px wide we keep the 1024px
    // viewport (so the lg layout stays) and lay #root out at HERO_LAYOUT_W px, with the Backlog lane hidden and the grid
    // set to two columns so the Foothold and Completed lanes (cards of equal height) share the width.
    // The app's own top bar overlaps itself at that width, so the crop starts under it.
    if (want('hero-app')) {
      console.log('> hero-app');
      await setView(VIEW_HERO);
      await viewBtn('Kanban').click();
      await page.getByRole('button', { name: /Hide Empty Lanes/ }).click();
      await page.getByRole('button', { name: 'Collapse Sidebar' }).click();
      await settle(page, 1500);
      const narrow = await page.addStyleTag({
        content: `#root{width:${HERO_LAYOUT_W}px!important;height:${VIEW_HERO.height}px!important;overflow:hidden;transform:translateZ(0)}`,
      });
      await page.evaluate(() => {
        const title = [...document.querySelectorAll('div, span, h2, h3')].find(
          (e) => e.children.length === 0 && e.textContent.trim() === 'Backlog' && !e.closest('button'),
        );
        let lane = title;
        for (; lane; lane = lane.parentElement) {
          const r = lane.getBoundingClientRect();
          if (r.width >= 100 && r.height >= 250 && String(lane.className).includes('rounded')) break;
        }
        if (!lane) throw new Error('Backlog lane not found');
        lane.parentElement.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        lane.style.display = 'none';
      });
      await settle(page, 1500);
      const lane = async (title) => {
        const r = await laneRect(page, title);
        if (!r) throw new Error(`lane "${title}" not found`);
        return r;
      };
      const completed = await lane('Completed');
      const foothold = await lane('Foothold');
      const laneBottom = Math.min(completed.y + completed.height, foothold.y + foothold.height);
      const topBar = await rectOfSelector(page, 'header');
      const y0 = Math.ceil(topBar.y + topBar.height);
      const w = Math.ceil(completed.x + completed.width) + 6;
      if (w > 533) console.warn(`  [hero-app] crop is ${w} CSS px wide (target <= 533 for a >= 0.9 scale in the 480px hero column)`);
      const cards = await page.evaluate(() =>
        [...document.querySelectorAll('.cyber-kanban-contain')].map((e) => {
          const r = e.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        }),
      );
      // End the crop in a gap between cards (in both lanes), near a 5:4 ratio.
      const aim = y0 + Math.round(w * 1.25);
      let end = null;
      for (let d = 0; d <= 320 && end === null; d++) {
        for (const y of [aim - d, aim + d]) {
          if (cards.every((c) => y <= c.top - 2 || y >= c.bottom + 2)) {
            end = y;
            break;
          }
        }
      }
      if (DEBUG) console.log('  [hero-app] cards', cards.map((c) => `${Math.round(c.top)}-${Math.round(c.bottom)}`).join(' '));
      if (end === null) {
        console.warn('  [hero-app] no card gap near the crop end; cutting at the aim line');
        end = aim;
      }
      const clip = { x: 0, y: y0, width: w, height: end - y0 };
      if (clip.y + clip.height > laneBottom) throw new Error('hero-app crop runs past the lane bottoms');
      await assertNoText(page, 'Drag a target here', clip);
      await take('hero-app', clip);
      await narrow.evaluate((el) => el.remove());
      await page.getByRole('button', { name: 'Expand Sidebar' }).click();
      await settle(page, 1000);
      await setView(VIEW_TRACKER);
    }

    // ---- table with bulk selection ----------------------------------------------------------
    // ~640 CSS px: it renders 1:1 in the 7-of-12 column of the 1120px features grid. The crop ends on a column boundary.
    if (want('table')) {
      console.log('> table');
      await setView({ width: 1300, height: 900 });
      await viewBtn('Table').click();
      await statusPill('Pwned').click();
      await settle(page, 3000);
      const rowBoxes = page.getByRole('checkbox', { name: /^Select (?!all)/ });
      for (let i = 0; i < 3; i++) await rowBoxes.nth(i).check();
      await until(page, page.getByText('3 selected'));
      await untilOpaque(page, page.locator('thead th').first());
      await settle(page, 600);
      const bar = await rectOf(page.getByText('3 selected').first(), { minW: 400, minH: 30, cls: 'rounded' });
      // The real table is 1120px wide and scrolls sideways, so a plain crop always slices the card. Instead lay the whole
      // block (bulk bar + table card) out at 644px: keep Target..Difficulty, hide the right-hand columns and the Delete/Clear
      // buttons, and cut the card after six rows so its right and bottom borders sit inside the crop.
      const ROWS = 6;
      const clip = await page.evaluate(
        ({ W, ROWS }) => {
          const style = document.createElement('style');
          style.textContent = 'thead th:nth-child(n+6),tbody td:nth-child(n+6){display:none!important}';
          document.head.appendChild(style);
          const table = document.querySelector('thead').closest('table');
          table.style.minWidth = '0';
          const scroller = table.parentElement;
          const card = scroller.parentElement;
          const wrap = card.parentElement;
          for (const b of wrap.querySelectorAll('button')) if (/^(Delete|Clear)$/.test(b.textContent.trim())) b.style.display = 'none';
          wrap.style.width = W + 'px';
          const rows = [...table.querySelectorAll('tbody tr')];
          const cut = rows[ROWS - 1].getBoundingClientRect().bottom - scroller.getBoundingClientRect().top;
          scroller.style.maxHeight = Math.ceil(cut) + 'px';
          scroller.style.overflowY = 'hidden';
          const r = wrap.getBoundingClientRect();
          return { x: Math.floor(r.x) - 1, y: Math.floor(r.y) - 1, width: Math.ceil(r.width) + 2, height: Math.ceil(r.height) + 2, cardRight: card.getBoundingClientRect().right };
        },
        { W: 644, ROWS },
      );
      await settle(page, 800);
      // Re-measure after the relayout.
      const after = await page.evaluate(() => {
        const wrap = document.querySelector('thead').closest('table').parentElement.parentElement.parentElement;
        const r = wrap.getBoundingClientRect();
        return { x: Math.floor(r.x) - 1, y: Math.floor(r.y) - 1, width: Math.ceil(r.width) + 2, height: Math.ceil(r.height) + 2 };
      });
      Object.assign(clip, after);
      delete clip.cardRight;
      if (clip.y + clip.height > 900) throw new Error(`table crop does not fit the viewport ${JSON.stringify(clip)}`);
      if (DEBUG) console.log('  table clip', JSON.stringify(clip), 'bar', JSON.stringify(bar));
      await take('table', clip);
      await setView(VIEW_TRACKER);
    }

    // ---- attack graph after Auto layout, zoomed ----------------------------------------------
    // 1120x490 CSS (16:7): the canvas from its top-left corner, with the toolbar fully inside the crop.
    if (want('graph')) {
      console.log('> graph');
      await setView(VIEW_GRAPH);
      // Collapse the sidebar: the zoomed chain needs the full width.
      if ((await page.getByRole('button', { name: 'Collapse Sidebar' }).count()) > 0) {
        await page.getByRole('button', { name: 'Collapse Sidebar' }).click();
        await settle(page, 1500);
      }
      await statusPill('Foothold').click();
      await viewBtn('Attack Graph').click();
      await until(page, page.getByTestId('graph-auto-layout'));
      // The canvas is a fixed 720px tall; the 1600x1200 viewBox only fills a 1120px-wide crop from 840px up.
      await page.addStyleTag({ content: '[class~="h-[720px]"]{height:900px!important}' });
      await settle(page, 800);
      await page.getByTestId('graph-auto-layout').click();
      await settle(page, 1500);
      await page.getByTestId('graph-fit-screen').click();
      await settle(page, 2000);
      // Hide the floating quick-copy chip and close the minimap so the canvas is unobstructed.
      await page.getByRole('button', { name: 'Open Quick Copy Menu' }).evaluate((el) => {
        let n = el;
        while (n.parentElement && getComputedStyle(n).position !== 'fixed') n = n.parentElement;
        n.style.visibility = 'hidden';
      });
      await page.getByTestId('graph-minimap-container').getByRole('button').first().click();
      await settle(page, 600);
      const nodeRect = (id) => rectOfSelector(page, `[data-testid="attack-node-${id}"]`);
      for (let i = 0; i < 10; i++) {
        const r = await nodeRect('htb-included');
        if (r.width >= 150) break;
        await page.getByTestId('graph-zoom-in').click();
        await settle(page, 500);
      }
      const GW = 1120;
      const GH = 490;
      const svgBox = await rectOfSelector(page, '[data-testid="graph-viewport-svg"]');
      const toolbar = await rectOfSelector(page, '[data-testid="canvas-nav-toolbar"]');
      // preserveAspectRatio "meet" on a 1600x1200 viewBox: the drawn area is centred and may leave strips at the sides.
      const drawnW = Math.min(svgBox.width, (svgBox.height * 4) / 3);
      const drawnX = svgBox.x + (svgBox.width - drawnW) / 2;
      if (drawnW < GW) throw new Error(`graph canvas draws ${drawnW} CSS px wide, need ${GW}`);
      const clip = {
        x: Math.floor(drawnX + (drawnW - GW) / 2),
        y: Math.ceil(Math.max(svgBox.y, toolbar.y + toolbar.height) + 8),
        width: GW,
        height: GH,
      };
      if (DEBUG) console.log('  graph', { svgBox, toolbar, drawnW, clip });
      // Pan (drag the empty canvas) so the first three nodes sit in the middle of the crop.
      // Choose the zoom so the four-node chain Included -> Funnel is centred with a 28-100px margin on each side.
      const zoomBtn = (dir) => page.getByTestId(`graph-zoom-${dir}`);
      const chain = async () => union([await nodeRect('htb-included'), await nodeRect('htb-bike'), await nodeRect('htb-unified'), await nodeRect('htb-funnel')]);
      let last = null;
      for (let i = 0; i < 6; i++) {
        const m = (GW - (await chain()).width) / 2;
        if (m < 28) {
          await zoomBtn('out').click();
          await settle(page, 800);
          if (last === 'in') break;
          last = 'out';
        } else if (m > 100) {
          if (last === 'out') break;
          await zoomBtn('in').click();
          await settle(page, 800);
          last = 'in';
        } else break;
      }
      // Frame the pivot chain and the one subnet hub it hangs off: hide the other machines, hubs and the operator rig so no
      // node or edge is cut by the crop. Only display changes; the layout and the real edges are untouched.
      await page.evaluate(() => {
        const KEEP = ['htb-included', 'htb-bike', 'htb-unified', 'htb-funnel'];
        const vp = document.getElementById('canvas-viewport');
        const chainRects = KEEP.map((id) => document.querySelector(`[data-testid="attack-node-${id}"]`).getBoundingClientRect());
        const chainBottom = Math.max(...chainRects.map((r) => r.bottom));
        const hide = (el) => {
          el.style.display = 'none';
        };
        for (const c of [...vp.children]) {
          const tid = c.getAttribute('data-testid') || '';
          if (tid.startsWith('attack-edge-')) continue;
          if (tid.startsWith('attack-node-')) {
            if (!KEEP.includes(tid.slice('attack-node-'.length))) hide(c);
            continue;
          }
          if (c.tagName === 'line') {
            // Spokes from a hub to a machine: keep the ones that end on the chain row.
            if (c.getBoundingClientRect().top > chainBottom + 5) hide(c);
            continue;
          }
          if (c.tagName === 'g' && c.textContent.includes('Web Surface')) {
            for (const l of c.querySelectorAll('line')) if (l.getBoundingClientRect().height > 150) hide(l);
            c.setAttribute('data-keep-hub', '1');
            continue;
          }
          hide(c);
        }
      });
      await settle(page, 600);
      const four = await chain();
      const dx = Math.round(clip.x + (GW - four.width) / 2 - four.x);
      const dy = Math.round(clip.y + 70 - four.y);
      const sx = Math.round(svgBox.x + svgBox.width - 40);
      const sy = Math.round(Math.min(svgBox.y + svgBox.height, VIEW_GRAPH.height) - 40);
      if (DEBUG) console.log('  pan', { dx, dy, sx, sy });
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) {
        await page.mouse.move(sx + (dx * i) / 8, sy + (dy * i) / 8);
        await settle(page, 100);
      }
      await page.mouse.up();
      await settle(page, 1000);
      // Height: 70px above the chain to 50px below the hub label.
      const hub = await page.locator('[data-keep-hub="1"]').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { bottom: r.bottom };
      });
      clip.height = Math.ceil(hub.bottom + 50 - clip.y);
      if (DEBUG) console.log('  graph clip', JSON.stringify(clip), JSON.stringify(await chain()));
      if (clip.x + clip.width > VIEW_GRAPH.width || clip.y + clip.height > VIEW_GRAPH.height) {
        throw new Error(`graph crop outside the viewport ${JSON.stringify(clip)}`);
      }
      if (DEBUG) {
        console.log('  graph children', JSON.stringify(await page.evaluate(() => [...document.getElementById('canvas-viewport').children].map((c) => `${c.tagName}${c.getAttribute('data-testid') ? '#' + c.getAttribute('data-testid') : ''}[${c.querySelectorAll('[data-testid^="attack-node-"]').length}]`))));
        console.log('  graph nodes', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[data-testid^="attack-node-"]')].map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.testid, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }))));
        await page.screenshot({ path: path.join(os.tmpdir(), 'graph-full.png') });
      }
      await take('graph', clip);
      await setView(VIEW_TRACKER);
    }

    // ---- vault: seeded fake credentials, secrets masked --------------------------------------
    if (want('vault')) {
      console.log('> vault');
      await setView(VIEW_TRACKER);
      if ((await page.getByRole('button', { name: 'Expand Sidebar' }).count()) > 0) {
        await page.getByRole('button', { name: 'Expand Sidebar' }).click();
        await settle(page, 1500);
      }
      await viewBtn('Kanban').click();
      await settle(page, 1500);
      await statusPill('All').click();
      await settle(page, 1500);
      await page.getByRole('button', { name: /Evidence & Loot Vault/ }).click();
      await until(page, page.getByRole('button', { name: 'Reveal secret' }));
      await untilOpaque(page, page.getByRole('button', { name: 'Reveal secret' }));
      await settle(page, 1500);
      if ((await page.getByRole('button', { name: 'Mask secret' }).count()) > 0) throw new Error('a secret is revealed in the vault');
      const tiles = await page.evaluate((markers) => {
        const out = {};
        for (const label of ['Passwords', 'Hashes', 'SSH keys']) {
          const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === label);
          const m = el && el.parentElement ? el.parentElement.innerText.match(/\d+/) : null;
          out[label] = m ? Number(m[0]) : 0;
        }
        out.leaked = markers.some((m) => document.body.innerText.includes(m));
        return out;
      }, FAKE_SECRETS);
      if (tiles.leaked) throw new Error('a seeded secret is visible in the vault');
      for (const k of ['Passwords', 'Hashes', 'SSH keys']) if (tiles[k] < 1) throw new Error(`vault tile "${k}" is ${tiles[k]}, expected >= 1`);
      // Machine flags are listed first; narrow the list to the seeded credentials (their notes say "demo data").
      await page.getByPlaceholder(/Search credentials/).fill('demo data');
      await settle(page, 1500);
      for (const user of ['mike', 'svc_backup', 'root', 'admin', 'web_deploy']) {
        if ((await page.getByText(user, { exact: true }).count()) < 1) throw new Error(`seeded credential "${user}" is not listed`);
      }
      if ((await page.getByRole('button', { name: 'Mask secret' }).count()) > 0) throw new Error('a secret is revealed in the vault');
      if (await page.evaluate((m) => m.some((x) => document.body.innerText.includes(x)), FAKE_SECRETS)) throw new Error('a seeded secret is visible');
      // ~450 CSS px: it renders 1:1 in the 5-of-12 column. The full table is 960px wide, so for this shot only the Category,
      // Discovered and Actions columns are hidden and the secret column loses its 320px minimum; every cell shown is the app's own.
      await page.addStyleTag({
        content:
          'table[role="table"]{min-width:0!important;width:450px!important}' +
          'table[role="table"] :is(th,td):is(:nth-child(2),:nth-child(5),:nth-child(6)){display:none!important}' +
          'table[role="table"] th:nth-child(4){min-width:0!important}',
      });
      await settle(page, 1200);
      const head = await rectOf(page.getByRole('columnheader', { name: 'Target' }), { minW: 100, minH: 20 });
      const tableBox = await page.locator('table[role="table"]').first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      const rowBottoms = await page.locator('table[role="table"] tbody tr').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().bottom));
      const width = 450;
      const y = Math.floor(head.y);
      const aim = y + Math.round(width * 0.9);
      const rowEnd = rowBottoms.reduce((a, b) => (Math.abs(b - aim) < Math.abs(a - aim) ? b : a));
      const clip = { x: Math.floor(tableBox.x), y, width: Math.min(width, Math.floor(tableBox.width)), height: Math.ceil(rowEnd - y) + 1 };
      if (clip.width < width) console.warn(`  [vault] the trimmed table is only ${tableBox.width} CSS px wide`);
      if (clip.y + clip.height > VIEW_TRACKER.height) throw new Error(`vault crop does not fit the viewport ${JSON.stringify(clip)}`);
      await take('vault', clip);
    }

    // ---- exam simulator (1024x900) -----------------------------------------------------------
    if (want('exam', 'burn-chart')) {
      console.log('> exam');
      await setView(VIEW_EXAM);
      if ((await page.getByRole('button', { name: 'Expand Sidebar' }).count()) > 0) {
        await page.getByRole('button', { name: 'Expand Sidebar' }).click();
        await settle(page, 1000);
      }
      await page.getByRole('button', { name: /24h Exam Simulator/ }).click();
      const nameField = page.locator('#candidate-name');
      await until(page, nameField);
      await settle(page, 2500);
      // Generic candidate identity (the store default is the project author).
      await nameField.fill('Alex Morgan');
      await page.locator('#candidate-callsign').fill('amorgan');
      await page.locator('#candidate-osid').fill('OS-100000');
      await page.getByRole('button', { name: /Launch OSCP exam clock/ }).click();
      await settle(page, 2500);

      // Boxes: AD set (web01 user, srv01 user, dc root) then 3 standalone (user + root each).
      const userFlags = page.getByRole('button', { name: /^User Flag/ });
      const rootFlags = page.getByRole('button', { name: /^Root Flag/ });
      await advance(page, 35); // 00:35 -> first standalone user flag
      await userFlags.nth(2).click();
      await advance(page, 50); // 01:25 -> first standalone root flag
      await rootFlags.nth(1).click();
      await advance(page, 55); // 02:20 -> second standalone user flag
      await userFlags.nth(3).click();
      await advance(page, 25); // 02:45 -> AD foothold (the set only scores once all three boxes fall)
      await userFlags.nth(0).click();
      await advance(page, 15); // 03:00
      await scrollTop(page);
      await settle(page, 600);
      {
        // Hero pacing card: the chart and its legend only (no card header or border).
        const chart = await rectOfSelector(page, '[data-testid="exam-burndown-chart"]');
        console.log(`  [burn-chart] ${JSON.stringify(chart)}`);
        await take('burn-chart', { x: Math.floor(chart.x), y: Math.floor(chart.y), width: Math.ceil(chart.width), height: Math.ceil(chart.height) });
      }
      // The exam image shows the timer, the track and the targets. The burn-down is already in the hero pacing card,
      // so the pacing row (velocity, target budget and the chart) is hidden for this shot only.
      await page.evaluate(() => {
        const label = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Burn-down to pass');
        let card = label;
        for (; card; card = card.parentElement) {
          const r = card.getBoundingClientRect();
          if (r.width >= 300 && r.height >= 200 && String(card.className).includes('rounded')) break;
        }
        const row = card && card.parentElement;
        if (!row || !row.innerText.includes('Velocity pacing')) throw new Error('pacing row not found');
        row.style.display = 'none';
      });
      await settle(page, 600);
      {
        const heading = await rectOf(page.getByRole('heading', { name: /OffSec OSCP/ }).first(), { minW: 100, minH: 20 });
        const score = await rectOf(page.getByText('Total exam score').first(), { minW: 200, minH: 60, cls: 'rounded' });
        const clock = await rectOf(page.getByText('Countdown clock').first(), { minW: 150, minH: 60, cls: 'rounded' });
        const dc = await rectOf(page.getByText('AD Set: Domain Controller').first(), { minW: 200, minH: 100, cls: 'rounded' });
        const x = Math.floor(score.x - 10);
        const y = Math.floor(heading.y - 12);
        const width = Math.ceil(clock.x + clock.width - score.x) + 20;
        const clip = { x, y, width, height: Math.ceil(dc.y + dc.height) + 8 - y };
        if (clip.y + clip.height > VIEW_EXAM.height) throw new Error(`exam crop does not fit the viewport ${JSON.stringify(clip)}`);
        await take('exam', clip);
      }
    }

    // ---- Encode ------------------------------------------------------------------------------
    console.log('> encoding webp');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const pillow = !FORCE_CANVAS && hasPillow();
    console.log(`  encoder: ${pillow ? 'Pillow (Lanczos, method 6)' : 'canvas toDataURL'}`);
    const codec = pillow ? null : await ctx.newPage(); // blank page used purely as an encoder
    let previous = [];
    try {
      previous = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    } catch {
      previous = [];
    }
    const manifest = [];
    for (const [name, meta] of Object.entries(SHOTS)) {
      if (!results[name]) {
        const kept = previous.find((e) => e.name === name);
        if (kept) manifest.push(kept);
        continue;
      }
      const { png, cssWidth } = results[name];
      const entry = { name, alt: meta.alt, width: 0, height: 0, cssWidth, srcset: [] };
      const variants = pillow ? encodeWithPillow(name, png) : await encodeWithCanvas(codec, name, png);
      for (const v of variants) {
        fs.writeFileSync(path.join(OUT_DIR, v.file), v.data);
        const note = v.quality < Q_MIN ? '  (below quality floor to fit budget)' : '';
        console.log(`  ${v.file}  ${v.width}x${v.height}  q=${v.quality}  ${(v.data.length / 1000).toFixed(1)} KB${note}`);
        const budget = v.budget ?? BUDGET_KB[v.w];
        if (v.data.length > budget * 1000) console.warn(`  !! ${v.file} exceeds ${budget} KB budget`);
        entry.srcset.push({ src: `/images/landing/${v.file}`, w: v.w });
      }
      // Drop widths left over from an earlier capture of this shot.
      for (const f of fs.readdirSync(OUT_DIR)) {
        if (f.startsWith(`${name}-`) && f.endsWith('.webp') && !variants.some((v) => v.file === f)) fs.rmSync(path.join(OUT_DIR, f));
      }
      entry.srcset.sort((a, b) => b.w - a.w);
      // width/height = intrinsic size of the 1600 variant (or the largest one when the crop is smaller).
      const ref = variants.find((v) => v.w === 1600) || variants.reduce((a, b) => (b.w > a.w ? b : a));
      entry.width = ref.width;
      entry.height = ref.height;
      manifest.push(entry);
    }
    fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`> wrote ${path.relative(ROOT, MANIFEST)}`);
  } catch (err) {
    if (DEBUG && globalThis.__page) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true });
      await globalThis.__page.screenshot({ path: path.join(DEBUG_DIR, 'failure.png') }).catch(() => {});
    }
    throw err;
  } finally {
    await browser.close();
    if (server) server.kill(); // only the preview process this script spawned
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
