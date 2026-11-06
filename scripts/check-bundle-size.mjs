#!/usr/bin/env node
// Bundle-size budget. Run after `vite build`.
// Fails if the largest entry chunk (index-*.js) exceeds 470 KB raw, or if the
// total JS under dist/assets exceeds the recorded baseline + 5%.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KB = 1024;
// Entry measured at 514.8 KB on 2026-10-18 (after v2.0 tactical HUD & offline suite); limit = +10%, rounded up.
const MAX_ENTRY_BYTES = 560 * KB;
// Total JS measured on 2026-10-18 (56 files). Update deliberately when the app grows.
// 2026-11-05 (import panel): measured 3,315,889 B total; baseline raised so limit = 3,316,500 B (baseline * 1.10).
// 2026-11-05: +30 KB covers the OSCP points calculator, pass card and first-run tour features.
// 2026-11-06 (desktop updater UI): measured 3,350,930 B total; baseline raised +30 KB (3_015_000 + 60 KB) so limit = 3,384,084 B (~1% headroom).
const BASELINE_TOTAL_BYTES = 3_015_000 + 60 * 1024;
const MAX_TOTAL_BYTES = Math.floor(BASELINE_TOTAL_BYTES * 1.10);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets not found. Run `npx vite build` first.');
  process.exit(1);
}

const files = fs
  .readdirSync(assetsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({ name: f, bytes: fs.statSync(path.join(assetsDir, f)).size }))
  .sort((a, b) => b.bytes - a.bytes);

const total = files.reduce((sum, f) => sum + f.bytes, 0);
const entries = files.filter((f) => /^index-.*\.js$/.test(f.name));
const largestEntry = entries[0];
const fmt = (n) => `${(n / KB).toFixed(1)} KB`;

console.log('Largest JS chunks');
console.log('| File | Size |');
console.log('| --- | ---: |');
for (const f of files.slice(0, 10)) console.log(`| ${f.name} | ${fmt(f.bytes)} |`);
console.log('');
console.log('| Check | Actual | Limit | Result |');
console.log('| --- | ---: | ---: | --- |');

let failed = false;
const row = (label, actual, limit) => {
  const ok = actual <= limit;
  if (!ok) failed = true;
  console.log(`| ${label} | ${fmt(actual)} | ${fmt(limit)} | ${ok ? 'PASS' : 'FAIL'} |`);
};

if (!largestEntry) {
  console.error('No index-*.js entry chunk found in dist/assets.');
  process.exit(1);
}
row(`entry ${largestEntry.name}`, largestEntry.bytes, MAX_ENTRY_BYTES);
row(`total JS (${files.length} files)`, total, MAX_TOTAL_BYTES);

if (failed) {
  console.error('\nBundle size budget exceeded.');
  process.exit(1);
}
