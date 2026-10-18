import { describe, it, expect } from 'vitest';
import { validateWorkspacePayload, exportWorkspaceToJson } from './workspaceStorage';

describe('workspaceStorage validation & serialization', () => {
  it('validates a standard workspace payload', () => {
    const raw = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      appBrand: 'zerobox',
      machines: [
        { id: 'htb-1', name: 'Lame', ip: '10.10.10.3', os: 'Linux', difficulty: 'Easy', status: 'completed' },
      ],
      globalVars: { lhost: '10.10.14.5', lport: '4444' },
      cheatsheets: [],
      activitySessions: [],
    };

    const res = validateWorkspacePayload(raw);
    expect(res.success).toBe(true);
    expect(res.restoredCount).toBe(1);
    expect(res.data?.machines?.[0].name).toBe('Lame');
    expect(res.data?.globalVars?.lhost).toBe('10.10.14.5');
  });

  it('handles legacy plain array of machines with backwards compatibility', () => {
    const legacyArray = [
      { id: 'box-1', name: 'LegacyBox', ip: '10.10.10.55', os: 'Windows', difficulty: 'Medium', status: 'foothold' },
    ];

    const res = validateWorkspacePayload(legacyArray);
    expect(res.success).toBe(true);
    expect(res.restoredCount).toBe(1);
    expect(res.data?.machines?.[0].name).toBe('LegacyBox');
  });

  it('rejects invalid non-object payload', () => {
    const res = validateWorkspacePayload('not json');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('serializes workspace to JSON correctly', () => {
    const state = {
      machines: [{ id: 'm1', name: 'Target1', ip: '10.10.10.1', os: 'Linux', difficulty: 'Easy', status: 'backlog' } as any],
      globalVars: { lhost: '10.10.14.2', lport: '9001' } as any,
      cheatsheets: [],
      activitySessions: [],
    };

    const json = exportWorkspaceToJson(state);
    const parsed = JSON.parse(json);
    expect(parsed.appBrand).toBe('zerobox');
    expect(parsed.machines.length).toBe(1);
    expect(parsed.globalVars.lport).toBe('9001');
  });

  it('sanitizes against prototype pollution keys (__proto__, constructor, prototype) on import', () => {
    // Malicious payload with dangerous keys
    const maliciousJson = JSON.stringify({
      version: '2.0.0',
      machines: [
        { id: 'box-pwn', name: 'Pwned', ip: '10.10.10.99', os: 'Linux', difficulty: 'Easy', status: 'backlog' },
      ],
      globalVars: {
        lhost: '10.10.14.10',
        lport: '4444',
        __proto__: { polluted: 'true' },
        constructor: { evil: true },
        prototype: { bad: 'actor' },
      },
      userWikilinkMap: {
        'legit': 'note-1',
        __proto__: { admin: true },
      },
    });

    const parsed = JSON.parse(maliciousJson);
    const res = validateWorkspacePayload(parsed);

    expect(res.success).toBe(true);
    expect(res.data?.globalVars).toBeDefined();
    // Verify prototype pollution keys are stripped
    expect(Object.prototype.hasOwnProperty.call(res.data?.globalVars, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(res.data?.globalVars, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(res.data?.globalVars, 'prototype')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(res.data?.userWikilinkMap, '__proto__')).toBe(false);
    // Ensure legitimate properties are preserved
    expect(res.data?.globalVars?.lhost).toBe('10.10.14.10');
    expect(res.data?.userWikilinkMap?.['legit']).toBe('note-1');
  });
});
