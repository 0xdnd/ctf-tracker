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

  it('drops IPs containing shell metachars or whitespace', () => {
    const cmd = buildBatchLootVerificationCommand('user', 'pass', [
      '10.10.10.1; rm -rf /',
      '10.10.10.2|cat /etc/passwd',
      '10.10.10.3&evil',
      '10.10.10.4$evil',
      '10.10.10.5`id`',
      "10.10.10.6'evil",
      '10.10.10.7"evil',
      '10.10.10.8\\evil',
      '10.10.10.9 evil',
      '10.10.10.10\nrm',
      '10.10.10.11',
    ]);
    expect(cmd).toContain('10.10.10.11');
    expect(cmd).not.toContain('rm -rf');
    expect(cmd).not.toContain('|cat');
    expect(cmd).not.toContain('`id`');
    expect(cmd).not.toContain('\n');
  });

  it('drops invalid IPv4 octets and keeps valid IPv6', () => {
    const cmd = buildBatchLootVerificationCommand('user', 'pass', [
      '300.1.1.1',
      '999.999.999.999',
      'dead:beef::1',
      '10.10.10.20',
    ]);
    expect(cmd).toContain('dead:beef::1');
    expect(cmd).toContain('10.10.10.20');
    expect(cmd).not.toContain('300.1.1.1');
    expect(cmd).not.toContain('999.999.999.999');
  });

  it('quotes user/cred/domain with spaces and single quotes', () => {
    const cmd = buildBatchLootVerificationCommand(
      "ad'min",
      "p@ss w0rd!'",
      ['10.10.10.1'],
      { domain: `my domain` }
    );
    // shellQuote escapes ' as '"'"' and wraps in single quotes
    expect(cmd).toContain(`-u 'ad'"'"'min'`);
    expect(cmd).toContain(`-p 'p@ss w0rd!'"'"''`);
    expect(cmd).toContain(`-d 'my domain'`);
  });

  it('keeps --continue-on-success default and respects false', () => {
    const withDefault = buildBatchLootVerificationCommand('u', 'p', ['10.10.10.1']);
    expect(withDefault).toContain('--continue-on-success');
    const without = buildBatchLootVerificationCommand('u', 'p', ['10.10.10.1'], {
      continueOnSuccess: false,
    });
    expect(without).not.toContain('--continue-on-success');
  });

  it('falls back to <TARGET_IPS> when all IPs are malicious', () => {
    const cmd = buildBatchLootVerificationCommand('u', 'p', ['a; rm', '$(id)']);
    expect(cmd).toContain('<TARGET_IPS>');
    expect(cmd).not.toContain('rm');
    expect(cmd).not.toContain('$(id)');
  });
});
