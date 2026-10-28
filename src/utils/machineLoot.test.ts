import { describe, expect, it } from 'vitest';
import { getMachineLoot } from './machineLoot';
import type { CredAttempt, CredAttemptResult, CredService, Credential, LootItem, LootVerification } from '../types/loot';

const M = 'm1';

function cred(id: string, extra: Partial<Credential> = {}): Credential {
  return { id, type: 'password', username: id, secret: 's', createdAt: '2026-01-01', ...extra };
}
function att(credId: string, result: CredAttemptResult, service: CredService = 'smb', machineId = M): CredAttempt {
  return { id: `${credId}-${service}-${result}-${machineId}`, credId, machineId, service, result, at: '2026-01-01' };
}
function ver(status: LootVerification['status'], protocol?: string): Record<string, LootVerification> {
  return { [M]: { status, protocol } };
}
function item(id: string, machineId?: string): LootItem {
  return { id, category: 'note', title: id, value: 'v', machineId, createdAt: '2026-01-01' };
}
const run = (credentials: Credential[], credAttempts: CredAttempt[] = [], lootItems: LootItem[] = []) =>
  getMachineLoot({ credentials, credAttempts, lootItems }, M);

describe('getMachineLoot', () => {
  it('places credentials in each group', () => {
    const r = run(
      [
        cred('w', { verifications: ver('user', 'ssh') }),
        cred('f', { verifications: ver('failed') }),
        cred('t'),
        cred('h'),
      ],
      [att('t', 'tried')],
    );
    expect(r.works.map((e) => e.credential.id)).toEqual(['w']);
    expect(r.works[0].protocol).toBe('ssh');
    expect(r.failed.map((e) => e.credential.id)).toEqual(['f']);
    expect(r.triedNoResult.map((e) => e.credential.id)).toEqual(['t']);
    expect(r.tryHere.map((e) => e.credential.id)).toEqual(['h']);
    expect(r.failed[0].level).toBeUndefined();
  });

  it('priority: failed + valid attempts -> works', () => {
    const r = run([cred('a')], [att('a', 'invalid', 'smb'), att('a', 'valid', 'ssh')]);
    expect(r.works).toHaveLength(1);
    expect(r.failed).toHaveLength(0);
  });

  it('priority: verification failed + valid attempt -> works', () => {
    const r = run([cred('a', { verifications: ver('failed') })], [att('a', 'valid')]);
    expect(r.works).toHaveLength(1);
    expect(r.failed).toHaveLength(0);
  });

  it('untested verification without attempts -> tryHere', () => {
    const r = run([cred('a', { verifications: ver('untested') })]);
    expect(r.tryHere).toHaveLength(1);
  });

  it('invalid attempt -> failed; tried + invalid -> failed', () => {
    const r = run([cred('a'), cred('b')], [att('a', 'invalid'), att('b', 'tried', 'smb'), att('b', 'invalid', 'ssh')]);
    expect(r.failed.map((e) => e.credential.id)).toEqual(['a', 'b']);
    expect(r.triedNoResult).toHaveLength(0);
  });

  it('computes levels admin / user / unknown', () => {
    const r = run(
      [cred('a', { verifications: ver('admin') }), cred('u', { verifications: ver('user') }), cred('x')],
      [att('x', 'valid')],
    );
    expect(r.works.map((e) => e.level)).toEqual(['admin', 'user', 'unknown']);
  });

  it('leaves redacted out of tryHere only', () => {
    const r = run(
      [
        cred('h', { redacted: true }),
        cred('w', { redacted: true, verifications: ver('user') }),
        cred('f', { redacted: true, verifications: ver('failed') }),
        cred('t', { redacted: true }),
      ],
      [att('t', 'tried')],
    );
    expect(r.tryHere).toHaveLength(0);
    expect(r.works).toHaveLength(1);
    expect(r.failed).toHaveLength(1);
    expect(r.triedNoResult).toHaveLength(1);
  });

  it('ignores orphan attempts and other-machine attempts', () => {
    const r = run([cred('a')], [att('ghost', 'valid'), att('a', 'valid', 'smb', 'other')]);
    expect(r.works).toHaveLength(0);
    expect(r.tryHere).toHaveLength(1);
    expect(r.tryHere[0].services).toEqual([]);
  });

  it('foundHere overlaps with a group', () => {
    const r = run([cred('a', { sourceMachineId: M }), cred('b', { sourceMachineId: 'other' })]);
    expect(r.foundHere.map((c) => c.id)).toEqual(['a']);
    expect(r.tryHere.map((e) => e.credential.id)).toEqual(['a', 'b']);
  });

  it('services are unique in first-seen order', () => {
    const r = run([cred('a')], [att('a', 'tried', 'ssh'), att('a', 'valid', 'smb'), att('a', 'invalid', 'ssh')]);
    expect(r.works[0].services).toEqual(['ssh', 'smb']);
  });

  it('filters items by machineId', () => {
    const r = run([], [], [item('1', M), item('2', 'other'), item('3')]);
    expect(r.items.map((i) => i.id)).toEqual(['1']);
  });

  it('bestCredLevel ignores unknown', () => {
    expect(run([cred('x')], [att('x', 'valid')]).bestCredLevel).toBe('none');
    expect(run([cred('x'), cred('u', { verifications: ver('user') })], [att('x', 'valid')]).bestCredLevel).toBe('user');
    expect(
      run([cred('u', { verifications: ver('user') }), cred('a', { verifications: ver('admin') })]).bestCredLevel,
    ).toBe('admin');
    expect(run([]).bestCredLevel).toBe('none');
  });

  it('does not mutate inputs and keeps order', () => {
    const credentials = [cred('b'), cred('a')];
    const copy = JSON.stringify(credentials);
    const r = run(credentials);
    expect(JSON.stringify(credentials)).toBe(copy);
    expect(r.tryHere.map((e) => e.credential.id)).toEqual(['b', 'a']);
  });
});
