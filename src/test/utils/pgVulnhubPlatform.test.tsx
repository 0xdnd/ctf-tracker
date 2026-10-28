import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { webcrypto } from 'node:crypto';
import JSZip from 'jszip';
import { installFakeIndexedDb, type FakeIndexedDb } from '../exam/fakeIndexedDb';
import { useCtfStore } from '../../store/useCtfStore';
import { buildBackupFile, importBackupFile } from '../../store/backupFile';
import { TrackerView } from '../../components/tracker/TrackerView';
import { FilterDrawer } from '../../components/layout/FilterDrawer';
import { matchesFilters } from '../../utils/machineFilter';
import { buildMachinesCsv } from '../../utils/machinesCsv';
import { communityLink } from '../../utils/machineLinks';
import { generateObsidianVaultZip } from '../../utils/obsidianVaultExporter';
import type { Machine, Platform } from '../../types';

vi.unmock('../../utils/indexedDbVault');

const OLD = '2024-01-01T00:00:00.000Z';
const mk = (platform: Platform, id: string, name: string, over: Partial<Machine> = {}): Machine =>
  ({
    id, name, ip: '10.10.x.x', os: 'Linux', platform, difficulty: 'Easy', status: 'backlog', tags: [],
    certifications: [], timeSpentSeconds: 0, createdAt: OLD, updatedAt: OLD, ...over,
  }) as Machine;

const PG = mk('PG', 'pg-sar', 'Sar', { roomUrl: 'https://portal.offsec.com/labs/play', tags: ['PG-Play'] });
const VH = mk('VulnHub', 'vulnhub-kioptrix-1', 'Kioptrix 1', { roomUrl: 'https://www.vulnhub.com/?q=Kioptrix%201' });
const HTB = mk('HTB', 'htb-lame', 'Lame');

describe('PG and VulnHub platform support', () => {
  beforeEach(() => {
    useCtfStore.getState().resetFilters();
    useCtfStore.setState({ machines: [HTB, PG, VH], selectedMachineId: null });
  });

  it('platform filter returns only PG rows', () => {
    const f = { ...useCtfStore.getState().filters, selectedPlatform: 'PG' as const };
    const rows = [HTB, PG, VH].filter((m) => matchesFilters(m, f));
    expect(rows.map((m) => m.id)).toEqual(['pg-sar']);
    const vh = [HTB, PG, VH].filter((m) => matchesFilters(m, { ...f, selectedPlatform: 'VulnHub' }));
    expect(vh.map((m) => m.id)).toEqual(['vulnhub-kioptrix-1']);
  });

  it('FilterDrawer offers PG and VulnHub chips', () => {
    useCtfStore.setState({ filterDrawerOpen: true });
    render(<MemoryRouter><FilterDrawer /></MemoryRouter>);
    expect(screen.getAllByRole('button', { name: 'PG' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'VulnHub' }).length).toBeGreaterThan(0);
  });

  it('CSV for a PG row has the platform and no undefined', () => {
    const csv = buildMachinesCsv([PG]);
    expect(csv).toContain('Sar,PG,');
    expect(csv).not.toContain('undefined');
  });

  it('machineLinks gives a VulnHub row the vulnhub.com search link', () => {
    expect(communityLink(VH)).toEqual({ href: 'https://www.vulnhub.com/?q=Kioptrix%201', label: 'VulnHub page' });
    expect(communityLink(PG)).toBeNull();
    expect(communityLink({ ...PG, writeupUrl: 'https://example.com/w' })).toEqual({ href: 'https://example.com/w', label: 'Writeup' });
  });

  it('Obsidian export of a PG row names the platform with no undefined', async () => {
    const zip = await generateObsidianVaultZip([{ ...PG, status: 'completed' }], []);
    const text = (await Promise.all(Object.values((await JSZip.loadAsync(await zip.arrayBuffer())).files).filter((f) => !f.dir).map((f) => f.async('string')))).join('\n');
    expect(text).toContain('PG');
    expect(text).not.toContain('undefined');
  });

  it('/tracker?platform=PG applies the PG filter', () => {
    render(<MemoryRouter initialEntries={['/tracker?platform=PG']}><TrackerView /></MemoryRouter>);
    expect(useCtfStore.getState().filters.selectedPlatform).toBe('PG');
  });

  it('/tracker?platform=Bogus is ignored', () => {
    render(<MemoryRouter initialEntries={['/tracker?platform=Bogus']}><TrackerView /></MemoryRouter>);
    expect(useCtfStore.getState().filters.selectedPlatform).toBe('ALL');
  });
});

describe('PG backup import', () => {
  let fake: FakeIndexedDb;
  beforeEach(() => {
    fake = installFakeIndexedDb();
    if (typeof globalThis.crypto?.subtle === 'undefined') vi.stubGlobal('crypto', webcrypto);
    localStorage.clear();
  });
  afterEach(() => { fake.uninstall(); vi.unstubAllGlobals(); });

  it('keeps platform PG for a PG row and a Custom row of the same name', async () => {
    useCtfStore.setState({ machines: [{ ...PG, status: 'recon' }, mk('Custom', 'custom-1-sar', 'Sar', { isCustom: true })] });
    const text = await buildBackupFile();
    useCtfStore.setState({ machines: [] });
    const res = await importBackupFile(text);
    expect(res.ok).toBe(true);
    const ms = useCtfStore.getState().machines;
    expect(ms.find((m) => m.id === 'pg-sar')?.platform).toBe('PG');
    expect(ms.find((m) => m.id === 'custom-1-sar')?.platform).toBe('Custom');
  });
});
