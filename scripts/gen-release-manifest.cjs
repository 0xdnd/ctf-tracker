#!/usr/bin/env node
// Generates public/release-manifest.json (copied to dist/release-manifest.json on both web and Tauri builds).
// Pure same-origin static JSON (0 KB in the SPA JS bundle): summarizes the latest release highlights from
// CHANGELOG.md plus metadata-only catalog updates (added / active / retired machines per HTB AUP §8.2).
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG_FILE = path.join(ROOT, 'package.json');
const CHANGELOG_FILE = path.join(ROOT, 'CHANGELOG.md');
const ACTIVE_FILE = path.join(ROOT, 'src/data/activeMachines.json');
const CHANGES_FILE = path.join(ROOT, 'src/data/catalogChanges.json');
const OUT_FILE = path.join(ROOT, 'public/release-manifest.json');

function parseChangelogHighlights(markdown) {
  const sections = [];
  const lines = markdown.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    const heading = /^##\s+\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/.exec(line.trim());
    if (heading) {
      if (current) sections.push(current);
      current = { version: heading[1], date: heading[2] || null, bullets: [] };
      continue;
    }
    if (!current) continue;
    const bullet = /^-\s+(.+)$/.exec(line.trim());
    if (bullet) {
      const clean = bullet[1].replace(/\*\*/g, '').replace(/`/g, '').trim();
      if (clean) current.bullets.push(clean);
    }
  }
  if (current) sections.push(current);

  const picked = sections.find((s) => s.bullets.length > 0);
  if (!picked) return { releasedAt: null, highlights: [] };
  return {
    releasedAt: picked.date,
    highlights: picked.bullets.slice(0, 6),
  };
}

function dedupeByName(items, limit = 16) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item || !item.name) continue;
    const key = `${(item.platform || '').toLowerCase()}:${item.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'));
  const changelog = fs.existsSync(CHANGELOG_FILE) ? fs.readFileSync(CHANGELOG_FILE, 'utf8') : '';
  const { releasedAt, highlights } = parseChangelogHighlights(changelog);

  const activeData = fs.existsSync(ACTIVE_FILE)
    ? JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf8'))
    : { asOf: null, machines: [] };
  const changesData = fs.existsSync(CHANGES_FILE)
    ? JSON.parse(fs.readFileSync(CHANGES_FILE, 'utf8'))
    : { updatedAt: null, entries: [] };

  const entries = Array.isArray(changesData.entries) ? changesData.entries : [];
  const added = dedupeByName(entries.flatMap((e) => e.added || []), 20);
  const recentActive = dedupeByName(
    [
      ...entries.flatMap((e) => e.active || []),
      ...(Array.isArray(activeData.machines)
        ? activeData.machines.slice(0, 6).map((m) => ({
            name: m.name,
            platform: 'HTB',
            os: m.os,
            difficulty: m.difficulty,
            releasedAt: m.releasedAt,
          }))
        : []),
    ],
    12,
  );
  const retired = dedupeByName(entries.flatMap((e) => e.retired || []), 20);

  const manifest = {
    version: pkg.version,
    releasedAt: releasedAt || changesData.updatedAt || activeData.asOf || new Date().toISOString().slice(0, 10),
    catalogAsOf: changesData.updatedAt || activeData.asOf || null,
    activePoolCount: Array.isArray(activeData.machines) ? activeData.machines.length : 0,
    highlights,
    machines: {
      added,
      active: recentActive,
      retired,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(
    `✓ Wrote ${path.relative(ROOT, OUT_FILE)} (v${manifest.version}, ${highlights.length} highlights, ${added.length} added / ${recentActive.length} active / ${retired.length} retired)`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { parseChangelogHighlights };
