import { describe, it, expect } from 'vitest';
import {
  parseSyntaxQuery,
  matchesSyntaxQuery,
  filterMachinesBySyntax,
  extractWikiLinks,
  buildBacklinksGraph,
} from './syntaxSearchUtils';
import { Machine } from '../types';

describe('syntaxSearchUtils Engine', () => {
  describe('Query Token Parsing', () => {
    it('parses structured modifiers, ports, and negated tokens', () => {
      const q = 'port:88 os:windows diff:medium platform:htb cert:oscp tag:adcs has:flags -linux -tag:legacy "active directory"';
      const parsed = parseSyntaxQuery(q);

      expect(parsed.ports).toEqual([88]);
      expect(parsed.os).toBe('windows');
      expect(parsed.diff).toBe('medium');
      expect(parsed.platform).toBe('htb');
      expect(parsed.cert).toBe('oscp');
      expect(parsed.tags).toEqual(['adcs']);
      expect(parsed.hasConditions).toEqual(['flags']);
      expect(parsed.negatedTokens).toEqual(['linux']);
      expect(parsed.negatedTags).toEqual(['legacy']);
      expect(parsed.freeTextTokens).toContain('active directory');
    });
  });

  describe('Machine Matching & Filtering', () => {
    const machines: Machine[] = [
      {
        id: 'htb-forest',
        name: 'Forest',
        ip: '10.10.10.161',
        os: 'Windows',
        platform: 'HTB',
        difficulty: 'Easy',
        status: 'completed',
        tags: ['Active-Directory', 'Kerberos'],
        certifications: ['OSCP', 'CPTS'],
        openPorts: [88, 389, 445],
        userFlag: 'flag{123}',
        timeSpentSeconds: 3600,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'htb-sau',
        name: 'Sau',
        ip: '10.10.11.224',
        os: 'Linux',
        platform: 'HTB',
        difficulty: 'Easy',
        status: 'foothold',
        tags: ['SSRF', 'Maltrail'],
        certifications: ['OSCP'],
        openPorts: [80, 22],
        timeSpentSeconds: 1800,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    it('filters machines matching port:88 and os:windows', () => {
      const results = filterMachinesBySyntax(machines, 'port:88 os:windows');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('htb-forest');
    });

    it('filters out machines matching negated token -linux', () => {
      const results = filterMachinesBySyntax(machines, '-linux');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('htb-forest');
    });

    it('matches condition has:flags', () => {
      const results = filterMachinesBySyntax(machines, 'has:flags');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('htb-forest');
    });
  });

  describe('WikiLinks & Backlinks Graph', () => {
    it('extracts WikiLinks with sub-sections and aliases', () => {
      const markdown = `
# Attack Plan
First, pivot through [[Forest]] to reach domain controller.
Check out [[Forest#PrivEsc|Elevation Steps]] and consult [[Sau]].
`;
      const links = extractWikiLinks(markdown);
      expect(links.length).toBe(3);

      expect(links[0].target).toBe('Forest');
      expect(links[1].target).toBe('Forest');
      expect(links[1].alias).toBe('Elevation Steps');
      expect(links[1].subSection).toBe('PrivEsc');
      expect(links[2].target).toBe('Sau');
    });

    it('builds bidirectional backlinks graph across documents', () => {
      const docs = [
        { id: 'note-1', content: 'See [[Forest]] and [[Sau]] for details.' },
        { id: 'note-2', content: 'Follow up from [[Forest]].' },
        { id: 'Forest', content: 'Domain controller notes.' },
      ];

      const graph = buildBacklinksGraph(docs);
      expect(graph.forwardLinks['note-1']).toEqual(['Forest', 'Sau']);
      expect(graph.backlinks['Forest']).toEqual(['note-1', 'note-2']);
      expect(graph.backlinks['Sau']).toEqual(['note-1']);
      expect(graph.totalLinksCount).toBe(3);
    });
  });
});
