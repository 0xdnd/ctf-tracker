import { describe, expect, it } from 'vitest';
import {
  getHostAccess,
  getPortCount,
  getStillNeeded,
  isRootFlagDone,
  isUserFlagDone,
} from './machineGlance';
import type { Machine } from '../types';

function mk(extra: Partial<Machine> = {}): Machine {
  return {
    id: 'm1',
    name: 'Box',
    ip: '10.0.0.1',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'backlog',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    ...extra,
  } as Machine;
}

describe('flag done', () => {
  it('user flag text', () => {
    expect(isUserFlagDone(mk({ userFlag: 'abc' }))).toBe(true);
    expect(isUserFlagDone(mk({ userFlag: '   ' }))).toBe(false);
    expect(isUserFlagDone(mk())).toBe(false);
  });
  it('user via status + pwnedAt without a flag', () => {
    for (const status of ['foothold', 'root', 'completed'] as const) {
      expect(isUserFlagDone(mk({ status, userPwnedAt: '2026-01-01' }))).toBe(true);
    }
    expect(isUserFlagDone(mk({ status: 'backlog', userPwnedAt: '2026-01-01' }))).toBe(false);
    expect(isUserFlagDone(mk({ status: 'foothold' }))).toBe(false);
  });
  it('root flag text and status + pwnedAt', () => {
    expect(isRootFlagDone(mk({ rootFlag: 'x' }))).toBe(true);
    expect(isRootFlagDone(mk({ rootFlag: ' ' }))).toBe(false);
    expect(isRootFlagDone(mk({ status: 'root', rootPwnedAt: '2026-01-01' }))).toBe(true);
    expect(isRootFlagDone(mk({ status: 'completed', rootPwnedAt: '2026-01-01' }))).toBe(true);
    expect(isRootFlagDone(mk({ status: 'foothold', rootPwnedAt: '2026-01-01' }))).toBe(false);
    expect(isRootFlagDone(mk({ status: 'root' }))).toBe(false);
  });
});

describe('getPortCount', () => {
  it('prefers services, falls back to openPorts, else 0', () => {
    const svc = (port: number) => ({ port }) as unknown as NonNullable<Machine['services']>[number];
    expect(getPortCount(mk({ services: [svc(22), svc(80)], openPorts: [1] }))).toBe(2);
    expect(getPortCount(mk({ services: [], openPorts: [22, 80, 443] }))).toBe(3);
    expect(getPortCount(mk({ openPorts: [22] }))).toBe(1);
    expect(getPortCount(mk())).toBe(0);
  });
});

describe('getHostAccess', () => {
  it('credential admin over user flag -> root/credential', () => {
    expect(getHostAccess(mk({ userFlag: 'x' }), 'admin')).toEqual({ level: 'root', source: 'credential' });
  });
  it('credential user over nothing -> user/credential', () => {
    expect(getHostAccess(mk(), 'user')).toEqual({ level: 'user', source: 'credential' });
  });
  it('equal tiers -> flags', () => {
    expect(getHostAccess(mk({ userFlag: 'x' }), 'user')).toEqual({ level: 'user', source: 'flags' });
    expect(getHostAccess(mk({ rootFlag: 'x' }), 'admin')).toEqual({ level: 'root', source: 'flags' });
  });
  it('flags higher than credential -> flags', () => {
    expect(getHostAccess(mk({ rootFlag: 'x' }), 'user')).toEqual({ level: 'root', source: 'flags' });
  });
  it('none -> null source', () => {
    expect(getHostAccess(mk(), 'none')).toEqual({ level: 'none', source: null });
  });
});

describe('getStillNeeded', () => {
  const opts = { targetType: 'machine' as const, portCount: 3, checklistInProgress: 0 };
  it('completed and root -> []', () => {
    expect(getStillNeeded(mk({ status: 'completed' }), { ...opts, portCount: 0 })).toEqual([]);
    expect(getStillNeeded(mk({ status: 'root' }), { ...opts, portCount: 0 })).toEqual([]);
  });
  it('machine lists missing flags', () => {
    expect(getStillNeeded(mk(), opts)).toEqual([{ key: 'userFlag' }, { key: 'rootFlag' }]);
    expect(getStillNeeded(mk({ userFlag: 'x' }), opts)).toEqual([{ key: 'rootFlag' }]);
  });
  it('pro-lab has no flag items', () => {
    expect(getStillNeeded(mk(), { ...opts, targetType: 'pro-lab' })).toEqual([]);
    expect(getStillNeeded(mk(), { ...opts, targetType: 'exam', portCount: 0 })).toEqual([{ key: 'ports' }]);
  });
  it('ports and checklist count, in order', () => {
    expect(
      getStillNeeded(mk({ userFlag: 'a', rootFlag: 'b' }), { ...opts, portCount: 0, checklistInProgress: 2 }),
    ).toEqual([{ key: 'ports' }, { key: 'checklistInProgress', count: 2 }]);
  });
});
