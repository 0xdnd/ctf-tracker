// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const req = createRequire(import.meta.url);
const { normTag, tagKey, isJunkTag, isGenericTag, createTagCleaner, HEAD_GENERIC_TAGS, TAG_ALIASES } = req('../../../scripts/lib/tags.cjs');
const { getModel } = req('../../../scripts/lib/content-model.cjs');
const { GROUPS, matchesMachine, matchesTag } = req('../../../scripts/lib/techniques.cjs');

type Row = { tags?: string[] };

describe('tag junk and generic words', () => {
  it('drops fragments, stray quotes, bare numbers and years', () => {
    for (const t of ['-', '"Off', 'slash"-vulnerability', '22204-and-CVE', '2018', '9276', '0492', 'Identification-and', 'and-HTTP-requests', 'based-fuzzing', "COR's-(Cross"]) {
      expect(isJunkTag(t), t).toBe(true);
    }
  });
  it('drops split phrase fragments that the importer left behind', () => {
    for (const t of ['Side-Template-Injection', 'Reverse-engineering-64', 'Cracking-password', 'protected-ZIP-files', 'SILENTTRINITY-post', 'Exploiting-Union', 'Exploiting-phuip', 'fpizdam', 'mpart', 'execute-files', 'binaries-with-ret2libc']) {
      expect(isJunkTag(t), t).toBe(true);
    }
    for (const t of ['Reverse-Engineering', 'Exploiting-SSTI', 'SQL-Injection', 'Cracking-WPA-handshakes']) expect(isJunkTag(t), t).toBe(false);
  });
  it('keeps real short tags and full CVE ids', () => {
    for (const t of ['C2', 'S3', 'jq', 'x86', 'CVE-2021-22204', '7-Zip Symlink', 'Pass-the-Hash', 'Log4j', 'Anonymous-/-Guest']) {
      expect(isJunkTag(t), t).toBe(false);
      expect(isGenericTag(t), t).toBe(false);
    }
  });
  it('drops generic words including hyphen and case variants', () => {
    for (const t of ['CTF', 'HTB', 'THM', 'techniques', 'vulnerabilities', 'Security', 'Tier 0', 'Tier 7', 'Starting Point', 'starting-point', 'Web', 'privesc']) {
      expect(isGenericTag(t), t).toBe(true);
    }
  });
  it('keeps the pre-extension generic set for head output', () => {
    expect(HEAD_GENERIC_TAGS.has('ctf')).toBe(true);
    expect(HEAD_GENERIC_TAGS.has('htb')).toBe(false);
    expect(HEAD_GENERIC_TAGS.has('security')).toBe(false);
  });
});

describe('tag cleaner', () => {
  const rows = [
    ['Command-Injection', 'Web', 'CTF', 'nmap'],
    ['Command-Injection', 'nmap'],
    ['Command Injection', 'Nmap', 'Nmap'],
    ['command-injection', 'nmap', 'Active Directory'],
    ['ActiveDirectory', 'SUID'],
    ['suid', '-', '2018', 'Starting Point', 'jq', 'Privesc', 'privesc'],
  ];
  const c = createTagCleaner(rows);
  it('merges spelling variants into the most frequent spelling and dedupes', () => {
    expect(c.labels(['Command Injection', 'command-injection', 'Command-Injection'])).toEqual(['Command-Injection']);
    expect(c.labels(['ActiveDirectory', 'Active Directory'])).toEqual(['Active Directory']);
    expect(c.labels(['Nmap', 'nmap'])).toEqual(['nmap']);
  });
  it('applies the acronym override', () => {
    expect(c.labels(['suid'])).toEqual(['SUID']);
  });
  it('drops junk and generic tags and keeps source order', () => {
    expect(c.labels(['-', 'jq', '2018', 'CTF', 'Privesc', 'SUID'])).toEqual(['jq', 'SUID']);
  });
  it('returns an empty list, never a placeholder, when nothing is left', () => {
    expect(c.labels(['CTF', 'HTB', '-'])).toEqual([]);
    expect(c.labels(undefined)).toEqual([]);
  });
  it('keeps the source spellings behind each label', () => {
    expect(c.clean(['Command Injection', 'command-injection'])[0].raws).toEqual(['Command Injection', 'command-injection']);
  });
});

describe('real catalog data', () => {
  const model = getModel();
  const machines = model.machines as Row[];
  const c = createTagCleaner(machines.map((m) => m.tags));
  it('never adds a tag that is not in the source row, and leaves no variants, junk or generic words', () => {
    for (const m of machines) {
      const keys = new Set((m.tags || []).flatMap((t) => [tagKey(t), TAG_ALIASES[tagKey(t)]].filter(Boolean)));
      const seen = new Set<string>();
      for (const l of c.labels(m.tags) as string[]) {
        expect(keys.has(tagKey(l)), l).toBe(true);
        expect(isJunkTag(l) || isGenericTag(l), l).toBe(false);
        expect(seen.has(tagKey(l)), l).toBe(false);
        seen.add(tagKey(l));
      }
    }
  });
  it('shows exactly one spelling per tag across the whole catalog', () => {
    const spell = new Map<string, Set<string>>();
    for (const m of machines) {
      for (const l of c.labels(m.tags) as string[]) {
        if (!spell.has(tagKey(l))) spell.set(tagKey(l), new Set());
        spell.get(tagKey(l))!.add(l);
      }
    }
    expect([...spell.values()].filter((s) => s.size > 1)).toEqual([]);
  });
  it('hub membership is decided on raw tags, so cleaning cannot move a machine', () => {
    const g = GROUPS.find((x: { slug: string }) => x.slug === 'command-injection');
    expect(matchesTag(g, 'Command-Injection')).toBe(true);
    expect(matchesTag(g, 'Command Injection')).toBe(true);
    expect(matchesMachine(g, { slug: 'x', tags: ['Command-Injection'] })).toBe(true);
    expect(normTag('Command-Injection')).toBe('command injection');
  });
});
