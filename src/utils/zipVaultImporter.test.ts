import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  isIgnoredVaultPath,
  parseFrontmatterAndBody,
  extractCommands,
  parseObsidianRawItems,
  parseObsidianVaultZip,
} from './zipVaultImporter';

describe('zipVaultImporter', () => {
  describe('isIgnoredVaultPath', () => {
    it('correctly filters out .obsidian configuration paths', () => {
      expect(isIgnoredVaultPath('.obsidian/workspace.json')).toBe(true);
      expect(isIgnoredVaultPath('.obsidian\\app.json')).toBe(true);
      expect(isIgnoredVaultPath('vault/.obsidian/plugins/dataview/main.js')).toBe(true);
      expect(isIgnoredVaultPath('vault\\.obsidian\\workspace.json')).toBe(true);
    });

    it('correctly filters out .git, .trash, __MACOSX, and .DS_Store', () => {
      expect(isIgnoredVaultPath('.git/HEAD')).toBe(true);
      expect(isIgnoredVaultPath('vault\\.git\\config')).toBe(true);
      expect(isIgnoredVaultPath('.trash/deleted-note.md')).toBe(true);
      expect(isIgnoredVaultPath('vault/.trash/old.md')).toBe(true);
      expect(isIgnoredVaultPath('__MACOSX/._note.md')).toBe(true);
      expect(isIgnoredVaultPath('.ds_store')).toBe(true);
      expect(isIgnoredVaultPath('folder/.DS_Store')).toBe(true);
    });

    it('filters out hidden dotfiles and dot-directories at any level', () => {
      expect(isIgnoredVaultPath('.hidden-folder/note.md')).toBe(true);
      expect(isIgnoredVaultPath('notes/.secret/note.md')).toBe(true);
    });

    it('allows valid markdown note paths with both unix and windows slashes', () => {
      expect(isIgnoredVaultPath('01 Information Gathering/SMB/smb-enum.md')).toBe(false);
      expect(isIgnoredVaultPath('02 Exploitation\\Web\\sqli.markdown')).toBe(false);
      expect(isIgnoredVaultPath('./03 PrivEsc/linux.md')).toBe(false);
      expect(isIgnoredVaultPath('single-note.md')).toBe(false);
    });
  });

  describe('parseFrontmatterAndBody', () => {
    it('extracts standard YAML frontmatter and arrays', () => {
      const raw = `---
title: SMB Enumeration
title_en: SMB Enum Guide
category: 01 Information Gathering
tags: [smb, recon, port445]
aliases: [samba-enum, smb-recon]
tools: [netexec, enum4linux]
difficulty: easy
stage: Recon
---
# SMB Enumeration
Body content here.
`;
      const result = parseFrontmatterAndBody(raw);
      expect(result.frontmatter.title).toBe('SMB Enumeration');
      expect(result.frontmatter.title_en).toBe('SMB Enum Guide');
      expect(result.tags).toEqual(['smb', 'recon', 'port445']);
      expect(result.aliases).toEqual(['samba-enum', 'smb-recon']);
      expect(result.tools).toEqual(['netexec', 'enum4linux']);
      expect(result.body).toContain('# SMB Enumeration');
    });

    it('handles UTF-8 BOM gracefully and extracts frontmatter', () => {
      const rawWithBom = `\uFEFF---
title: UTF-8 BOM Note
category: Windows Pentest
tags: [bom-test]
---
# BOM Note
This note had a byte order mark at the start.
`;
      const result = parseFrontmatterAndBody(rawWithBom);
      expect(result.frontmatter.title).toBe('UTF-8 BOM Note');
      expect(result.tags).toContain('bom-test');
    });

    it('harvests inline hashtags from body', () => {
      const raw = `---
title: Inline Tags Test
---
Testing #active-directory and #kerberoasting inside notes.
`;
      const result = parseFrontmatterAndBody(raw);
      expect(result.tags).toContain('active-directory');
      expect(result.tags).toContain('kerberoasting');
    });
  });

  describe('extractCommands', () => {
    it('extracts commands from bash, sh, powershell, and cmd code blocks', () => {
      const markdown = `
Here are commands:

\`\`\`bash
nmap -sC -sV 10.10.10.10
# This is a comment
netexec smb 10.10.10.10 -u '' -p ''
\`\`\`

\`\`\`powershell
Get-ADUser -Filter *
\`\`\`
`;
      const commands = extractCommands(markdown);
      expect(commands).toContain('nmap -sC -sV 10.10.10.10');
      expect(commands).toContain("netexec smb 10.10.10.10 -u '' -p ''");
      expect(commands).toContain('Get-ADUser -Filter *');
      expect(commands.some((c) => c.startsWith('#'))).toBe(false);
    });

    it('handles case-insensitive language tags and trailing spaces in code blocks', () => {
      const markdown = `
\`\`\`BASH   
whoami /priv
\`\`\`

\`\`\`PowerShell 
Invoke-Mimikatz
\`\`\`
`;
      const commands = extractCommands(markdown);
      expect(commands).toContain('whoami /priv');
      expect(commands).toContain('Invoke-Mimikatz');
    });
  });

  describe('parseObsidianRawItems', () => {
    it('strips common wrapper folder and resolves bidirectional wikilinks', async () => {
      const rawItems = [
        {
          path: 'Vault/01 Recon/recon.md',
          getText: async () => `---
title: Recon Target
aliases: [recon-target]
---
Link to [[privesc]] and [[lateral-move#heading]].
`,
        },
        {
          path: 'Vault/02 PrivEsc/privesc.md',
          getText: async () => `---
title: Privilege Escalation
---
Backlink to [[recon-target]].
`,
        },
      ];

      const result = await parseObsidianRawItems(rawItems);
      expect(result.notes.length).toBe(2);

      const reconNote = result.notes.find((n) => n.filename === 'recon');
      const privNote = result.notes.find((n) => n.filename === 'privesc');

      expect(reconNote).toBeDefined();
      expect(privNote).toBeDefined();

      // Common 'Vault/' prefix stripped
      expect(reconNote?.relPath).toBe('01 Recon/recon.md');
      expect(privNote?.relPath).toBe('02 PrivEsc/privesc.md');

      // Bidirectional links
      expect(reconNote?.outgoingWikilinks).toContain(privNote?.id);
      expect(privNote?.backlinks).toContain(reconNote?.id);
    });

    it('handles Windows backslashes in paths and strips common directory', async () => {
      const rawItems = [
        {
          path: 'MyVault\\01 Recon\\smb.md',
          getText: async () => '# SMB',
        },
        {
          path: 'MyVault\\02 Exploit\\rce.md',
          getText: async () => '# RCE',
        },
      ];

      const result = await parseObsidianRawItems(rawItems);
      expect(result.notes.length).toBe(2);
      expect(result.notes[0].relPath).toBe('01 Recon/smb.md');
      expect(result.notes[1].relPath).toBe('02 Exploit/rce.md');
    });
  });

  describe('parseObsidianVaultZip', () => {
    it('unpacks ZIP archive, filters internal files, and returns parsed notes', async () => {
      const zip = new JSZip();
      zip.file('.obsidian/app.json', '{"theme": "dark"}');
      zip.file('.git/config', '[core]');
      zip.file('image.png', 'binary-data');
      zip.file('CPTS/01 Recon/nmap.md', `---
title: Nmap Scanning
category: 01 Information Gathering
tags: [nmap, portscan]
---
\`\`\`bash
nmap -p- -T4 10.10.10.5
\`\`\`
`);
      zip.file('CPTS/02 Exploitation/sqli.md', `---
title: SQL Injection
category: 02 Exploitation
---
See [[nmap]].
`);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const result = await parseObsidianVaultZip(zipBlob);

      expect(result.notes.length).toBe(2);
      expect(result.summary.totalNotes).toBe(2);
      expect(result.summary.totalCommands).toBe(1);

      const nmapNote = result.notes.find((n) => n.filename === 'nmap');
      expect(nmapNote).toBeDefined();
      expect(nmapNote?.title).toBe('Nmap Scanning');
      expect(nmapNote?.commands).toContain('nmap -p- -T4 10.10.10.5');

      const sqliNote = result.notes.find((n) => n.filename === 'sqli');
      expect(sqliNote?.outgoingWikilinks).toContain(nmapNote?.id);
    });
  });
});
