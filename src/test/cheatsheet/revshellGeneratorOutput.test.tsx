import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { availableShellItems } from '../../data/revshellsData';
import { resolveTemplate, contextFromGlobalVars } from '../../utils/variableSubstitution';
import {
  ReverseShellGenerator,
  SHELL_BINARIES,
  isTemplateCompatibleWithShellBinary,
  shellBinaryFamily,
  templateUsesShellToken,
  applyCommandWrapper,
  applyPayloadEncoding,
  type EncodingType,
  type CommandWrapper,
} from '../../components/cheatsheet/ReverseShellGenerator';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const LHOST = '10.10.14.5';
const LPORT = '4444';
const TARGET_IP = '10.10.10.5';

const CTX = contextFromGlobalVars(
  {
    lhost: LHOST,
    lport: LPORT,
    targetIp: '',
    interface: 'tun0',
    domain: 'corp.local',
    dcIp: '10.10.10.9',
    user: 'bob',
    cred: 'pass123',
    wordlist: 'rockyou.txt',
    customVars: {},
  } as any,
  { activeTargetIp: TARGET_IP }
);

const WRAPPERS: CommandWrapper[] = ['none', 'bash -c', 'cmd /c'];

/** Encodings the UI offers for a given interpreter family (mirrors the generator's own filter). */
function encodingsFor(family: 'Linux' | 'Windows'): EncodingType[] {
  const base: EncodingType[] = ['RAW', 'URL', 'BASE64'];
  return family === 'Linux' ? [...base, 'BASH_B64'] : [...base, 'PS_ENC'];
}

/** Decodes a payload back to plain text for every encoding this generator supports, so the
 * underlying substituted values can be asserted on regardless of which encoding was applied. */
function decodePayload(payload: string, encoding: EncodingType): string {
  if (encoding === 'RAW') return payload;
  if (encoding === 'URL') return decodeURIComponent(payload);
  if (encoding === 'BASE64') return decodeURIComponent(escape(atob(payload)));
  if (encoding === 'BASH_B64') {
    const m = payload.match(/^echo "([^"]+)" \| base64 -d \| bash$/);
    if (!m) throw new Error(`unexpected BASH_B64 shape: ${payload}`);
    return decodeURIComponent(escape(atob(m[1])));
  }
  // PS_ENC. `applyPayloadEncoding` falls back to the plain wrapped text (unencoded) when `btoa`
  // can't represent it (e.g. a full-script payload with non-Latin1 characters) — treat that
  // passthrough as already-decoded rather than a shape error.
  const m = payload.match(/^powershell -nop -w hidden -enc (.+)$/);
  if (!m) return payload;
  const utf16 = atob(m[1]);
  let out = '';
  for (let i = 0; i < utf16.length; i += 2) out += utf16[i];
  return out;
}

const RECOGNISED_TOKEN_RE = /\{(ip|port|shell|lhost|lport|target_ip|interface|domain|dc[-_]?ip|user|cred|wordlist)\}/i;

describe('ReverseShellGenerator output: table-driven selection coverage', () => {
  it('matches the selection for every available row, compatible interpreter, wrapper and applicable encoding', () => {
    const failures: string[] = [];
    let cases = 0;

    for (const row of availableShellItems) {
      const compatibleBinaries = SHELL_BINARIES.filter((bin) => isTemplateCompatibleWithShellBinary(row, bin));
      expect(compatibleBinaries.length, `${row.id}: no compatible interpreter at all`).toBeGreaterThan(0);

      for (const bin of compatibleBinaries) {
        const ctx = { ...CTX, shell: bin };
        const resolved = resolveTemplate(row.command, ctx);
        const usesShell = templateUsesShellToken(row);
        const family = shellBinaryFamily(bin);

        for (const wrapper of WRAPPERS) {
          const wrapped = applyCommandWrapper(resolved.text, wrapper);

          for (const encoding of encodingsFor(family)) {
            cases++;
            let decoded: string;
            try {
              decoded = decodePayload(applyPayloadEncoding(wrapped, encoding), encoding);
            } catch (err) {
              failures.push(`${row.id}/${bin}/${wrapper}/${encoding}: failed to decode (${(err as Error).message})`);
              continue;
            }

            if (RECOGNISED_TOKEN_RE.test(decoded)) {
              failures.push(`${row.id}/${bin}/${wrapper}/${encoding}: leftover recognised token in "${decoded}"`);
            }
            if (row.command.includes('{ip}') && !decoded.includes(LHOST)) {
              failures.push(`${row.id}/${bin}/${wrapper}/${encoding}: missing LHOST ${LHOST}`);
            }
            if (row.command.includes('{port}') && !decoded.includes(LPORT)) {
              failures.push(`${row.id}/${bin}/${wrapper}/${encoding}: missing LPORT ${LPORT}`);
            }
            if (usesShell && !decoded.includes(bin)) {
              failures.push(`${row.id}/${bin}/${wrapper}/${encoding}: missing interpreter ${bin}`);
            }
          }
        }
      }
    }

    expect(cases).toBeGreaterThan(500);
    expect(failures, `${failures.length} failing combinations:\n${failures.slice(0, 40).join('\n')}`).toEqual([]);
  });

  it('cmd /c wrapper actually escapes embedded double quotes (regression: raw.replace with an unescaped replacement was a no-op)', () => {
    const wrapped = applyCommandWrapper('echo "hi there"', 'cmd /c');
    expect(wrapped).toBe('cmd.exe /c "echo \\"hi there\\""');
  });
});

describe('ReverseShellGenerator UI: interpreter control and encoding family', () => {
  it('disables the Shell control for a payload whose template has no {shell} slot (e.g. MSFVenom)', () => {
    render(<ReverseShellGenerator />);
    fireEvent.change(screen.getByLabelText('Filter reverse shell payloads'), { target: { value: 'Windows Staged Reverse TCP (x64)' } });
    fireEvent.click(screen.getByRole('button', { name: /^Windows Staged Reverse TCP \(x64\)$/ }));
    expect(screen.getByTestId('revshell-shell-na')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'powershell' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cmd.exe' })).toBeDisabled();
  });

  it('keeps the Shell control enabled for a payload that does use {shell}', () => {
    render(<ReverseShellGenerator />);
    expect(screen.queryByTestId('revshell-shell-na')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'bash' })).not.toBeDisabled();
  });

  it('only offers BASH_B64 for a Linux interpreter and only PS_ENC for a Windows one', () => {
    render(<ReverseShellGenerator />);
    const encodingWrap = () => screen.getByText('Encoding').closest('div') as HTMLElement;

    // Default interpreter is /bin/bash (Linux family).
    expect(within(encodingWrap()).queryByRole('button', { name: 'BASH B64' })).toBeInTheDocument();
    expect(within(encodingWrap()).queryByRole('button', { name: 'PS ENC' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'powershell' }));
    expect(within(encodingWrap()).queryByRole('button', { name: 'PS ENC' })).toBeInTheDocument();
    expect(within(encodingWrap()).queryByRole('button', { name: 'BASH B64' })).not.toBeInTheDocument();
  });

  it('shows a clear Unavailable state for an unavailable row: no code body, no copy', () => {
    render(<ReverseShellGenerator />);
    fireEvent.change(screen.getByLabelText('Filter reverse shell payloads'), { target: { value: 'PowerShell #3 (Base64)' } });
    fireEvent.click(screen.getByRole('button', { name: /PowerShell #3 \(Base64\)/ }));
    expect(screen.getByTestId('revshell-unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy payload/ })).toBeDisabled();
  });
});
