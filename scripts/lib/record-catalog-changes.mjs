// Records metadata-only catalog sync diffs (added / active / retired) into src/data/catalogChanges.json.
// Maintains rolling MAX_ENTRIES dates so release-manifest.json can highlight recent catalog changes without bloating.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const CATALOG_CHANGES_FILE = resolve(ROOT, 'src/data/catalogChanges.json');
const MAX_ENTRIES = 5;
const MAX_ITEMS_PER_BUCKET = 30;

function normalizeItem(item, defaultPlatform) {
  if (!item) return null;
  if (typeof item === 'string') {
    const name = item.trim();
    return name ? { name, platform: defaultPlatform } : null;
  }
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!name) return null;
  const out = { name, platform: item.platform || defaultPlatform };
  if (item.os) out.os = item.os;
  if (item.difficulty) out.difficulty = item.difficulty;
  if (item.releasedAt) out.releasedAt = item.releasedAt;
  return out;
}

function dedupeItems(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || !item.name) continue;
    const key = `${(item.platform || '').toLowerCase()}:${item.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= MAX_ITEMS_PER_BUCKET) break;
  }
  return out;
}

/**
 * Pure merge helper used by sync-htb-active.mjs, sync-pg.mjs, and sync-vulnhub.mjs.
 */
export function mergeCatalogChanges(existing, patch) {
  const date = patch.date || new Date().toISOString().slice(0, 10);
  const platform = patch.platform || 'HTB';
  const added = (patch.added || []).map((i) => normalizeItem(i, platform)).filter(Boolean);
  const active = (patch.active || []).map((i) => normalizeItem(i, platform)).filter(Boolean);
  const retired = (patch.retired || []).map((i) => normalizeItem(i, platform)).filter(Boolean);
  if (added.length === 0 && active.length === 0 && retired.length === 0) {
    return existing && Array.isArray(existing.entries)
      ? existing
      : { updatedAt: date, entries: [] };
  }

  const prevEntries = Array.isArray(existing?.entries) ? existing.entries.map((e) => ({ ...e })) : [];
  const idx = prevEntries.findIndex((e) => e.date === date);
  if (idx >= 0) {
    const cur = prevEntries[idx];
    prevEntries[idx] = {
      date,
      added: dedupeItems([...added, ...(cur.added || [])]),
      active: dedupeItems([...active, ...(cur.active || [])]),
      retired: dedupeItems([...retired, ...(cur.retired || [])]),
    };
  } else {
    prevEntries.unshift({
      date,
      added: dedupeItems(added),
      active: dedupeItems(active),
      retired: dedupeItems(retired),
    });
  }

  prevEntries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return {
    updatedAt: prevEntries[0]?.date || date,
    entries: prevEntries.slice(0, MAX_ENTRIES),
  };
}

export function recordCatalogChanges(patch, filePath = CATALOG_CHANGES_FILE) {
  const existing = existsSync(filePath)
    ? JSON.parse(readFileSync(filePath, 'utf8'))
    : { updatedAt: '', entries: [] };
  const next = mergeCatalogChanges(existing, patch);
  writeFileSync(filePath, JSON.stringify(next, null, 2) + '\n', 'utf8');
  return next;
}
