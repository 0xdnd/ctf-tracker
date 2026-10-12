import { describe, it, expect } from 'vitest';
import { interpolateCommand, getUnresolvedTokens } from './helpers';
import { resolveTemplate } from './variableSubstitution';
import type { GlobalVariables } from '../types';

const vars: GlobalVariables = {
  targetIp: '10.10.11.5',
  lhost: '10.10.14.9',
  lport: '9001',
  interface: 'tun0',
  customVars: {},
};

describe('legacy interpolateCommand alias behavior (via shared engine)', () => {
  it('treats lowercase {ip} as the TARGET, not LHOST', () => {
    expect(interpolateCommand('ping {ip} {IP} <ip>', vars)).toBe('ping 10.10.11.5 10.10.11.5 10.10.11.5');
    // The shared engine's default table maps exact-case {ip} to LHOST; legacy opts out.
    expect(resolveTemplate('{ip}', { lhost: 'A', rhost: 'B' }).text).toBe('A');
  });

  it('does not treat {port} or {shell} as variables', () => {
    expect(interpolateCommand('nc {port} {shell}', vars)).toBe('nc {port} {shell}');
    expect(getUnresolvedTokens('nc {port} {shell}', vars)).toEqual(['port', 'shell']);
  });

  it('keeps the historical unresolved ordering and ignores INTERFACE and placeholder values', () => {
    const unset: GlobalVariables = { targetIp: '10.10.10.X', lhost: '10.10.14.X', lport: '', interface: '', customVars: {} };
    expect(getUnresolvedTokens('{FOO} {INTERFACE} {LPORT} {TARGET_IP} {LHOST}', unset)).toEqual([
      'LHOST',
      'TARGET_IP',
      'LPORT',
      'FOO',
    ]);
  });
});
