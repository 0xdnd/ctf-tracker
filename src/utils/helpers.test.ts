import { describe, it, expect } from 'vitest';
import {
  formatSeconds,
  formatDurationHuman,
  escapeRegex,
  interpolateCommand,
  sanitizeExternalUrl,
} from './helpers';
import { GlobalVariables } from '../types';

describe('helpers utility functions', () => {
  describe('formatSeconds', () => {
    it('formats 0 seconds as 00:00:00', () => {
      expect(formatSeconds(0)).toBe('00:00:00');
    });

    it('formats seconds only correctly', () => {
      expect(formatSeconds(45)).toBe('00:00:45');
    });

    it('formats minutes and seconds correctly', () => {
      expect(formatSeconds(125)).toBe('00:02:05');
    });

    it('formats hours, minutes, and seconds correctly', () => {
      expect(formatSeconds(3665)).toBe('01:01:05');
    });

    it('handles negative or NaN input gracefully', () => {
      expect(formatSeconds(-10)).toBe('00:00:00');
      expect(formatSeconds(NaN)).toBe('00:00:00');
    });
  });

  describe('formatDurationHuman', () => {
    it('returns 0m for 0 or negative seconds', () => {
      expect(formatDurationHuman(0)).toBe('0m');
      expect(formatDurationHuman(-50)).toBe('0m');
    });

    it('formats durations under 1 hour in minutes', () => {
      expect(formatDurationHuman(180)).toBe('3m');
      expect(formatDurationHuman(3599)).toBe('59m');
    });

    it('formats durations with hours and minutes', () => {
      expect(formatDurationHuman(3600)).toBe('1h 0m');
      expect(formatDurationHuman(5400)).toBe('1h 30m');
      expect(formatDurationHuman(7320)).toBe('2h 2m');
    });
  });

  describe('escapeRegex', () => {
    it('escapes special regex metacharacters', () => {
      const special = '.*+?^${}()|[]\\';
      const escaped = escapeRegex(special);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('leaves plain alphanumeric strings unmodified', () => {
      expect(escapeRegex('helloWorld123')).toBe('helloWorld123');
    });
  });

  describe('interpolateCommand', () => {
    const defaultVars: GlobalVariables = {
      targetIp: '192.168.1.50',
      lhost: '10.10.14.2',
      lport: '9001',
      interface: 'tun0',
      customVars: {
        USER: 'admin',
        WORDLIST: '/usr/share/wordlists/rockyou.txt',
      },
    };

    it('interpolates standard curly tokens', () => {
      const template = 'nmap -p- {TARGET_IP} -e {INTERFACE}';
      expect(interpolateCommand(template, defaultVars)).toBe('nmap -p- 192.168.1.50 -e tun0');
    });

    it('interpolates alias tokens {IP} and {TARGET}', () => {
      expect(interpolateCommand('ping {IP}', defaultVars)).toBe('ping 192.168.1.50');
      expect(interpolateCommand('curl {TARGET}:{LPORT}', defaultVars)).toBe('curl 192.168.1.50:9001');
    });

    it('interpolates Obsidian angle bracket tokens', () => {
      const template = 'nc -lvnp <LPORT> on <INTERFACE> against <TARGET_IP>';
      expect(interpolateCommand(template, defaultVars)).toBe('nc -lvnp 9001 on tun0 against 192.168.1.50');
    });

    it('interpolates custom variables with curly and angle brackets', () => {
      const template = 'hydra -l {USER} -P <WORDLIST> {TARGET_IP} ssh';
      expect(interpolateCommand(template, defaultVars)).toBe(
        'hydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.50 ssh'
      );
    });

    it('returns empty string when template is empty', () => {
      expect(interpolateCommand('', defaultVars)).toBe('');
    });

    it('uses fallbacks when variables are missing or empty', () => {
      const emptyVars: GlobalVariables = {
        lhost: '',
        lport: '',
        targetIp: '',
        interface: '',
        customVars: {},
      };
      const template = 'nmap {TARGET_IP} -l {LHOST} -p {LPORT}';
      expect(interpolateCommand(template, emptyVars)).toBe('nmap 10.10.10.X -l 10.10.14.X -p 4444');
    });
  });

  describe('sanitizeExternalUrl', () => {
    it('allows valid http and https URLs', () => {
      expect(sanitizeExternalUrl('https://app.hackthebox.com/machines/1')).toBe(
        'https://app.hackthebox.com/machines/1'
      );
      expect(sanitizeExternalUrl('http://example.com')).toBe('http://example.com');
    });

    it('prepends https:// to bare domains', () => {
      expect(sanitizeExternalUrl('tryhackme.com/room/test')).toBe('https://tryhackme.com/room/test');
    });

    it('blocks dangerous protocols like javascript: and data:', () => {
      expect(sanitizeExternalUrl('javascript:alert(1)')).toBeUndefined();
      expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    });

    it('returns undefined for empty or invalid values', () => {
      expect(sanitizeExternalUrl('')).toBeUndefined();
      expect(sanitizeExternalUrl(undefined)).toBeUndefined();
      expect(sanitizeExternalUrl('not a valid url format')).toBeUndefined();
    });
  });
});
