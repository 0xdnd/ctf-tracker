import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCtfStore,
  mergeMachinesWithCatalog,
  mergeIncomingMachines,
  sanitizeActiveMachine,
  appendTimeline,
} from '../../store/useCtfStore';
import { hasUserProgress } from '../../store/machineNormalization';
import { STARTER_MACHINES } from '../../data/starterMachines';
import { validateWorkspacePayload } from '../../utils/workspaceStorage';
import { unionMachine } from '../../utils/syncMerge';
import { DAY_MS } from '../../utils/spacedRepetition';
import { TIMELINE_CAP } from '../../types';
import type { LabFinding, Machine, TimelineEvent } from '../../types';

const OLD = '2024-01-01T00:00:00.000Z';
const get = () => useCtfStore.getState();

const finding = (id: string, title = 'SQLi in login'): LabFinding => ({
  id,
  title,
  severity: 'high',
  cvssScore: 8.1,
  createdAt: 1,
  updatedAt: 1,
});

const event = (id: string, at: number): TimelineEvent => ({ id, at, kind: 'note', label: id });

const box = (over: Partial<Machine> = {}): Machine =>
  ({
    id: 'custom-1-lab',
    name: 'Lab Box',
    ip: '10.10.10.5',
    os: 'Linux',
    platform: 'Custom',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    isCustom: true,
    createdAt: OLD,
    updatedAt: OLD,
    ...over,
  }) as Machine;

const studyFields = {
  domain: 'corp.htb',
  vhosts: ['dev.corp.htb'],
  findings: [finding('f1')],
  portTriage: { '80': { status: 'key_vector' as const, note: 'login form' } },
  timeline: [event('e1', 1)],
};

describe('lab study fields: catalog merge', () => {
  it('survive a catalog merge while new catalog tags are added; customs are preserved', () => {
    const catalogRow = box({ id: 'htb-zz-lab', name: 'ZZ Lab', platform: 'HTB', isCustom: undefined, status: 'backlog', tags: ['web', 'new-tag'] });
    const stored = box({ ...studyFields, id: 'htb-zz-lab', name: 'ZZ Lab', platform: 'HTB', isCustom: undefined, tags: ['web', 'mine'] });
    const custom = box({ id: 'custom-2-own', name: 'Own', findings: [finding('f9')] });
    const merged = mergeMachinesWithCatalog([stored, custom], false, [catalogRow]);
    const m = merged.find((x) => x.id === 'htb-zz-lab')!;
    expect(m.domain).toBe('corp.htb');
    expect(m.vhosts).toEqual(['dev.corp.htb']);
    expect(m.findings).toEqual([finding('f1')]);
    expect(m.portTriage).toEqual(studyFields.portTriage);
    expect(m.timeline).toEqual([event('e1', 1)]);
    expect(m.tags).toEqual(expect.arrayContaining(['web', 'new-tag', 'mine']));
    expect(merged.find((x) => x.id === 'custom-2-own')?.findings).toEqual([finding('f9')]);
  });

  it('keeps an unmatched catalog row whose only progress is findings, drops an idle one', () => {
    const withFindings = box({ id: 'htb-zz-gone', name: 'ZZ Gone', platform: 'HTB', isCustom: undefined, status: 'backlog', findings: [finding('f1')] });
    const idle = box({ id: 'htb-zz-idle', name: 'ZZ Idle', platform: 'HTB', isCustom: undefined, status: 'backlog' });
    expect(hasUserProgress(withFindings)).toBe(true);
    const merged = mergeMachinesWithCatalog([withFindings, idle], false, STARTER_MACHINES);
    expect(merged.find((m) => m.id === withFindings.id)?.findings).toHaveLength(1);
    expect(merged.some((m) => m.id === idle.id)).toBe(false);
  });

  it('hasUserProgress counts each study field', () => {
    const base = { status: 'backlog' as const };
    expect(hasUserProgress(box(base))).toBe(false);
    expect(hasUserProgress(box({ ...base, domain: 'x.htb' }))).toBe(true);
    expect(hasUserProgress(box({ ...base, vhosts: ['a.x.htb'] }))).toBe(true);
    expect(hasUserProgress(box({ ...base, portTriage: { '22': { status: 'dead_end' } } }))).toBe(true);
    expect(hasUserProgress(box({ ...base, timeline: [event('e', 1)] }))).toBe(true);
    expect(hasUserProgress(box({ ...base, solveIndependence: 'solo' }))).toBe(true);
    expect(hasUserProgress(box({ ...base, domain: '  ', vhosts: [], portTriage: {} }))).toBe(false);
  });

  it('sanitizeActiveMachine strips every study field from an active machine', () => {
    const active = sanitizeActiveMachine(
      box({ ...studyFields, isActive: true, solveIndependence: 'solo', nextReviewAt: 5, reviewCount: 2 })
    );
    for (const k of ['domain', 'vhosts', 'portTriage', 'findings', 'timeline', 'solveIndependence', 'nextReviewAt', 'reviewCount'] as const) {
      expect(active[k]).toBeUndefined();
    }
  });
});

describe('lab study fields: cross-tab precedence', () => {
  it('a newer incoming row wins for the new fields; a newer pending local row is kept', () => {
    const local = box({ findings: [finding('local')], updatedAt: '2026-01-01T00:00:00.000Z' });
    const incoming = box({ findings: [finding('theirs')], domain: 'x.htb', updatedAt: '2026-01-02T00:00:00.000Z' });
    const merged = mergeIncomingMachines([local], [incoming], new Set());
    expect(merged[0].findings?.[0].id).toBe('theirs');
    expect(merged[0].domain).toBe('x.htb');

    const newerLocal = { ...local, updatedAt: '2026-01-03T00:00:00.000Z' };
    expect(mergeIncomingMachines([newerLocal], [incoming], new Set())[0].findings?.[0].id).toBe('local');
  });
});

describe('lab study actions', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({ machines: [box()], activeTargetId: null, isTimerRunning: false, activeTimerSeconds: 0 });
  });

  const machine = () => get().machines.find((m) => m.id === 'custom-1-lab')!;

  it('every new action bumps updatedAt', () => {
    const steps: Array<() => void> = [
      () => get().setMachineDomain('custom-1-lab', ' corp.htb '),
      () => get().setMachineVhosts('custom-1-lab', ['A.corp.htb']),
      () => get().addMachineVhost('custom-1-lab', 'b.corp.htb'),
      () => get().removeMachineVhost('custom-1-lab', 'B.CORP.HTB'),
      () => get().setPortTriage('custom-1-lab', 445, { status: 'checking' }),
      () => get().clearPortTriage('custom-1-lab', 445),
      () => get().addFinding('custom-1-lab', { title: 'Weak creds', severity: 'medium' }),
      () => get().updateFinding('custom-1-lab', machine().findings![0].id, { severity: 'critical' }),
      () => get().removeFinding('custom-1-lab', machine().findings![0].id),
      () => get().setSolveIndependence('custom-1-lab', 'nudged'),
      () => get().markReviewed('custom-1-lab'),
    ];
    for (const step of steps) {
      useCtfStore.setState({ machines: get().machines.map((m) => ({ ...m, updatedAt: OLD })) });
      step();
      expect(machine().updatedAt > OLD).toBe(true);
    }
  });

  it('normalizes domain and vhosts', () => {
    get().setMachineDomain('custom-1-lab', '  corp.htb ');
    expect(machine().domain).toBe('corp.htb');
    get().setMachineVhosts('custom-1-lab', [' Dev.Corp.htb', 'dev.corp.htb', '', '  ', 'API.corp.htb']);
    expect(machine().vhosts).toEqual(['dev.corp.htb', 'api.corp.htb']);
    get().setMachineVhosts('custom-1-lab', []);
    expect(machine().vhosts).toBeUndefined();
    get().setMachineDomain('custom-1-lab', '');
    expect(machine().domain).toBeUndefined();
  });

  it('port triage defaults to untested and is keyed by string port', () => {
    get().setPortTriage('custom-1-lab', 80, { note: 'nginx' });
    expect(machine().portTriage).toEqual({ '80': { status: 'untested', note: 'nginx' } });
    get().setPortTriage('custom-1-lab', '80', { status: 'key_vector' });
    expect(machine().portTriage?.['80']).toEqual({ status: 'key_vector', note: 'nginx' });
    get().clearPortTriage('custom-1-lab', 80);
    expect(machine().portTriage).toBeUndefined();
  });

  it('addFinding returns the id, logs finding_added, and update/remove work', () => {
    const fid = get().addFinding('custom-1-lab', { title: '  RCE  ', severity: 'critical', cvssScore: 12 });
    expect(fid).toMatch(/^finding-/);
    const f = machine().findings![0];
    expect(f).toMatchObject({ id: fid, title: 'RCE', severity: 'critical', cvssScore: 10 });
    expect(machine().timeline?.at(-1)).toMatchObject({ kind: 'finding_added', meta: { findingId: fid } });
    get().updateFinding('custom-1-lab', fid, { remediation: 'Patch it' });
    expect(machine().findings![0]).toMatchObject({ id: fid, title: 'RCE', remediation: 'Patch it', createdAt: f.createdAt });
    get().removeFinding('custom-1-lab', fid);
    expect(machine().findings).toBeUndefined();
    expect(get().addFinding('nope', { title: 'x', severity: 'low' })).toBe('');
  });

  it('actions are no-ops on active machines', () => {
    useCtfStore.setState({ machines: [box({ isActive: true })] });
    get().setMachineDomain('custom-1-lab', 'x.htb');
    expect(get().addFinding('custom-1-lab', { title: 'x', severity: 'low' })).toBe('');
    expect(machine().domain).toBeUndefined();
    expect(machine().findings).toBeUndefined();
    expect(machine().updatedAt).toBe(OLD);
  });

  it('setSolveIndependence schedules a review and logs it; markReviewed lengthens the interval', () => {
    const before = Date.now();
    get().setSolveIndependence('custom-1-lab', 'nudged');
    const m1 = machine();
    expect(m1.solveIndependence).toBe('nudged');
    expect(m1.reviewCount).toBe(0);
    expect(m1.nextReviewAt! - before).toBeGreaterThanOrEqual(3 * DAY_MS);
    expect(m1.nextReviewAt! - before).toBeLessThan(3 * DAY_MS + 60_000);
    expect(m1.timeline?.at(-1)?.kind).toBe('review_scheduled');

    // Re-rating before the review is due only corrects the rating.
    get().setSolveIndependence('custom-1-lab', 'solo');
    expect(machine().reviewCount).toBe(0);

    // Re-rating a due machine counts as a completed review.
    useCtfStore.setState({ machines: get().machines.map((m) => ({ ...m, nextReviewAt: Date.now() - 1 })) });
    get().setSolveIndependence('custom-1-lab', 'solo');
    expect(machine().reviewCount).toBe(1);

    get().markReviewed('custom-1-lab');
    const m2 = machine();
    expect(m2.reviewCount).toBe(2);
    expect(m2.nextReviewAt! - Date.now()).toBeGreaterThan(27 * DAY_MS); // solo 7 * 2^2
  });

  it('auto-logs status and pwn changes', () => {
    get().updateMachineStatus('custom-1-lab', 'foothold');
    const kinds = machine().timeline!.map((e) => e.kind);
    expect(kinds).toEqual(['status_change', 'user_pwned']);
    expect(machine().timeline![0].meta).toEqual({ from: 'recon', to: 'foothold' });

    get().toggleRootFlag('custom-1-lab', 'HTB{root}');
    expect(machine().timeline!.map((e) => e.kind).slice(2)).toEqual(['status_change', 'root_pwned']);

    // No change -> no event.
    const len = machine().timeline!.length;
    get().updateMachine('custom-1-lab', { quickNotes: 'notes' });
    expect(machine().timeline!.length).toBe(len);

    get().batchUpdateMachineStatus([{ machineId: 'custom-1-lab', status: 'completed' }]);
    expect(machine().timeline!.at(-1)).toMatchObject({ kind: 'status_change', meta: { from: 'root', to: 'completed' } });
  });

  it('caps the timeline at 200, dropping the oldest', () => {
    const full = Array.from({ length: TIMELINE_CAP }, (_, i) => event(`e${i}`, i));
    useCtfStore.setState({ machines: [box({ timeline: full })] });
    get().updateMachineStatus('custom-1-lab', 'root');
    const tl = machine().timeline!;
    expect(tl).toHaveLength(TIMELINE_CAP);
    expect(tl.some((e) => e.id === 'e0')).toBe(false);
    expect(tl.at(-1)?.kind).toBe('root_pwned');
  });

  it('appendTimeline stamps updatedAt and skips active machines', () => {
    const out = appendTimeline(box(), { kind: 'note', label: 'hi', at: Date.UTC(2026, 0, 5) });
    expect(out.updatedAt).toBe('2026-01-05T00:00:00.000Z');
    const active = box({ isActive: true });
    expect(appendTimeline(active, { kind: 'note', label: 'hi' })).toBe(active);
  });

  it('syncCatalog re-merges with the catalog and keeps study fields', () => {
    const starter = STARTER_MACHINES.find((m) => !m.isActive && (m.tags || []).length > 0)!;
    expect(starter).toBeTruthy();
    useCtfStore.setState({ machines: [{ ...starter, tags: [], domain: 'kept.htb', findings: [finding('f1')] }] });
    get().syncCatalog();
    const m = get().machines.find((x) => x.id === starter.id)!;
    expect(m.tags).toEqual(expect.arrayContaining(starter.tags));
    expect(m.domain).toBe('kept.htb');
    expect(m.findings).toHaveLength(1);
  });
});

describe('lab study fields: backup and sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trip through exportBackup/importBackup', () => {
    useCtfStore.setState({
      machines: [box({ ...studyFields, solveIndependence: 'assisted', nextReviewAt: 123, reviewCount: 1 })],
      globalVars: { ...get().globalVars, domain: 'corp.htb', dcIp: '10.10.10.1', cred: 'secret' },
    });
    const json = get().exportBackup();
    useCtfStore.setState({ machines: [] });
    expect(get().importBackup(json)).toBe(true);
    const m = get().machines.find((x) => x.id === 'custom-1-lab')!;
    expect(m).toMatchObject({ ...studyFields, solveIndependence: 'assisted', nextReviewAt: 123, reviewCount: 1 });
    expect(get().globalVars).toMatchObject({ domain: 'corp.htb', dcIp: '10.10.10.1' });
    expect(JSON.parse(get().exportBackup({ redactSecrets: true })).globalVars.cred).toBe('[REDACTED]');
  });

  it('validateWorkspacePayload bounds malformed study fields and leaves legacy rows alone', () => {
    const legacy = box();
    const bad = {
      ...box({ id: 'custom-2-bad' }),
      domain: 42,
      vhosts: ['A.htb', 'a.htb', 7],
      portTriage: { '80': { status: 'bogus' }, '22': { status: 'dead_end', note: 'x' } },
      findings: [{ id: 'f', title: '', severity: 'nope', cvssScore: 99 }, 'junk'],
      timeline: [{ id: 'e', at: 'never', kind: 'note', label: 'x' }],
      solveIndependence: 'genius',
      reviewCount: -1,
    };
    const { data } = validateWorkspacePayload({ machines: [legacy, bad] });
    expect(data!.machines![0]).toEqual(legacy);
    const out = data!.machines![1];
    expect(out.domain).toBeUndefined();
    expect(out.vhosts).toEqual(['a.htb']);
    expect(out.portTriage).toEqual({ '22': { status: 'dead_end', note: 'x' } });
    expect(out.findings).toEqual([{ id: 'f', title: 'Untitled finding', severity: 'info', cvssScore: 10, createdAt: 0, updatedAt: 0 }]);
    expect(out.timeline).toBeUndefined();
    expect(out.solveIndependence).toBeUndefined();
    expect(out.reviewCount).toBeUndefined();
  });

  it('unionMachine unions findings, vhosts, triage and timeline', () => {
    const local = box({ findings: [finding('a')], vhosts: ['a.htb'], portTriage: { '80': { status: 'checking' } }, timeline: [event('l', 2)] });
    const incoming = box({ findings: [finding('b')], vhosts: ['b.htb'], portTriage: { '22': { status: 'dead_end' } }, timeline: [event('r', 1)], domain: 'x.htb' });
    const out = unionMachine(local, incoming);
    expect(out.findings!.map((f) => f.id)).toEqual(['a', 'b']);
    expect(out.vhosts).toEqual(['a.htb', 'b.htb']);
    expect(Object.keys(out.portTriage!).sort()).toEqual(['22', '80']);
    expect(out.timeline!.map((e) => e.id)).toEqual(['r', 'l']);
    expect(out.domain).toBe('x.htb');
  });
});
