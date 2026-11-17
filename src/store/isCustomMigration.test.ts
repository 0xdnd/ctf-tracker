import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mergeMachinesWithCatalog,
  toLeanMachines,
  CUSTOM_MACHINES_STORAGE_KEY,
  getCustomMachinesStorageKey,
} from './useCtfStore';
import { hasUserProgress, isGenuineCustom } from './machineNormalization';
import { STARTER_MACHINES } from '../data/starterMachines';
import { INITIAL_MACHINES } from '../data/machinesCatalog';
import pgSource from '../data/catalogSources/pg.json';
import { expandPgRows } from '../data/loadMachinesCatalog';
import type { Machine, PgRow } from '../types';

const PERSIST_KEY = 'zerobox-tactical-store';
// In the full catalog (with official synopsis + pdf) but NOT in STARTER_MACHINES.
const NON_STARTER_ID = 'htb-blackfield';

const catalogRow = (id: string): Machine => {
  const row = INITIAL_MACHINES.find((m) => m.id === id);
  if (!row) throw new Error(`fixture ${id} missing from catalog`);
  return row;
};

/** A catalog machine as an old build persisted it: progress + `isCustom: true` + full heavy catalog payload. */
const stamped = (id: string, extra: Partial<Machine> = {}): Machine => ({
  ...catalogRow(id),
  isCustom: true,
  status: 'foothold',
  userFlag: 'HTB{user_flag_proof}',
  rootFlag: '',
  quickNotes: 'kerberoast svc_backup, then DCSync',
  timeSpentSeconds: 1800,
  userPwnedAt: '2026-01-02T00:00:00.000Z',
  ...extra,
});

const box = (over: Partial<Machine>): Machine =>
  ({
    id: 'x',
    name: 'X',
    ip: '10.10.x.x',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'backlog',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...over,
  }) as Machine;

const HEAVY = ['officialSynopsis', 'officialPdf', 'officialWalkthrough'] as const;

beforeEach(() => {
  localStorage.clear();
});

describe('machine normalization predicates', () => {
  it('isGenuineCustom ignores the untrustworthy isCustom flag', () => {
    expect(isGenuineCustom(box({ id: 'custom-1-x' }))).toBe(true);
    expect(isGenuineCustom(box({ platform: 'Custom' as Machine['platform'] }))).toBe(true);
    expect(isGenuineCustom(box({ id: 'htb-lame', isCustom: true }))).toBe(false);
  });

  it('hasUserProgress counts flags, notes, time, status and operator-only recon data', () => {
    expect(hasUserProgress(box({}))).toBe(false);
    expect(hasUserProgress(box({ status: 'recon' }))).toBe(true);
    expect(hasUserProgress(box({ userFlag: 'x' }))).toBe(true);
    expect(hasUserProgress(box({ quickNotes: '  ' }))).toBe(false);
    expect(hasUserProgress(box({ writeupMarkdown: '# notes' }))).toBe(true);
    expect(hasUserProgress(box({ timeSpentSeconds: 5 }))).toBe(true);
    expect(hasUserProgress(box({ openPorts: [22] }))).toBe(true);
    expect(hasUserProgress(box({ scanSummary: 'nmap' }))).toBe(true);
    expect(hasUserProgress(box({ checklist: { openPorts: [], activeItemId: null, itemsState: {} } }))).toBe(false);
  });
});

describe('(1) stamped catalog machine loses the flag and keeps its progress', () => {
  it.each([false, true])('userSolvesReset=%s', (userSolvesReset) => {
    const merged = mergeMachinesWithCatalog([stamped(NON_STARTER_ID)], userSolvesReset, INITIAL_MACHINES);
    const row = merged.find((m) => m.id === NON_STARTER_ID)!;
    expect(row.isCustom).toBeFalsy();
    expect(row.status).toBe('foothold');
    expect(row.userFlag).toBe('HTB{user_flag_proof}');
    expect(row.quickNotes).toBe('kerberoast svc_backup, then DCSync');
    expect(row.timeSpentSeconds).toBe(1800);
    expect(row.officialSynopsis).toBe(catalogRow(NON_STARTER_ID).officialSynopsis);
    // Exactly one row for the id: no duplicate custom copy alongside the catalog entry.
    expect(merged.filter((m) => m.id === NON_STARTER_ID)).toHaveLength(1);

    const lean = toLeanMachines(merged).find((m) => m.id === NON_STARTER_ID)!;
    for (const k of HEAVY) expect(k in lean).toBe(false);
    expect(lean.userFlag).toBe('HTB{user_flag_proof}');
  });

  it('a legacy alias id (lame-box) is an identity match and is unstamped too', () => {
    const merged = mergeMachinesWithCatalog(
      [stamped('htb-lame', { id: 'lame-box' })],
      false,
      INITIAL_MACHINES
    );
    const row = merged.find((m) => m.status === 'foothold' && m.name === 'Lame')!;
    expect(row).toBeDefined();
    expect(row.isCustom).toBeFalsy();
  });
});

describe('(2) a custom- machine named like a catalog box stays custom', () => {
  it('custom "Lame" is not merged into htb-lame, and both keep their own progress', () => {
    const customLame = box({
      id: 'custom-1700000000000-lame',
      name: 'Lame',
      platform: 'HTB',
      isCustom: true,
      hint: 'my own lab clone',
      quickNotes: 'custom notes',
    });
    const realLame = stamped('htb-lame', { isCustom: undefined, quickNotes: 'catalog notes' });
    const merged = mergeMachinesWithCatalog([customLame, realLame], false, INITIAL_MACHINES);

    const custom = merged.find((m) => m.id === customLame.id)!;
    expect(custom).toBeDefined();
    expect(custom.isCustom).toBe(true);
    expect(custom.hint).toBe('my own lab clone');
    expect(custom.officialSynopsis).toBeUndefined();

    const lame = merged.find((m) => m.id === 'htb-lame')!;
    expect(lame.quickNotes).toBe('catalog notes');
    expect(lame.isCustom).toBeFalsy();
    expect(merged[0].id).toBe(customLame.id);
  });

  it('also holds while only STARTER_MACHINES is loaded (htb-lame is a starter)', () => {
    const customLame = box({ id: 'custom-1-lame', name: 'lame', isCustom: true });
    const merged = mergeMachinesWithCatalog([customLame], false, STARTER_MACHINES);
    expect(merged.find((m) => m.id === customLame.id)?.isCustom).toBe(true);
    expect(merged.find((m) => m.id === 'htb-lame')?.quickNotes).toBeFalsy();
  });
});

describe('(3) genuine and legacy customs are kept', () => {
  it("keeps platform 'Custom' rows and legacy isCustom rows with an unknown id and no progress", () => {
    const scanHost = box({ id: 'scan-host-10-0-0-5', name: '10.0.0.5', platform: 'Custom' as Machine['platform'] });
    const legacy = box({ id: 'my-old-lab-box', name: 'Old Lab', isCustom: true });
    for (const catalog of [STARTER_MACHINES, INITIAL_MACHINES]) {
      const once = mergeMachinesWithCatalog([scanHost, legacy], false, catalog);
      expect(once.find((m) => m.id === scanHost.id)).toBeDefined();
      expect(once.find((m) => m.id === legacy.id)?.isCustom).toBe(true);
      // ...and they survive a persist round trip
      const twice = mergeMachinesWithCatalog(toLeanMachines(once), false, catalog);
      expect(twice.find((m) => m.id === scanHost.id)).toBeDefined();
      expect(twice.find((m) => m.id === legacy.id)?.isCustom).toBe(true);
    }
  });

  it('still drops idle unknown non-custom rows (existing behavior)', () => {
    const idle = box({ id: 'htb-zz-idle', name: 'ZZ Idle' });
    expect(mergeMachinesWithCatalog([idle], false, STARTER_MACHINES).some((m) => m.id === idle.id)).toBe(false);
  });

  it('keeps an idle-status catalog row that only carries scan data while the catalog is not loaded', () => {
    const scanned = { ...catalogRow(NON_STARTER_ID), status: 'backlog' as const, openPorts: [53, 88], scanSummary: 'DC' };
    const boot = mergeMachinesWithCatalog([toLeanMachines([scanned])[0]], false, STARTER_MACHINES);
    expect(boot.find((m) => m.id === NON_STARTER_ID)?.openPorts).toEqual([53, 88]);
    const full = mergeMachinesWithCatalog(toLeanMachines(boot), false, INITIAL_MACHINES);
    expect(full.find((m) => m.id === NON_STARTER_ID)?.scanSummary).toBe('DC');
  });
});

describe('(4) STARTER-only merge never stamps; full catalog rehydrates', () => {
  it.each([false, true])('userSolvesReset=%s', (userSolvesReset) => {
    const progress = toLeanMachines([stamped(NON_STARTER_ID, { isCustom: undefined })]);
    const boot = mergeMachinesWithCatalog(progress, userSolvesReset, STARTER_MACHINES);
    expect(boot.some((m) => m.isCustom)).toBe(false);
    const bootRow = boot.find((m) => m.id === NON_STARTER_ID)!;
    expect(bootRow.userFlag).toBe('HTB{user_flag_proof}');
    expect(bootRow.officialSynopsis).toBeUndefined();

    const full = mergeMachinesWithCatalog(toLeanMachines(boot), userSolvesReset, INITIAL_MACHINES);
    const row = full.find((m) => m.id === NON_STARTER_ID)!;
    expect(row.isCustom).toBeFalsy();
    expect(row.officialSynopsis).toBe(catalogRow(NON_STARTER_ID).officialSynopsis);
    expect(row.officialPdf).toBe(catalogRow(NON_STARTER_ID).officialPdf);
    expect(row.userFlag).toBe('HTB{user_flag_proof}');
  });

  it('a stamped non-starter row survives the STARTER-only window untouched, then normalizes', () => {
    const boot = mergeMachinesWithCatalog([stamped(NON_STARTER_ID)], false, STARTER_MACHINES);
    expect(boot.find((m) => m.id === NON_STARTER_ID)?.isCustom).toBe(true);
    const full = mergeMachinesWithCatalog(toLeanMachines(boot), false, INITIAL_MACHINES);
    expect(full.find((m) => m.id === NON_STARTER_ID)?.isCustom).toBeFalsy();
    expect(full.find((m) => m.id === NON_STARTER_ID)?.userFlag).toBe('HTB{user_flag_proof}');
  });
});

describe('(5) merge ∘ lean ∘ merge is a fixed point', () => {
  it.each([false, true])('userSolvesReset=%s', (userSolvesReset) => {
    const input: Machine[] = [
      stamped(NON_STARTER_ID),
      stamped('htb-lame'),
      box({ id: 'custom-1-corp', name: 'Corp DC', platform: 'Custom' as Machine['platform'], isCustom: true }),
      box({ id: 'legacy-x', name: 'Legacy X', isCustom: true }),
    ];
    for (const catalog of [STARTER_MACHINES, INITIAL_MACHINES]) {
      const y1 = mergeMachinesWithCatalog(input, userSolvesReset, catalog);
      const y2 = mergeMachinesWithCatalog(toLeanMachines(y1), userSolvesReset, catalog);
      const y3 = mergeMachinesWithCatalog(toLeanMachines(y2), userSolvesReset, catalog);
      // merge∘lean is idempotent over the whole collection...
      expect(y3).toEqual(y2);
      // ...and every row the operator stored is already at its fixed point after the first merge
      // (never-stored catalog rows legitimately gain default checklist/openPorts on their first stored merge).
      for (const m of input) {
        const id = y1.find((r) => r.id === m.id || r.name === m.name)?.id;
        expect(id).toBeDefined();
        // Heavy official fields are catalog-owned: a stale copy the old build stored is dropped by lean and only
        // comes back from the catalog, so compare everything the operator owns.
        const userOwned = (r?: Machine) => {
          const rest: Record<string, unknown> = { ...(r ?? {}) };
          for (const key of ['officialSynopsis', 'officialPdf', 'officialWalkthrough']) delete rest[key];
          return rest;
        };
        expect(userOwned(y2.find((r) => r.id === id))).toEqual(userOwned(y1.find((r) => r.id === id)));
        if (catalog === INITIAL_MACHINES) {
          expect(y2.find((r) => r.id === id)).toEqual(y1.find((r) => r.id === id));
        }
      }
    }
  });
});

describe('(8) importBackup of an old 2.0.0 file', () => {
  const backup = () =>
    JSON.stringify({
      version: '2.0.0',
      exportedAt: '2026-01-01T00:00:00.000Z',
      machines: [
        stamped(NON_STARTER_ID),
        stamped('htb-lame'),
        box({ id: 'custom-1-corp', name: 'Corp DC', isCustom: true, quickNotes: 'mine' }),
      ],
      userSolvesReset: false,
    });

  const check = (machines: Machine[]) => {
    const bf = machines.find((m) => m.id === NON_STARTER_ID)!;
    expect(bf.isCustom).toBeFalsy();
    expect(bf.userFlag).toBe('HTB{user_flag_proof}');
    expect(bf.officialSynopsis).toBe(catalogRow(NON_STARTER_ID).officialSynopsis);
    expect(machines.find((m) => m.id === 'htb-lame')?.isCustom).toBeFalsy();
    expect(machines.find((m) => m.id === 'custom-1-corp')?.isCustom).toBe(true);
  };

  it('before the catalog has loaded (normalizes fully once it loads)', async () => {
    vi.resetModules();
    const { useCtfStore } = await import('./useCtfStore');
    expect(useCtfStore.getState().isCatalogLoaded).toBe(false);
    expect(useCtfStore.getState().importBackup(backup())).toBe(true);
    const pre = useCtfStore.getState().machines;
    expect(pre.find((m) => m.id === 'htb-lame')?.isCustom).toBeFalsy();
    // not in STARTER yet: kept exactly as stored, progress intact
    expect(pre.find((m) => m.id === NON_STARTER_ID)?.userFlag).toBe('HTB{user_flag_proof}');
    await useCtfStore.getState().loadCatalog();
    check(useCtfStore.getState().machines);
  });

  it('after the catalog has loaded', async () => {
    vi.resetModules();
    const { useCtfStore } = await import('./useCtfStore');
    await useCtfStore.getState().loadCatalog();
    expect(useCtfStore.getState().importBackup(backup())).toBe(true);
    check(useCtfStore.getState().machines);
  });
});

describe('(4b) loadCatalog rewrites the isolated custom keys once', () => {
  it('drops stale stamped catalog copies but keeps genuine customs byte-identical', async () => {
    const genuine = box({ id: 'custom-1-corp', name: 'Corp DC', isCustom: true, quickNotes: 'mine' });
    const customKey = getCustomMachinesStorageKey('guest');
    const stored = JSON.stringify([genuine, stamped(NON_STARTER_ID)]);
    localStorage.setItem(customKey, stored);
    localStorage.setItem(CUSTOM_MACHINES_STORAGE_KEY, stored);
    localStorage.setItem(
      'zerobox_operator_profile_guest',
      JSON.stringify({ machines: [genuine, stamped(NON_STARTER_ID)], userSolvesReset: false })
    );
    vi.resetModules();
    const { useCtfStore } = await import('./useCtfStore');
    await useCtfStore.getState().loadCatalog();

    for (const key of [customKey, CUSTOM_MACHINES_STORAGE_KEY]) {
      const after = JSON.parse(localStorage.getItem(key)!);
      expect(after).toEqual([JSON.parse(JSON.stringify(genuine))]);
    }
    // the progress moved nowhere: it is in the profile key, unstamped and lean
    const profile = JSON.parse(localStorage.getItem('zerobox_operator_profile_guest')!);
    const row = profile.machines.find((m: Machine) => m.id === NON_STARTER_ID);
    expect(row.userFlag).toBe('HTB{user_flag_proof}');
    expect(row.isCustom).toBeFalsy();
    expect(row.officialSynopsis).toBeUndefined();
  });
});

describe('(4c) the prune never deletes a copy whose replacement did not reach disk', () => {
  it('keeps the isolated custom rows when the profile write hits the storage quota', async () => {
    const genuine = box({ id: 'custom-1-corp', name: 'Corp DC', isCustom: true });
    const customKey = getCustomMachinesStorageKey('guest');
    // The stamped row exists ONLY in the isolated custom keys (profile copy lost earlier).
    const stored = JSON.stringify([genuine, stamped(NON_STARTER_ID)]);
    localStorage.setItem(customKey, stored);
    localStorage.setItem(CUSTOM_MACHINES_STORAGE_KEY, stored);
    localStorage.setItem('zerobox_operator_profile_guest', JSON.stringify({ machines: [genuine], userSolvesReset: false }));
    const profileBefore = localStorage.getItem('zerobox_operator_profile_guest');

    vi.resetModules();
    const { useCtfStore } = await import('./useCtfStore');
    expect(useCtfStore.getState().machines.find((m) => m.id === NON_STARTER_ID)?.userFlag).toBe('HTB{user_flag_proof}');

    const realSetItem = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k.startsWith('zerobox_operator_profile_') || k.startsWith('specter_ctf_profile_')) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      return realSetItem.call(this, k, v);
    });
    try {
      await useCtfStore.getState().loadCatalog();
    } finally {
      spy.mockRestore();
    }

    expect(localStorage.getItem('zerobox_operator_profile_guest')).toBe(profileBefore);
    expect(localStorage.getItem(customKey)).toBe(stored);
    expect(localStorage.getItem(CUSTOM_MACHINES_STORAGE_KEY)).toBe(stored);
  });
});

describe('(9) cross-tab storage event carrying a stamped payload', () => {
  it('is normalized on receipt', async () => {
    vi.resetModules();
    const { useCtfStore } = await import('./useCtfStore');
    const payload = JSON.stringify({ state: { machines: [stamped('htb-lame')], userSolvesReset: false }, version: 2 });
    window.dispatchEvent(new StorageEvent('storage', { key: PERSIST_KEY, newValue: payload }));
    const lame = useCtfStore.getState().machines.find((m) => m.id === 'htb-lame')!;
    expect(lame.isCustom).toBeFalsy();
    expect(lame.userFlag).toBe('HTB{user_flag_proof}');
    expect(lame.status).toBe('foothold');
  });
});

describe('(10) active/seasonal sanitization still applies to unstamped rows', () => {
  it('a stamped seasonal machine is unstamped and still stripped of spoilers', () => {
    const catalog = [box({ id: 'htb-scaffold', name: 'Scaffold', hint: 'spoiler' })];
    const merged = mergeMachinesWithCatalog(
      [box({ id: 'htb-scaffold', name: 'Scaffold', isCustom: true, userFlag: 'HTB{x}', quickNotes: 'spoiler notes' })],
      false,
      catalog
    );
    expect(merged[0].isCustom).toBeFalsy();
    expect(merged[0].isActive).toBe(true);
    expect(merged[0].userFlag).toBe('');
    expect(merged[0].quickNotes).toBe('');
    expect(merged[0].hint).toBe('');
  });

  it('a retired catalog machine loses isActive and preserves its notes and hints', () => {
    // A machine that was previously active (e.g. devhub), but is now retired in catalog
    const catalog = [box({ id: 'htb-devhub', name: 'DevHub', hint: 'useful hint', isActive: false })];
    const merged = mergeMachinesWithCatalog(
      [box({ id: 'htb-devhub', name: 'DevHub', isActive: true, quickNotes: 'operator notes', hint: 'useful hint' })],
      false,
      catalog
    );
    expect(merged[0].isActive).toBe(false);
    expect(merged[0].quickNotes).toBe('operator notes');
    expect(merged[0].hint).toBe('useful hint');
  });

  it('a real machine matched by name or slug loses isCustom: true and is not treated as custom', () => {
    const catalog = [box({ id: 'htb-lame', name: 'Lame', platform: 'HTB' })];
    // Legacy stored machine had a mismatched id or slug match with isCustom: true
    const merged = mergeMachinesWithCatalog(
      [box({ id: 'legacy-lame-slug', name: 'Lame', platform: 'HTB', isCustom: true, quickNotes: 'notes' })],
      false,
      catalog
    );
    const row = merged.find((m) => m.name === 'Lame');
    expect(row).toBeDefined();
    expect(row?.isCustom).toBeFalsy();
  });
});

describe('(11) catalog-owned descriptive fields on id/alias matches', () => {
  // PG rows live in a lazily loaded source, so build the same full catalog the app merges against.
  const PG_ROWS = expandPgRows(pgSource as unknown as PgRow[]);
  const FULL_CATALOG = [...INITIAL_MACHINES, ...PG_ROWS];
  const catalogRow = (id: string): Machine => {
    const row = FULL_CATALOG.find((m) => m.id === id);
    if (!row) throw new Error(`fixture ${id} missing from catalog`);
    return row;
  };
  const PG_ID = 'pg-glasgow-smile-1-1';

  it.each([false, true])('refreshes name and difficulty, keeps progress and extra tags (userSolvesReset=%s)', (userSolvesReset) => {
    const cat = catalogRow(PG_ID);
    const stale = {
      ...cat,
      name: 'Glasgow Smile 1.1',
      difficulty: cat.difficulty === 'Easy' ? 'Hard' : 'Easy',
      status: 'completed' as const,
      userFlag: 'user_flag_proof',
      rootFlag: 'root_flag_proof',
      quickNotes: 'my notes',
      timeSpentSeconds: 4321,
      tags: [...(cat.tags || []), 'mine'],
    } as Machine;
    expect(stale.name).not.toBe(cat.name);
    const row = mergeMachinesWithCatalog([stale], userSolvesReset, FULL_CATALOG).find((m) => m.id === PG_ID)!;
    expect(row.name).toBe(cat.name);
    expect(row.difficulty).toBe(cat.difficulty);
    expect(row.os).toBe(cat.os);
    expect(row.platform).toBe(cat.platform);
    expect(row.roomUrl).toBe(cat.roomUrl);
    expect(row.status).toBe('completed');
    expect(row.userFlag).toBe('user_flag_proof');
    expect(row.rootFlag).toBe('root_flag_proof');
    expect(row.quickNotes).toBe('my notes');
    expect(row.timeSpentSeconds).toBe(4321);
    expect(row.updatedAt).toBe(stale.updatedAt);
    expect(row.tags).toContain('mine');
  });

  it('a tier-moved PG row keeps only the catalog tier tag plus the user tags', () => {
    const cat = catalogRow('pg-bottleneck');
    expect(cat.tags).toContain('PG-Practice');
    expect(cat.tags).not.toContain('PG-Play');
    const stored = { ...cat, tags: ['PG-Play', 'mine'] } as Machine;
    const row = mergeMachinesWithCatalog([stored], false, FULL_CATALOG).find((m) => m.id === 'pg-bottleneck')!;
    expect(row.tags).toContain('PG-Practice');
    expect(row.tags).toContain('mine');
    expect(row.tags).not.toContain('PG-Play');
    expect([...(row.tags || [])].sort()).toEqual([...new Set([...(cat.tags || []), 'mine'])].sort());
  });

  it('a genuine custom named like a catalog machine is untouched', () => {
    const cat = catalogRow('pg-bottleneck');
    const custom = box({
      id: 'custom-1700000000000-bottleneck',
      name: cat.name,
      os: 'Windows',
      difficulty: 'Insane',
      platform: 'Custom' as Machine['platform'],
      roomUrl: 'https://example.test/mine',
      tags: ['PG-Play', 'mine'],
      isCustom: true,
    });
    const row = mergeMachinesWithCatalog([custom], false, FULL_CATALOG).find((m) => m.id === custom.id)!;
    expect(row).toMatchObject({ name: cat.name, os: 'Windows', difficulty: 'Insane', platform: 'Custom', roomUrl: 'https://example.test/mine' });
    expect(row.tags).toEqual(['PG-Play', 'mine']);
  });

  it('a fuzzy-matched legacy row keeps its stored descriptive fields (as before)', () => {
    const lame = catalogRow('htb-lame');
    const legacy = box({ id: 'legacy-lame-slug', name: 'Lame', platform: 'HTB', os: 'Windows', difficulty: 'Insane', quickNotes: 'notes' });
    expect(lame.difficulty).not.toBe('Insane');
    const row = mergeMachinesWithCatalog([legacy], false, FULL_CATALOG).find((m) => m.id === legacy.id)!;
    expect(row).toBeDefined();
    expect(row.quickNotes).toBe('notes');
    expect(row.difficulty).toBe('Insane');
    expect(row.os).toBe('Windows');
  });

  it('merge, lean, merge is a fixed point for a refreshed stale row', () => {
    const cat = catalogRow('pg-bottleneck');
    const stale = { ...cat, name: 'Old Name', difficulty: 'Easy', tags: ['PG-Play', 'mine'], status: 'foothold' as const, userFlag: 'x' } as Machine;
    const y1 = mergeMachinesWithCatalog([stale], false, FULL_CATALOG);
    const y2 = mergeMachinesWithCatalog(toLeanMachines(y1), false, FULL_CATALOG);
    // Never-stored catalog rows gain default fields on their first stored merge, so compare the stored row only.
    expect(y2.find((m) => m.id === 'pg-bottleneck')).toEqual(y1.find((m) => m.id === 'pg-bottleneck'));
    const y3 = mergeMachinesWithCatalog(toLeanMachines(y2), false, FULL_CATALOG);
    expect(y3).toEqual(y2);
  });
});
