import { describe, it, expect, vi } from 'vitest';
import { 
  exportWriteupToHtml, 
  parseMarkdownToHtml, 
  escapeHtml, 
  parseInlineMarkdown,
  downloadWriteupHtml 
} from './writeupHtmlExporter';
import { Machine } from '../types';

const mockMachine: Machine = {
  id: 'htb-devel',
  name: 'Devel',
  ip: '10.10.10.5',
  platform: 'HTB',
  os: 'Windows',
  difficulty: 'Easy',
  status: 'completed',
  userFlag: 'user{mock_user_flag}',
  rootFlag: 'root{mock_root_flag}',
  timeSpentSeconds: 3600,
  tags: ['FTP', 'Anonymous', 'MS11-046'],
  certifications: ['OSCP'],
  openPorts: [21, 80],
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('writeupHtmlExporter', () => {
  describe('escapeHtml & XSS sanitization', () => {
    it('escapes dangerous HTML characters', () => {
      const malicious = '<script>alert("xss")</script> & "quotes" \'single\'';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;quotes&quot;');
      expect(escaped).toContain('&#039;single&#039;');
    });

    it('sanitizes javascript: links and dangerous image src in parseInlineMarkdown', () => {
      const dangerousLink = '[Click Me](javascript:stealCookies())';
      const parsedLink = parseInlineMarkdown(dangerousLink);
      expect(parsedLink).not.toContain('javascript:');

      const safeLink = '[Safe Link](https://htb.guide)';
      const parsedSafe = parseInlineMarkdown(safeLink);
      expect(parsedSafe).toContain('href="https://htb.guide"');
      expect(parsedSafe).toContain('target="_blank"');
    });
  });

  describe('parseMarkdownToHtml', () => {
    it('parses YAML frontmatter into a metadata HUD block', () => {
      const md = `---
title: "Devel Writeup"
os: "Windows"
author: "Specter"
---
# Content`;

      const html = parseMarkdownToHtml(md);
      expect(html).toContain('class="frontmatter-box"');
      expect(html).toContain('<dt>title</dt><dd>&quot;Devel Writeup&quot;</dd>');
      expect(html).toContain('<dt>author</dt><dd>&quot;Specter&quot;</dd>');
      expect(html).toContain('<h1 id="content">Content</h1>');
    });

    it('parses fenced codeblocks with syntax highlighting headers and copy buttons', () => {
      const md = `\`\`\`bash
# Nmap scan
nmap -sC -sV 10.10.10.5
\`\`\``;

      const html = parseMarkdownToHtml(md);
      expect(html).toContain('class="codeblock-container"');
      expect(html).toContain('class="codeblock-lang"');
      expect(html).toContain('bash');
      expect(html).toContain('class="codeblock-copy-btn"');
      expect(html).toContain('nmap -sC -sV 10.10.10.5');
    });

    it('parses markdown tables correctly', () => {
      const md = `| Port | Service | Version |
| --- | --- | --- |
| 21 | FTP | Microsoft ftpd 7.5 |
| 80 | HTTP | Microsoft IIS 7.5 |`;

      const html = parseMarkdownToHtml(md);
      expect(html).toContain('<table');
      expect(html).toContain('<th>Port</th>');
      expect(html).toContain('<th>Service</th>');
      expect(html).toContain('<td>Microsoft ftpd 7.5</td>');
    });

    it('parses blockquotes, lists, and task items', () => {
      const md = `> Important discovery: FTP anonymous login allowed.

- [x] Check anonymous FTP access
- [ ] Upload webshell via PUT
1. First step
2. Second step`;

      const html = parseMarkdownToHtml(md);
      expect(html).toContain('<blockquote>');
      expect(html).toContain('Important discovery: FTP anonymous login allowed.');
      expect(html).toContain('<li class="task-list-item"><input type="checkbox" checked disabled />');
      expect(html).toContain('<li class="task-list-item"><input type="checkbox" disabled />');
      expect(html).toContain('<ol>');
      expect(html).toContain('First step');
    });
  });

  describe('exportWriteupToHtml (Full Standalone Document)', () => {
    it('generates 100% offline, air-gapped document without external CDN links', () => {
      const sampleMarkdown = `# Executive Summary
Target Devel was compromised via Anonymous FTP write permissions leading to IIS webroot code execution.`;

      const fullHtml = exportWriteupToHtml(mockMachine, sampleMarkdown, {
        brandName: 'ZEROBOX TACTICAL',
        author: 'DND',
      });

      // Air-gapped validation: Zero external fonts or CDNs in <head>
      expect(fullHtml).not.toContain('fonts.googleapis.com');
      expect(fullHtml).not.toContain('cdnjs.cloudflare.com');
      expect(fullHtml).not.toContain('cdn.jsdelivr.net');

      // Machine metadata validation
      expect(fullHtml).toContain('<title>Devel — Penetration Testing Writeup</title>');
      expect(fullHtml).toContain('Devel');
      expect(fullHtml).toContain('10.10.10.5');
      expect(fullHtml).toContain('user{mock_user_flag}');
      expect(fullHtml).toContain('root{mock_root_flag}');
      expect(fullHtml).toContain('ZEROBOX TACTICAL');
      expect(fullHtml).toContain('DND');

      // Embedded print optimization validation
      expect(fullHtml).toContain('@media print');
      expect(fullHtml).toContain('page-break-inside: avoid');
      expect(fullHtml).toContain('.action-bar {');
      expect(fullHtml).toContain('display: none !important;');

      // Embedded client-side interactivity validation
      expect(fullHtml).toContain('window.print()');
      expect(fullHtml).toContain('toggleTheme()');
      expect(fullHtml).toContain('copyRawMarkdown');
    });
  });

  describe('downloadWriteupHtml', () => {
    it('creates a download blob and triggers click', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      downloadWriteupHtml(mockMachine, '# Writeup Content');

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

      clickSpy.mockRestore();
    });
  });
});
