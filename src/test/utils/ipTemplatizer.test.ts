import { describe, expect, it } from 'vitest';
import {
  analyzeIps,
  applyIpTemplatize,
  defaultIpSelection,
  originalIpsFromSelection,
  recordOriginalIps,
  type IpChange,
} from '../../utils/ipTemplatizer';

const byIp = (changes: IpChange[], ip: string) => changes.find((c) => c.ip === ip);
const templatize = (md: string, opts = {}) => {
  const analysis = analyzeIps(md, opts);
  return applyIpTemplatize(md, analysis, defaultIpSelection(analysis.changes));
};

describe('ipTemplatizer — matching', () => {
  it('rejects non-IP dotted strings', () => {
    const md = '```\n1.2.3.4.5\nv1.2.3.4\nversion 1.2.3.4\nfoo1.2.3.4\n256.1.1.1\n01.2.3.4\n1.2.3.4abc\n```';
    expect(analyzeIps(md).changes).toEqual([]);
  });

  it('accepts an IP followed by a sentence period', () => {
    const { changes } = analyzeIps('Box is at `x` and 10.129.2.3.');
    expect(changes.map((c) => c.ip)).toEqual(['10.129.2.3']);
  });

  it('keeps loopback, unspecified, broadcast, multicast and CIDR', () => {
    const md = '```\ncurl 127.0.0.1\nnc -lvnp 4444 -s 0.0.0.0\nping 10.10.10.255\nping 239.1.1.1\nnmap 10.10.10.0/24\nnmap 10.129.0.5/16\nmask 255.255.255.0\n```';
    const { changes, kept } = analyzeIps(md);
    expect(changes).toEqual([]);
    expect(kept.map((k) => [k.ip, k.reason])).toEqual([
      ['127.0.0.1', 'loopback'],
      ['0.0.0.0', 'unspecified address'],
      ['10.10.10.255', 'broadcast'],
      ['239.1.1.1', 'multicast / reserved'],
      ['10.10.10.0', 'CIDR range'],
      ['10.129.0.5', 'CIDR range'],
      ['255.255.255.0', 'multicast / reserved'],
    ]);
  });

  it('keeps 4-part versions after ==, word- and package-manager = / @', () => {
    const md =
      '```\npip install x==1.2.3.4\nwget pkg-1.2.3.5.tar.gz\nnpm i lib@1.2.3.6\napt install tool=1.2.3.7\n```';
    const { changes, kept } = analyzeIps(md);
    expect(changes).toEqual([]);
    expect(kept.map((k) => [k.ip, k.reason])).toEqual([
      ['1.2.3.4', 'version string'],
      ['1.2.3.5', 'version string'],
      ['1.2.3.6', 'version string'],
      ['1.2.3.7', 'version string'],
    ]);
  });

  it('still replaces IPs after = and @ outside package-manager lines', () => {
    const out = templatize('```\nssh user@10.129.4.4\ncurl http://x/?host=10.129.4.4\n```');
    expect(out).toBe('```\nssh user@{TARGET}\ncurl http://x/?host={TARGET}\n```');
  });

  it('keeps network addresses and ranges', () => {
    const md = '```\nnmap 10.129.4.0\nnmap 10.129.4.1-254\nnmap 10.129.5.1-10.129.5.9\n```';
    const { changes, kept } = analyzeIps(md);
    expect(changes).toEqual([]);
    expect(kept.map((k) => [k.ip, k.reason])).toEqual([
      ['10.129.4.0', 'network address'],
      ['10.129.4.1', 'address range'],
      ['10.129.5.1', 'address range'],
      ['10.129.5.9', 'address range'],
    ]);
  });

  it('never touches frontmatter', () => {
    const md = '---\nip: 10.10.10.5\n---\n```\nnmap 10.10.10.5\n```';
    const out = templatize(md);
    expect(out).toBe('---\nip: 10.10.10.5\n---\n```\nnmap {TARGET}\n```');
  });
});

describe('ipTemplatizer — LHOST', () => {
  it('matches the configured LHOST anywhere', () => {
    const { changes } = analyzeIps('my box is 192.168.45.7', { lhost: '192.168.45.7' });
    expect(changes[0]).toMatchObject({ ipClass: 'lhost', role: 'LHOST', defaultOn: true });
  });

  it('detects explicit LHOST options', () => {
    for (const line of ['LHOST=172.16.5.5', 'set LHOST 172.16.5.5', 'tool -lhost 172.16.5.5', 'x --lhost=172.16.5.5', "lhost: '172.16.5.5'"]) {
      const { changes } = analyzeIps(`\`\`\`\n${line}\n\`\`\``);
      expect(changes[0], line).toMatchObject({ ip: '172.16.5.5', ipClass: 'lhost', defaultOn: true });
    }
  });

  it('treats HTB VPN ranges 10.10.14-16 as LHOST, even in prose', () => {
    const md = 'vpn 10.10.14.2 and 10.10.15.9 and 10.10.16.30, not 10.10.17.1';
    const { changes } = analyzeIps(md);
    expect(byIp(changes, '10.10.14.2')?.ipClass).toBe('lhost');
    expect(byIp(changes, '10.10.15.9')?.ipClass).toBe('lhost');
    expect(byIp(changes, '10.10.16.30')?.ipClass).toBe('lhost');
    expect(byIp(changes, '10.10.17.1')?.ipClass).toBe('unknown');
  });
});

describe('ipTemplatizer — TARGET', () => {
  it('replaces a single command IP, host only, keeping ports and URL paths', () => {
    const md = [
      '```bash',
      'nmap -sC -sV 10.129.4.20',
      'curl http://10.129.4.20:8080/admin?x=1',
      'smbclient //10.129.4.20/share',
      'ssh bob@10.129.4.20 -p 2222',
      '```',
    ].join('\n');
    expect(templatize(md)).toBe(
      [
        '```bash',
        'nmap -sC -sV {TARGET}',
        'curl http://{TARGET}:8080/admin?x=1',
        'smbclient //{TARGET}/share',
        'ssh bob@{TARGET} -p 2222',
        '```',
      ].join('\n')
    );
  });

  it('treats any IP in code as a candidate, including private ranges', () => {
    const { changes } = analyzeIps('Run `ping 192.168.1.50` first.');
    expect(changes[0]).toMatchObject({ ipClass: 'target', defaultOn: true });
  });

  it('uses commands[] entries as candidates too', () => {
    const { changes } = analyzeIps('target 172.20.0.3 here', { commands: ['nmap 172.20.0.3'] });
    expect(changes[0]).toMatchObject({ ipClass: 'target', defaultOn: true });
  });

  it('marks prose-only IPs unknown and off', () => {
    const { changes } = analyzeIps('The DC lives at 172.16.1.10 in this lab.');
    expect(changes[0]).toMatchObject({ ipClass: 'unknown', defaultOn: false, role: 'TARGET' });
    expect(templatize('The DC lives at 172.16.1.10 in this lab.')).toBe('The DC lives at 172.16.1.10 in this lab.');
  });

  it('prefers the linked target and makes other candidates ambiguous', () => {
    const md = '```\nnmap 10.129.1.1\nnmap 10.129.1.1\nnmap 10.129.9.9\n```';
    const { changes } = analyzeIps(md, { knownTargetIps: ['10.129.9.9'] });
    expect(byIp(changes, '10.129.9.9')).toMatchObject({ ipClass: 'target', defaultOn: true });
    expect(byIp(changes, '10.129.1.1')).toMatchObject({ ipClass: 'ambiguous', defaultOn: false });
  });

  it('picks the single most frequent candidate when several are used', () => {
    const md = '```\nnmap 10.0.0.5\ncurl 10.0.0.5\nping 10.0.0.6\n```';
    const { changes } = analyzeIps(md);
    expect(byIp(changes, '10.0.0.5')).toMatchObject({ ipClass: 'target', defaultOn: true });
    expect(byIp(changes, '10.0.0.6')).toMatchObject({ ipClass: 'ambiguous', defaultOn: false });
  });

  it('marks every candidate ambiguous on a frequency tie', () => {
    const md = '```\nnmap 10.0.0.5\nping 10.0.0.6\n```';
    const { changes } = analyzeIps(md);
    expect(changes.every((c) => c.ipClass === 'ambiguous' && !c.defaultOn)).toBe(true);
    expect(templatize(md)).toBe(md);
  });

  it('mixes LHOST and TARGET in one command', () => {
    const md = '`exploit.py -t 10.129.3.3 LHOST=10.10.14.8 LPORT=9001`';
    expect(templatize(md)).toBe('`exploit.py -t {TARGET} LHOST={LHOST} LPORT=9001`');
  });
});

describe('ipTemplatizer — apply', () => {
  it('leaves existing placeholders untouched and is idempotent', () => {
    const md = '```\nnmap {TARGET}\ncurl http://10.129.7.7/ -H "Host: {LHOST}"\n```';
    const once = templatize(md);
    expect(once).toBe('```\nnmap {TARGET}\ncurl http://{TARGET}/ -H "Host: {LHOST}"\n```');
    expect(templatize(once)).toBe(once);
  });

  it('honours role overrides and deselection', () => {
    const md = '```\nnmap 10.0.0.5\ncurl 10.0.0.5\nping 10.0.0.6\n```';
    const analysis = analyzeIps(md);
    const out = applyIpTemplatize(md, analysis, { '10.0.0.5': false, '10.0.0.6': 'LHOST' });
    expect(out).toBe('```\nnmap 10.0.0.5\ncurl 10.0.0.5\nping {LHOST}\n```');
  });

  it('skips stale positions instead of corrupting text', () => {
    const md = '`nmap 10.129.1.1`';
    const analysis = analyzeIps(md);
    expect(applyIpTemplatize('`nmap 10.129.1.2`', analysis, { '10.129.1.1': 'TARGET' })).toBe('`nmap 10.129.1.2`');
  });

  it('records originals as flat frontmatter keys, merging on re-run', () => {
    const originals = originalIpsFromSelection({ '10.129.1.1': 'TARGET', '10.10.14.2': 'LHOST', '1.1.1.1': false });
    expect(originals).toEqual({ TARGET: ['10.129.1.1'], LHOST: ['10.10.14.2'] });
    const created = recordOriginalIps('# Note\nbody', originals);
    expect(created).toBe('---\noriginal_ips_target: 10.129.1.1\noriginal_ips_lhost: 10.10.14.2\n---\n# Note\nbody');
    const merged = recordOriginalIps(
      '---\ntitle: X\noriginal_ips_target: 10.129.0.9\n---\nbody',
      { TARGET: ['10.129.1.1'], LHOST: [] }
    );
    expect(merged).toBe('---\ntitle: X\noriginal_ips_target: 10.129.0.9, 10.129.1.1\n---\nbody');
    // The recorded originals are inside frontmatter and are never re-offered.
    expect(analyzeIps(created).changes).toEqual([]);
  });
});
