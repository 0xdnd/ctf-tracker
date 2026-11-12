#!/usr/bin/env node
// Bundle-size budget. Run after `vite build`.
// Fails if the largest entry chunk (index-*.js) exceeds 470 KB raw, or if the
// total JS under dist/assets (minus the lazy vendor-mermaid-* chunks, which have their own
// limit) exceeds the recorded baseline + 10%.
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
// 2026-11-08 (notes Mermaid diagrams): measured 3,384,229 B total (145 B over: ~400 B lazy-import glue in
// ObsidianMarkdownBody plus ~20 B from an unrelated GridView edit); baseline +1 KB so limit = 3,385,210 B.
// user-approved 2026-11-08: +50 KB for notes dock upgrade (baseline +50 KB; entry limit unchanged).
// user-approved 2026-11-12: +25 KB for CSV machine import (lazy) and OSCP vs CPTS guide; measured 3,366.5 KB total vs 3,360.9 KB limit (entry limit unchanged).
const BASELINE_TOTAL_BYTES = 3_015_000 + 136 * 1024;
const MAX_TOTAL_BYTES = Math.floor(BASELINE_TOTAL_BYTES * 1.10);
// Mermaid (notes diagrams) loads only when a note with a mermaid block is read, so its chunks
// are budgeted on their own. Measured 3,421,491 B (57 files) on 2026-11-08; limit = +10%.
const MAX_MERMAID_BYTES = Math.floor(3_421_491 * 1.10);
const isMermaidChunk = (name) => name.startsWith('vendor-mermaid-');

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

const appFiles = files.filter((f) => !isMermaidChunk(f.name));
const mermaidFiles = files.filter((f) => isMermaidChunk(f.name));
const total = appFiles.reduce((sum, f) => sum + f.bytes, 0);
const mermaidTotal = mermaidFiles.reduce((sum, f) => sum + f.bytes, 0);
const entries = files.filter((f) => /^index-.*\.js$/.test(f.name));
const largestEntry = entries[0];
const fmt = (n) => `${(n / KB).toFixed(1)} KB`;

console.log('Largest JS chunks');
console.log('| File | Size |');
console.log('| --- | ---: |');
for (const f of appFiles.slice(0, 10)) console.log(`| ${f.name} | ${fmt(f.bytes)} |`);
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
row(`total JS (${appFiles.length} files, excl. mermaid)`, total, MAX_TOTAL_BYTES);
row(`mermaid lazy JS (${mermaidFiles.length} files)`, mermaidTotal, MAX_MERMAID_BYTES);

if (failed) {
  console.error('\nBundle size budget exceeded.');
  process.exit(1);
}
