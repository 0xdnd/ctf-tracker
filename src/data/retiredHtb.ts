import raw from './retiredHtb.json';
import type { Difficulty, Machine, OperatingSystem } from '../types';

/** One HTB machine auto-archived on retirement: public listing metadata only (HTB AUP §8.2). */
export interface RetiredHtbEntry {
  name: string;
  os: OperatingSystem;
  difficulty: Difficulty;
  /** ISO date (YYYY-MM-DD) the machine was released. */
  releasedAt: string;
  /** ISO date (YYYY-MM-DD) the machine was archived as retired. */
  retiredAt: string;
}

export interface RetiredHtbList {
  asOf: string;
  source: string;
  machines: RetiredHtbEntry[];
}

export const RETIRED_HTB = raw as RetiredHtbList;

/** "Active (2018 Retired)" -> "active": strips trailing parenthetical, then letters and digits only. */
export const htbBaseNameSlug = (name: string): string =>
  name.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Appends metadata-only retired HTB rows from retiredHtb.json onto the base catalog,
 * deduped by normalized HTB base name and with collision-safe ids (`htb-<slug>` -> `htb-retired-<slug>[-n]`).
 */
export function appendRetiredHtbMachines(catalog: Machine[], list: RetiredHtbList = RETIRED_HTB): Machine[] {
  if (!list.machines.length) return catalog;
  const htbBaseNames = new Set(catalog.filter((m) => m.platform === 'HTB').map((m) => htbBaseNameSlug(m.name)));
  const ids = new Set(catalog.map((m) => m.id));
  const extra: Machine[] = [];

  for (const e of list.machines) {
    const slug = htbBaseNameSlug(e.name);
    if (!slug || htbBaseNames.has(slug)) continue;
    let id = `htb-${slug}`;
    if (ids.has(id)) id = `htb-retired-${slug}`;
    for (let n = 2; ids.has(id); n++) id = `htb-retired-${slug}-${n}`;
    htbBaseNames.add(slug);
    ids.add(id);
    extra.push({
      id,
      name: e.name,
      ip: '10.10.10.x',
      os: e.os,
      platform: 'HTB',
      difficulty: e.difficulty,
      status: 'backlog',
      tags: [],
      certifications: [],
      roomUrl: `https://app.hackthebox.com/machines/${e.name}`,
      isActive: false,
      timeSpentSeconds: 0,
      createdAt: `${e.releasedAt}T00:00:00.000Z`,
      updatedAt: `${e.retiredAt}T00:00:00.000Z`,
    });
  }

  return extra.length ? [...catalog, ...extra] : catalog;
}
