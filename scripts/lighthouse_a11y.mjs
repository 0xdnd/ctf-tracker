/**
 * Lighthouse accessibility / best-practices / performance audit for ZeroBox.
 *
 * Expects a production preview server (does NOT build or start one):
 *   npm run build && npx vite preview --port 4173 --strictPort
 *   npm run lighthouse:a11y
 *
 * Zero egress: only http://localhost is requested. Chrome is resolved from CHROME_PATH,
 * a system Chrome, or Playwright's bundled Chromium. Theme + onboarding flag are seeded
 * into localStorage before Lighthouse navigates (storage reset is disabled).
 *
 * Env: LH_BASE_URL (default http://localhost:4173), LH_ROUTES (comma list of route names),
 *      LH_MIN_A11Y (default 95). Reports: reports/lighthouse/*.json. Exit 1 if any a11y < min.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'reports', 'lighthouse');
const BASE = (process.env.LH_BASE_URL || 'http://localhost:4173').replace(/\/$/, '');
const MIN_A11Y = Number(process.env.LH_MIN_A11Y || 95);

const ROUTES = {
  tracker: '/tracker',
  'target-detail': '/target/thm-rootme',
  methodology: '/methodology',
  cheatsheet: '/cheatsheet',
  'field-manual': '/field-manual',
  writeup: '/writeup',
  analytics: '/analytics',
  exam: '/exam',
  vault: '/vault',
};
const MODES = ['dark', 'light'];

async function resolveChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  try {
    const found = chromeLauncher.Launcher.getInstallations();
    if (found.length) return found[0];
  } catch { /* fall through to Playwright */ }
  try {
    const { chromium } = await import('playwright');
    const p = chromium.executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch { /* none */ }
  throw new Error('No Chrome found. Set CHROME_PATH or run `npx playwright install chromium`.');
}

async function ensureServer() {
  try {
    const res = await fetch(BASE + '/');
    if (!res.ok) throw new Error(String(res.status));
  } catch (e) {
    console.error(`[lighthouse] No preview server at ${BASE} (${e.message}).`);
    console.error('  Run: npm run build && npx vite preview --port 4173 --strictPort');
    process.exit(2);
  }
}

const pct = (c) => (c && c.score != null ? Math.round(c.score * 100) : -1);

async function main() {
  await ensureServer();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.env.LH_ROUTES ? process.env.LH_ROUTES.split(',').map((s) => s.trim()) : null;
  const chromePath = await resolveChromePath();
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: [
      '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
      '--disable-component-update', '--disable-background-networking', '--disable-sync',
      '--disable-default-apps', '--metrics-recording-only', '--mute-audio',
    ],
  });
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}`, defaultViewport: null });
  const rows = [];
  try {
    for (const [name, route] of Object.entries(ROUTES)) {
      if (only && !only.includes(name)) continue;
      for (const mode of MODES) {
        const page = await browser.newPage();
        try {
          // Seed storage on the app origin, then let Lighthouse navigate without resetting it.
          await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
          await page.evaluate((m) => {
            localStorage.setItem('zerobox_onboarding_completed', 'true');
            localStorage.setItem('zerobox-theme-mode', m);
          }, mode);
          const url = `${BASE}/#${route}`;
          const result = await lighthouse(url, {
            output: 'json',
            logLevel: 'error',
            onlyCategories: ['accessibility', 'best-practices', 'performance'],
            disableStorageReset: true,
            throttlingMethod: 'provided',
            skipAudits: ['canonical', 'robots-txt'],
          }, desktopConfig, page);
          const lhr = result.lhr;
          const cats = lhr.categories;
          const failing = (id) => Object.values(lhr.audits)
            .filter((a) => cats[id].auditRefs.some((r) => r.id === a.id && r.weight > 0) && a.score != null && a.score < 1)
            .map((a) => a.id);
          fs.writeFileSync(path.join(OUT_DIR, `${name}-${mode}.json`), JSON.stringify(lhr, null, 2));
          rows.push({
            route: name, mode,
            a11y: pct(cats.accessibility), bp: pct(cats['best-practices']), perf: pct(cats.performance),
            failA11y: failing('accessibility'), failBP: failing('best-practices'),
          });
        } catch (e) {
          rows.push({ route: name, mode, a11y: -1, bp: -1, perf: -1, failA11y: [], failBP: [], error: e.message });
        } finally {
          await page.close().catch(() => {});
        }
      }
    }
  } finally {
    await browser.disconnect().catch(() => {});
    try { await chrome.kill(); } catch { /* temp-dir cleanup can EPERM on Windows */ }
  }

  console.log(`\n${'route'.padEnd(15)}${'mode'.padEnd(7)}${'a11y'.padStart(5)}${'best-pr'.padStart(9)}${'perf'.padStart(6)}  failing audits`);
  for (const r of rows) {
    const fails = [...r.failA11y.map((x) => `a11y:${x}`), ...r.failBP.map((x) => `bp:${x}`)].join(' ');
    console.log(`${r.route.padEnd(15)}${r.mode.padEnd(7)}${String(r.a11y).padStart(5)}${String(r.bp).padStart(9)}${String(r.perf).padStart(6)}  ${r.error ? 'ERROR ' + r.error : fails}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(rows, null, 2));
  const bad = rows.filter((r) => r.a11y < MIN_A11Y);
  console.log(bad.length ? `\nFAIL: ${bad.length} run(s) with accessibility < ${MIN_A11Y}` : `\nPASS: all accessibility scores >= ${MIN_A11Y}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
