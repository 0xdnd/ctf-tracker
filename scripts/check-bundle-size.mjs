#!/usr/bin/env node
// Bundle-size budget. Run after `vite build`.
// Fails if the largest entry chunk (index-*.js) exceeds 470 KB raw, or if the
// total JS under dist/assets exceeds the recorded baseline + 5%.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KB = 1024;
// Entry measured at 425.8 KB on 2026-10-11 (after lazy-loading overlays/views); limit = +10%, rounded up to 10 KB.
const MAX_ENTRY_BYTES = 470 * KB;
// Total JS measured on 2026-10-11 (58 files). Update deliberately when the app grows.
// re-baselined 2026-10-13: +141 catalog rows (lazy catalog-data) and notes IP templating
// (CI total 2834.3 KB; exact bytes unknown, so rounded up to 2_902_400).
const BASELINE_TOTAL_BYTES = 2_902_400;
const MAX_TOTAL_BYTES = Math.floor(BASELINE_TOTAL_BYTES * 1.05);

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
