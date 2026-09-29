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

describe('pivotCommandUtils — Empirical Adversarial & Stress Harness', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Extreme & Boundary Inputs
  // =========================================================================
  describe('Boundary & Extreme Inputs', () => {
    it('handles empty strings for all IP and port parameters without throwing', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-boundary-empty',
        sourceId: '',
        targetId: '',
        type: 'pivot-ssh',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(edge, '', '', '', '');
      expect(result).toBeDefined();
      expect(result.listenerCommand).toBe('ssh -N -D 1080 root@10.10.10.X');
      expect(result.proxychainsSnippet).toBe('socks5 127.0.0.1 1080');
      expect(result.verificationCommand).toBe('proxychains4 curl -s -I http://10.10.10.Y');
      expect(result.quickCopyText).toBe(result.listenerCommand);
    });

    it('handles whitespace-only sourceIp and targetIp parameters by trimming and falling back', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-boundary-whitespace',
        sourceId: '',
        targetId: '',
        type: 'pivot-chisel',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(edge, '   ', '   ', '   ', '   ');
      expect(result).toBeDefined();
      expect(result.listenerCommand).toBe('chisel server -p 8000 --reverse');
      expect(result.clientCommand).toBe('chisel client 10.10.14.X:8000 R:1080:socks');
      expect(result.proxychainsSnippet).toBe('socks5 127.0.0.1 1080');
      expect(result.verificationCommand).toBe('proxychains4 curl -s -I http://10.10.10.Y');
    });

    it('documents edge.sourceId / edge.targetId whitespace pitfall (untrimmed fallback)', () => {
      // When edge.sourceId or edge.targetId themselves are whitespace strings:
      // (edge.sourceId || '10.10.10.X') evaluates to '   ' because non-empty strings are truthy.
      const edgeWithWhitespaceIds: AttackGraphEdge = {
        id: 'edge-whitespace-ids',
        sourceId: '   ',
        targetId: '   ',
        type: 'pivot-chisel',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(edgeWithWhitespaceIds, '', '', '', '');
      // Observed behavior: edge.targetId is untrimmed, producing http://
      expect(result.verificationCommand).toBe('proxychains4 curl -s -I http://   ');
    });

    it('handles null and undefined runtime values without throwing', () => {
      const edge = {
        id: 'edge-nulls',
        type: 'pivot-ssh' as AttackEdgeType,
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      } as unknown as AttackGraphEdge;

      const result = generatePivotCommands(
        edge,
        undefined as unknown as string,
        null as unknown as string,
        undefined as unknown as string,
        null as unknown as string,
        undefined
      );

      expect(result).toBeDefined();
      expect(result.listenerCommand).toContain('root@10.10.10.X');
      expect(result.proxychainsSnippet).toBe('socks5 127.0.0.1 1080');
      expect(result.verificationCommand).toContain('http://10.10.10.Y');
    });

    it('handles port boundaries (0, 65535, out-of-range, and negative ports)', () => {
      // Port 0 in JavaScript is falsy: edge.port ? String(edge.port) : fallback
      const edgePort0: AttackGraphEdge = {
        id: 'edge-port-0',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        type: 'pivot-socks5',
        status: 'potential',
        port: 0,
        createdAt: '2026-09-26T20:00:00Z',
      };

      // When edge.port is 0, it falls back to lport (or 1080) because 0 is falsy
      const resPort0 = generatePivotCommands(edgePort0, '10.10.10.1', '10.10.10.2', '10.10.14.5', '9050');
      expect(resPort0.proxychainsSnippet).toBe('socks5 127.0.0.1 9050');

      // Port 65535 (max valid TCP port)
      const edgePort65535: AttackGraphEdge = {
        id: 'edge-port-65535',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        type: 'pivot-socks5',
        status: 'potential',
        port: 65535,
        createdAt: '2026-09-26T20:00:00Z',
      };
      const resPort65535 = generatePivotCommands(edgePort65535, '10.10.10.1', '10.10.10.2', '10.10.14.5', '1080');
      expect(resPort65535.proxychainsSnippet).toBe('socks5 127.0.0.1 65535');

      // Negative port (-1)
      const edgePortNeg: AttackGraphEdge = {
        id: 'edge-port-neg',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        type: 'pivot-socks5',
        status: 'potential',
        port: -1,
        createdAt: '2026-09-26T20:00:00Z',
      };
      const resPortNeg = generatePivotCommands(edgePortNeg, '10.10.10.1', '10.10.10.2', '10.10.14.5', '1080');
      expect(resPortNeg.proxychainsSnippet).toBe('socks5 127.0.0.1 -1');
    });

    it('handles IPv6 addresses for all command templates', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-ipv6',
        sourceId: 'node-ipv6-src',
        targetId: 'node-ipv6-tgt',
        type: 'pivot-ssh',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const resSsh = generatePivotCommands(
        edge,
        '2001:db8::1',
        '2001:db8::2',
        'fe80::1',
        '1080'
      );
      expect(resSsh.listenerCommand).toBe('ssh -N -D 1080 root@2001:db8::1');
      expect(resSsh.verificationCommand).toBe('proxychains4 curl -s -I http://2001:db8::2');

      // Chisel with IPv6
      const edgeChisel: AttackGraphEdge = { ...edge, type: 'pivot-chisel' };
      const resChisel = generatePivotCommands(
        edgeChisel,
        '2001:db8::1',
        '2001:db8::2',
        'fe80::1',
        '8080'
      );
      expect(resChisel.clientCommand).toBe('chisel client fe80::1:8000 R:8080:socks');

      // Ligolo with IPv6
      const edgeLigolo: AttackGraphEdge = { ...edge, type: 'pivot-ligolo' };
      const resLigolo = generatePivotCommands(
        edgeLigolo,
        '2001:db8::1',
        '2001:db8::2',
        'fe80::1',
        '11601'
      );
      expect(resLigolo.proxychainsSnippet).toContain('2001:db8::2/32');
    });

    it('handles unknown/unrecognized edge type via default fallback', () => {
      const edge = {
        id: 'edge-unknown-type',
        sourceId: 'src-unknown',
        targetId: 'tgt-unknown',
        type: 'custom-unsupported-c2' as AttackEdgeType,
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      } as AttackGraphEdge;

      const result = generatePivotCommands(edge, '10.10.10.10', '10.10.10.20', '10.10.14.5', '1080');
      expect(result).toBeDefined();
      expect(result.listenerCommand).toBe('# Custom Pivot / Lateral Movement: custom-unsupported-c2');
      expect(result.clientCommand).toBe('# Target: 10.10.10.20');
      expect(result.proxychainsSnippet).toBe('socks5 127.0.0.1 1080');
      expect(result.verificationCommand).toBe('ping -c 2 10.10.10.20');
      expect(result.quickCopyText).toBe('ping -c 2 10.10.10.20');
    });

    it('handles empty string options by falling back to default credentials', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-empty-opts',
        sourceId: 'src-cred',
        targetId: 'tgt-cred',
        type: 'lateral-cred-reuse',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      // Passing empty strings in options: options?.user || 'Administrator'
      const result = generatePivotCommands(edge, '10.10.10.10', '10.10.10.20', '10.10.14.5', '1080', {
        user: '',
        domain: '',
        hash: '',
        password: '',
      });

      expect(result.listenerCommand).toBe("netexec smb 10.10.10.20 -u 'Administrator' -p 'Password123!'");
    });
  });

  // =========================================================================
  // 2. Shell Metacharacters & Injection Safety
  // =========================================================================
  describe('Shell Metacharacters & Injection Safety in Generated Templates', () => {
    it('observes single quote injection behavior in netexec and secretsdump templates', () => {
      const maliciousUser = "admin' || cat /etc/passwd #";
      const maliciousPass = "p'$(reboot)'";
      const edgeCred: AttackGraphEdge = {
        id: 'edge-inj-1',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        type: 'lateral-cred-reuse',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const resultCred = generatePivotCommands(
        edgeCred,
        '10.10.10.1',
        '10.10.10.2',
        '10.10.14.5',
        '1080',
        { user: maliciousUser, password: maliciousPass }
      );

      // The generator performs string template interpolation (not executing commands itself)
      expect(resultCred.listenerCommand).toBe(
        `netexec smb 10.10.10.2 -u 'admin' || cat /etc/passwd #' -p 'p'$(reboot)''`
      );

      // In domain-admin-path
      const edgeDa: AttackGraphEdge = { ...edgeCred, type: 'domain-admin-path' };
      const resultDa = generatePivotCommands(
        edgeDa,
        '10.10.10.1',
        '10.10.10.2',
        '10.10.14.5',
        '1080',
        { user: maliciousUser, password: maliciousPass, domain: "corp.local'; id" }
      );

      expect(resultDa.listenerCommand).toContain(maliciousUser);
      expect(resultDa.listenerCommand).toContain(maliciousPass);
    });

    it('observes command substitution and newline characters in targetIp and sourceIp', () => {
      const payloadIp = '10.10.10.10\nrm -rf /';
      const edge: AttackGraphEdge = {
        id: 'edge-inj-ip',
        sourceId: payloadIp,
        targetId: payloadIp,
        type: 'pivot-ssh',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(edge, payloadIp, payloadIp, '10.10.14.5', '1080');
      // Template interpolates verbatim without crashing
      expect(result.listenerCommand).toContain(payloadIp);
      expect(result.verificationCommand).toContain(payloadIp);
    });

    it('observes evil-winrm unquoted user parameter behavior', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-pth',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        type: 'lateral-pth-winrm',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const userWithSpaces = 'admin user';
      const result = generatePivotCommands(edge, '10.10.10.1', '10.10.10.2', '10.10.14.5', '1080', {
        user: userWithSpaces,
      });

      // evil-winrm -i 10.10.10.2 -u admin user -H HASH
      expect(result.listenerCommand).toBe('evil-winrm -i 10.10.10.2 -u admin user -H HASH');
    });

    it('verifies Ligolo-ng TUN script includes hardcoded $(whoami) subshell call', () => {
      const edge: AttackGraphEdge = {
        id: 'edge-ligolo-whoami',
        sourceId: 'src-1',
        targetId: '10.200.1.5',
        type: 'pivot-ligolo',
        status: 'potential',
        createdAt: '2026-09-26T20:00:00Z',
      };

      const result = generatePivotCommands(edge, '10.10.10.1', '10.200.1.5', '10.10.14.5', '11601');
      // Notice: $(whoami) is intentionally present in the static helper command for TUN interface creation
      expect(result.proxychainsSnippet).toContain('sudo ip tuntap add user $(whoami) mode tun ligolo');
    });
  });

  // =========================================================================
  // 3. Audio Feedback & Clipboard Headless/JSDOM Verification
  // =========================================================================
  describe('Audio Feedback & Clipboard Headless/JSDOM Robustness', () => {
    it('does not throw when window.AudioContext is completely undefined (headless node/jsdom)', async () => {
      const originalAudioContext = window.AudioContext;
      // @ts-expect-error simulating headless environment
      delete window.AudioContext;
      // @ts-expect-error simulating headless environment
      delete window.webkitAudioContext;

      vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);

      await expect(copyPivotCommandWithFeedback('ssh -N -D 1080 root@10.10.10.1', true)).resolves.toBe(true);

      // Restore
      window.AudioContext = originalAudioContext;
    });

    it('catches and suppresses errors if AudioContext constructor throws (e.g. autoplay blocked)', async () => {
      const originalAudioContext = window.AudioContext;
      window.AudioContext = class {
        constructor() {
          throw new Error('NotAllowedError: The play method is not allowed by the user agent');
        }
      } as unknown as typeof AudioContext;

      vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);

      // Must not throw despite AudioContext rejecting
      await expect(copyPivotCommandWithFeedback('chisel server -p 8000', true)).resolves.toBe(true);

      window.AudioContext = originalAudioContext;
    });

    it('catches and suppresses errors if playCyberSound itself throws an uncaught error', async () => {
      vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
      vi.spyOn(helpers, 'playCyberSound').mockImplementation(() => {
        throw new Error('Unexpected WebAudio Crash');
      });

      await expect(copyPivotCommandWithFeedback('ligolo-proxy -selfcert', true)).resolves.toBe(true);
    });

    it('returns false and does not play sound when clipboard copy returns false', async () => {
      vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(false);
      const soundSpy = vi.spyOn(helpers, 'playCyberSound').mockImplementation(() => {});

      const result = await copyPivotCommandWithFeedback('test command', true);
      expect(result).toBe(false);
      expect(soundSpy).not.toHaveBeenCalled();
    });

    it('handles empty text without crashing or playing sound', async () => {
      const soundSpy = vi.spyOn(helpers, 'playCyberSound').mockImplementation(() => {});

      const result = await copyPivotCommandWithFeedback('', true);
      expect(result).toBe(false);
      expect(soundSpy).not.toHaveBeenCalled();
    });

    it('does not attempt audio playback when soundEnabled is false even on success', async () => {
      vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
      const soundSpy = vi.spyOn(helpers, 'playCyberSound').mockImplementation(() => {});

      const result = await copyPivotCommandWithFeedback('valid-cmd', false);
      expect(result).toBe(true);
      expect(soundSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. Classification & Metadata Helpers
  // =========================================================================
  describe('Classification & Metadata Helper Robustness', () => {
    it('returns fallback gracefully for invalid or undefined edge types in getPivotTypeLabel', () => {
      expect(getPivotTypeLabel('pivot-ssh')).toBe('SSH Dynamic Tunnel');
      // @ts-expect-error testing invalid type
      expect(getPivotTypeLabel('invalid-type')).toBe('invalid-type');
      // @ts-expect-error testing undefined type
      expect(getPivotTypeLabel(undefined)).toBeUndefined();
    });

    it('returns empty string for invalid or undefined edge types in getPivotTypeDescription', () => {
      expect(getPivotTypeDescription('pivot-ssh')).toContain('Dynamic SOCKS');
      // @ts-expect-error testing invalid type
      expect(getPivotTypeDescription('nonexistent')).toBe('');
      // @ts-expect-error testing undefined type
      expect(getPivotTypeDescription(undefined)).toBe('');
    });

    it('returns default color #38BDF8 for unknown edge types in getPivotTypeColor', () => {
      expect(getPivotTypeColor('pivot-ssh')).toBe('#10B981');
      // @ts-expect-error testing invalid type
      expect(getPivotTypeColor('unknown-edge')).toBe('#38BDF8');
      // @ts-expect-error testing undefined type
      expect(getPivotTypeColor(undefined)).toBe('#38BDF8');
    });

    it('correctly formats proxychains4 configuration with string, number, and edge ports', () => {
      expect(formatProxychainsConf()).toBe('[ProxyList]\nsocks5 127.0.0.1 1080');
      expect(formatProxychainsConf(1080)).toBe('[ProxyList]\nsocks5 127.0.0.1 1080');
      expect(formatProxychainsConf(0)).toBe('[ProxyList]\nsocks5 127.0.0.1 0');
      expect(formatProxychainsConf('9050')).toBe('[ProxyList]\nsocks5 127.0.0.1 9050');
      expect(formatProxychainsConf(-1)).toBe('[ProxyList]\nsocks5 127.0.0.1 -1');
    });

    it('handles category checks safely with invalid or undefined edge types', () => {
      // @ts-expect-error testing invalid type
      expect(isTunnelEdge('unknown')).toBe(false);
      // @ts-expect-error testing undefined type
      expect(isTunnelEdge(undefined)).toBe(false);

      // @ts-expect-error testing invalid type
      expect(isAdTrustEdge('unknown')).toBe(false);
      // @ts-expect-error testing undefined type
      expect(isAdTrustEdge(undefined)).toBe(false);

      // @ts-expect-error testing invalid type
      expect(isLateralEdge('unknown')).toBe(false);
      // @ts-expect-error testing undefined type
      expect(isLateralEdge(undefined)).toBe(false);
    });
  });

  // =========================================================================
  // 5. Stress & Fuzzing Invariant Harness
  // =========================================================================
  describe('High-Volume Invariant Fuzzing Harness', () => {
    it('executes 1,000 randomized edge inputs with zero exceptions and consistent structure', () => {
      const edgeTypes: AttackEdgeType[] = [
        'pivot-ssh',
        'pivot-chisel',
        'pivot-ligolo',
        'pivot-socks5',
        'ad-trust-bidirectional',
        'ad-trust-parent-child',
        'lateral-cred-reuse',
        'lateral-pth-winrm',
        'domain-admin-path',
        'custom-invalid' as AttackEdgeType,
      ];

      const fuzzedStrings = [
        '',
        '   ',
        '10.10.10.1',
        '2001:db8::1',
        'fe80::1%eth0',
        '0.0.0.0',
        '255.255.255.255',
        "admin'--",
        'admin"; rm -rf /;',
        'p@$$\'w0rd!"#$%\'()',
        '$(whoami)',
        '`reboot`',
        '\x00\x01\x02\x7f',
        '🔥💀⚔️',
        'A'.repeat(5000),
      ];

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const type = edgeTypes[i % edgeTypes.length];
        const src = fuzzedStrings[i % fuzzedStrings.length];
        const tgt = fuzzedStrings[(i + 1) % fuzzedStrings.length];
        const lhost = fuzzedStrings[(i + 2) % fuzzedStrings.length];
        const lport = String((i * 17) % 65536);

        const edge: AttackGraphEdge = {
          id: `fuzz-edge-${i}`,
          sourceId: `src-${i}`,
          targetId: `tgt-${i}`,
          type,
          status: i % 2 === 0 ? 'compromised' : 'potential',
          port: i % 5 === 0 ? undefined : (i % 65536),
          createdAt: new Date().toISOString(),
        };

        const result = generatePivotCommands(edge, src, tgt, lhost, lport, {
          user: fuzzedStrings[(i + 3) % fuzzedStrings.length],
          domain: fuzzedStrings[(i + 4) % fuzzedStrings.length],
          password: fuzzedStrings[(i + 5) % fuzzedStrings.length],
          hash: fuzzedStrings[(i + 6) % fuzzedStrings.length],
        });

        // Invariant checks
        expect(typeof result.listenerCommand).toBe('string');
        expect(typeof result.clientCommand).toBe('string');
        expect(typeof result.proxychainsSnippet).toBe('string');
        expect(typeof result.verificationCommand).toBe('string');
        expect(typeof result.quickCopyText).toBe('string');
      }

      const elapsed = performance.now() - startTime;
      // Invariant: 1,000 iterations must complete smoothly under 1,000ms
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
