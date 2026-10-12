import raw from './activeMachines.json';
import type { Difficulty, Machine, OperatingSystem } from '../types';
import { normalizeMachineSlug } from '../store/machineNormalization';

/** One currently-active HTB machine: public listing metadata only (HTB AUP §8.2). */
export interface ActiveMachineEntry {
  name: string;
  os: OperatingSystem;
  difficulty: Difficulty;
  /** ISO date (YYYY-MM-DD) the machine was released. */
  releasedAt: string;
  season?: string;
}

export interface ActiveMachinesList {
  /** ISO date (YYYY-MM-DD) the list was last checked against the HTB Active tab. */
  asOf: string;
  source: string;
  note?: string;
  machines: ActiveMachineEntry[];
}

/** Single source of truth for which HTB machines are active (see scripts/check-active-machines.mjs). */
export const ACTIVE_MACHINES = raw as ActiveMachinesList;

/**
 * Metadata-only catalog rows for active machines the catalog does not already list (deduped by
 * normalized name). No tags, hint, synopsis, writeup, pdf, flags or skills: HTB AUP §8.2.
 * Ids are `htb-<slug>`, falling back to `htb-active-<slug>[-n]` if that id is already taken.
 */
export function appendActiveMachines(catalog: Machine[], list: ActiveMachinesList = ACTIVE_MACHINES): Machine[] {
  const names = new Set(catalog.map((m) => normalizeMachineSlug(m.name)));
  const ids = new Set(catalog.map((m) => m.id));
  const extra: Machine[] = [];
  for (const e of list.machines) {
    const slug = normalizeMachineSlug(e.name);
    if (!slug || names.has(slug)) continue;
    let id = `htb-${slug}`;
    if (ids.has(id)) id = `htb-active-${slug}`;
    for (let n = 2; ids.has(id); n++) id = `htb-active-${slug}-${n}`;
    names.add(slug);
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
      isActive: true,
      timeSpentSeconds: 0,
      createdAt: `${e.releasedAt}T00:00:00.000Z`,
      updatedAt: `${list.asOf}T00:00:00.000Z`,
    });
  }
  return extra.length ? [...catalog, ...extra] : catalog;
}
