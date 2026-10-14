import { describe, it, expect } from 'vitest';
import { buildBatchLootVerificationCommand } from './lootBatchUtils';

describe('buildBatchLootVerificationCommand', () => {
  it('generates plaintext password NetExec SMB batch command', () => {
    const cmd = buildBatchLootVerificationCommand(
      'admin',
      'P@ssword123',
      ['10.10.10.1', '10.10.10.2'],
      { domain: 'CORP.LOCAL' }
    );
    expect(cmd).toBe(
      "nxc smb 10.10.10.1 10.10.10.2 -u 'admin' -p 'P@ssword123' -d 'CORP.LOCAL' --continue-on-success"
    );
  });

  it('switches to -H flag when secret is 32-hex NTLM hash', () => {
    const hash = '329153f560eb329c0e1deea55e88a1e9';
    const cmd = buildBatchLootVerificationCommand('administrator', hash, ['10.10.10.50'], {
      protocol: 'winrm',
    });
    expect(cmd).toBe(
      `nxc winrm 10.10.10.50 -u 'administrator' -H '${hash}' --continue-on-success`
    );
  });

  it('filters out placeholders or invalid IPs', () => {
    const cmd = buildBatchLootVerificationCommand('user', 'pass', ['0.0.0.0', '10.10.10.x', '10.10.10.10']);
    expect(cmd).toContain('10.10.10.10');
    expect(cmd).not.toContain('0.0.0.0');
    expect(cmd).not.toContain('10.10.10.x');
  });

  it('defaults target to <TARGET_IPS> when ip list is empty', () => {
    const cmd = buildBatchLootVerificationCommand('user', 'pass', []);
    expect(cmd).toContain('<TARGET_IPS>');
  });
});
