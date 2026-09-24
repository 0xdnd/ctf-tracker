import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  isSafeRelativePath,
  isIgnoredVaultPath,
  parseObsidianVaultZip,
  parseObsidianRawItems,
  parseFrontmatterAndBody,
  extractCommands,
} from '../../utils/zipVaultImporter';
import { parseObsidianVaultDirectory } from '../../utils/directoryVaultImporter';

describe('Tier 4 & Tier 2 E2E: Zip Slip Neutralization & Safe Vault Ingestion Suite', () => {
  describe('Path Traversal & Zip Slip Defense (isSafeRelativePath)', () => {
    it('ZIPSLIP-01: Rejects relative directory traversal breakout sequences (../ and ..\\)', () => {
      const traversalPaths = [
        '../evil.md',
        '../../etc/passwd',
        '../../../var/log/syslog.md',
        'notes/../../escape.md',
        'sub/dir/../../../../etc/shadow.md',
        '..\\win.ini',
        '..\\..\\windows\\system32\\cmd.exe.md',
        'vault\\..\\..\\secret.md',
        'notes/sub/../../notes.md',
        './../escape.md',
      ];

      for (const p of traversalPaths) {
        expect(isSafeRelativePath(p)).toBe(false);
      }
    });

    it('ZIPSLIP-02: Rejects URL-encoded traversal sequences (%2e%2e, %2f, %5c, and multi-tier encodings)', () => {
      const encodedPaths = [
        '%2e%2e/etc/passwd',
        '%2e%2e%2fetc%2fpasswd',
        'notes/%2e%2e/escape.md',
        '%2e%2e\\system32',
        'notes/%2froot.md',
        'notes/%5cescape.md',
        'vault/%2e%2e%2fsecret.md',
        // Restored adversarial double-encoded vectors:
        '%252e%252e/double-encoded.md',
        '%252e%252e%252fetc/passwd.md',
        '%25252e%25252e/triple-encoded.md',
        '.%252e/mixed-dot.md',
        'notes/%252e%252e/escape.md',
        'vault/%252e%252e%252fsecret.md',
        '%252f%252fshare/payload.md',
        'C%253a/Windows/win.ini',
        'notes/safe.md%2500.exe',
        // Additional multi-layer & unicode lookalikes:
        '%252e%252e/etc/passwd',
        '%252e%252e\\system32',
        '%252e%252e%255cwindows\\system32',
        '..%252fetc/passwd',
        '..%255cwindows',
        '%252e./escape.md',
        '%252E%252E/uppercase-double.md',
        '%252e%252E%252Fetc%252fpasswd',
        '%252525252e%252525252e/deep-encoded.md',
        '\u2025/two-dot-leader.md',
        '\uFF0E\uFF0E/fullwidth-dots.md',
        '\uFF0Fetc/passwd',
      ];

      for (const p of encodedPaths) {
        expect(isSafeRelativePath(p)).toBe(false);
      }
    });

    it('ZIPSLIP-03: Rejects absolute Unix filesystem paths', () => {
      const absoluteUnixPaths = [
        '/etc/passwd',
        '/var/www/html/shell.php.md',
        '/root/.ssh/id_rsa.md',
        '/tmp/payload.md',
        '/bin/sh.md',
        '/proc/cpuinfo.md',
      ];

      for (const p of absoluteUnixPaths) {
        expect(isSafeRelativePath(p)).toBe(false);
      }
    });

    it('ZIPSLIP-04: Rejects Windows drive letters and UNC network paths', () => {
      const windowsAndUncPaths = [
        'C:/Windows/win.ini',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        'D:/SecretVault/notes.md',
        'c:/boot.ini',
        'E:\\backdoor.md',
        '//attacker.corp/share/payload.md',
        '\\\\192.168.1.100\\c$\\loot.md',
        '//./C:/Windows/win.ini',
        '\\\\?\\C:\\secret.md',
        'C%253a/Windows/win.ini',
        'c%253a/boot.ini',
        '%2543%253a/Windows/win.ini',
        '%252f%252fshare/payload.md',
        '%255c%255cattacker/smb',
      ];

      for (const p of windowsAndUncPaths) {
        expect(isSafeRelativePath(p)).toBe(false);
      }
    });

    it('ZIPSLIP-05: Rejects null bytes, non-printable control characters, and dangerous escapes', () => {
      const poisonBytePaths = [
        'notes/safe.md\0../../etc/passwd',
        'vault/\x00malicious.md',
        'notes/\x1fcorrupted.md',
        'notes/\x7fdel.md',
        'notes/\x08backspace.md',
        'notes/\x1b[31mcolor.md',
        'notes/%00evil.md',
        'notes/%2500evil.md',
        'notes/%251fcorrupted.md',
        'notes/safe.md%2500.exe',
      ];

      for (const p of poisonBytePaths) {
        expect(isSafeRelativePath(p)).toBe(false);
      }
    });

    it('ZIPSLIP-06: Rejects empty strings, whitespace, and dot-only path segments', () => {
      const invalidSegments = [
        '',
        '   ',
        '.',
        '..',
        './',
        '../',
        'notes/.',
        'notes/..',
        'notes/./sub.md',
        'notes//double-slash.md',
        '   /   ',
      ];

      for (const p of invalidSegments) {
        expect(isSafeRelativePath(p)).toBe(false);
      }
    });

    it('ZIPSLIP-07: Allows safe, standard relative markdown note paths', () => {
      const validPaths = [
        '01 Reconnaissance/Nmap Scanning.md',
        '02 Foothold/Web Shell Exploitation.markdown',
        'Active Directory/Attacks/Kerberoasting.md',
        'Pivoting/Chisel and Ligolo/ligolo-ng.md',
        'writeups/hackthebox/legacy.md',
        './cheatsheet.md',
        'notes/buffer-overflow-32bit.md',
        'סיכומי_קורס/מכונות.md',
      ];

      for (const p of validPaths) {
        expect(isSafeRelativePath(p)).toBe(true);
      }
    });
  });

  describe('Ignored Vault Assets (isIgnoredVaultPath)', () => {
    it('ZIPSLIP-08: Filters system folders, hidden metadata, and non-note directories', () => {
      expect(isIgnoredVaultPath('.obsidian/workspace.json')).toBe(true);
      expect(isIgnoredVaultPath('.obsidian/plugins/dataview/main.js')).toBe(true);
      expect(isIgnoredVaultPath('.git/config')).toBe(true);
      expect(isIgnoredVaultPath('.trash/deleted-note.md')).toBe(true);
      expect(isIgnoredVaultPath('__MACOSX/._note.md')).toBe(true);
      expect(isIgnoredVaultPath('.DS_Store')).toBe(true);
      expect(isIgnoredVaultPath('.hidden_folder/note.md')).toBe(true);

      // Legitimate notes should NOT be ignored
      expect(isIgnoredVaultPath('01 Recon/nmap.md')).toBe(false);
      expect(isIgnoredVaultPath('PrivEsc/Linux/sudo.md')).toBe(false);
    });
  });

  describe('Adversarial ZIP Archive Ingestion (parseObsidianVaultZip)', () => {
    it('ZIPSLIP-09: End-to-End Zip Slip ingestion containment: extracts valid notes while silently dropping traversal entries', async () => {
      const zip = new JSZip();

      // 1. Inject adversarial out-of-bounds traversal files into the archive
      zip.file('/etc/passwd.md', 'root:x:0:0:root:/root:/bin/bash');
      zip.file('C:/Windows/win.ini.md', '[extensions]\nwp=winword.exe');
      zip.file('//attacker.corp/share/smb.md', 'UNC payload');
      zip.file('%2e%2e/%2e%2e/traversal.md', 'URL-encoded traversal payload');

      // 2. Inject ignored system files and non-markdown assets
      zip.file('.obsidian/app.json', '{"theme": "obsidian"}');
      zip.file('.git/HEAD', 'ref: refs/heads/main');
      zip.file('assets/screenshot.png', 'PNG_BINARY_CONTENT');

      // 3. Inject legitimate notes with Obsidian frontmatter and wikilinks
      const note1Markdown = `---
title: Network Reconnaissance
category: Recon
tags: [nmap, ports, tcp]
tools: [nmap, masscan]
---
# Network Reconnaissance
Initial port scan against target. See also [[Kerberoasting Attack]].

\`\`\`bash
nmap -sC -sV -p- 10.10.11.200
masscan -p1-65535 10.10.11.200 --rate=1000
\`\`\`
`;

      const note2Markdown = `---
title: Kerberoasting Attack
category: Active Directory
tags: [kerberos, spn, impacket]
tools: [GetUserSPNs.py, hashcat]
aliases: [SPN Roasting, Kerberoast]
---
# Kerberoasting Attack
Harvest TGS tickets for offline cracking. Referenced from [[Network Reconnaissance]].

\`\`\`bash
GetUserSPNs.py -request -dc-ip 10.10.10.1 domain.local/user:password
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt
\`\`\`
`;

      zip.file('Vault/01 Recon/Network Reconnaissance.md', note1Markdown);
      zip.file('Vault/02 Active Directory/Kerberoasting Attack.md', note2Markdown);

      // Generate in-memory ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Ingest through vault importer
      const result = await parseObsidianVaultZip(zipBlob);

      // 4. Assertions: Containment & Data Integrity
      expect(result.summary.totalNotes).toBe(2);
      expect(result.notes.length).toBe(2);

      // Verify that NO malicious paths were imported
      for (const note of result.notes) {
        expect(note.relPath).not.toContain('passwd');
        expect(note.relPath).not.toContain('win.ini');
        expect(note.relPath).not.toContain('attacker.corp');
        expect(note.relPath).not.toContain('%2e');
      }

      // Verify legitimate notes were correctly parsed
      const reconNote = result.notes.find((n) => n.title === 'Network Reconnaissance');
      const adNote = result.notes.find((n) => n.title === 'Kerberoasting Attack');

      expect(reconNote).toBeDefined();
      expect(adNote).toBeDefined();

      // Verify wikilinks bidirectional graph was resolved across surviving valid notes
      expect(reconNote?.outgoingWikilinks).toContain(adNote?.id);
      expect(adNote?.outgoingWikilinks).toContain(reconNote?.id);
      expect(adNote?.backlinks).toContain(reconNote?.id);
      expect(reconNote?.backlinks).toContain(adNote?.id);

      // Verify commands extracted
      expect(reconNote?.commands).toContain('nmap -sC -sV -p- 10.10.11.200');
      expect(adNote?.commands).toContain('hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt');

      // Verify wikilink alias mappings
      expect(result.wikilinkMap['spn roasting']).toBe(adNote?.id);
      expect(result.wikilinkMap['kerberoast']).toBe(adNote?.id);
    });

    it('ZIPSLIP-10: Throws descriptive error when ZIP archive contains ONLY Zip Slip / traversal vectors', async () => {
      const maliciousZip = new JSZip();
      maliciousZip.file('/etc/passwd.md', 'root:x:0:0::/root:/bin/bash');
      maliciousZip.file('C:/Windows/win.ini.md', '[boot]');
      maliciousZip.file('//attacker.corp/share/smb.md', 'UNC payload');
      maliciousZip.file('%2e%2e/%2e%2e/traversal.md', 'URL-encoded traversal payload');

      const zipBlob = await maliciousZip.generateAsync({ type: 'blob' });

      await expect(parseObsidianVaultZip(zipBlob)).rejects.toThrow(
        /No markdown \(\.md\) notes were found in the uploaded ZIP archive/i
      );
    });

    it('ZIPSLIP-11: parseObsidianRawItems directly neutralizes all raw Zip Slip breakout paths', async () => {
      const rawEntries = [
        {
          path: '../../../../etc/cron.d/pwned.md',
          getText: async () => '# Backdoor',
        },
        {
          path: '..\\..\\windows\\system32\\calc.md',
          getText: async () => '# Calc',
        },
        {
          path: '%2e%2e/%2e%2e/escape.md',
          getText: async () => '# Traversal',
        },
        {
          path: 'notes/\0malicious.md',
          getText: async () => '# Null Byte',
        },
        {
          path: '01 Recon/Valid-Host.md',
          getText: async () => '# Valid Host Note\nNmap output here.',
        },
        {
          path: '02 Foothold/Valid-Shell.md',
          getText: async () => '# Valid Shell Note\nShell output here.',
        },
      ];

      const result = await parseObsidianRawItems(rawEntries);

      // Exactly 2 valid notes survive
      expect(result.notes.length).toBe(2);
      expect(result.notes[0].relPath).toBe('01 Recon/Valid-Host.md');
      expect(result.notes[1].relPath).toBe('02 Foothold/Valid-Shell.md');

      // None of the malicious paths survived
      for (const note of result.notes) {
        expect(note.relPath).not.toContain('..');
        expect(note.relPath).not.toContain('cron.d');
        expect(note.relPath).not.toContain('system32');
        expect(note.relPath).not.toContain('%2e');
        expect(note.relPath).not.toContain('\0');
      }
    });
  });

  describe('Adversarial Directory Ingestion (parseObsidianVaultDirectory)', () => {
    it('ZIPSLIP-12: Drops traversal and out-of-bounds files from directory upload input', async () => {
      const mockFiles: { path: string; file: File }[] = [
        {
          path: '../../outside/secret.md',
          file: new File(['# Secret'], 'secret.md', { type: 'text/markdown' }),
        },
        {
          path: 'C:/Windows/calc.md',
          file: new File(['# Calc'], 'calc.md', { type: 'text/markdown' }),
        },
        {
          path: '//attacker.corp/share/payload.md',
          file: new File(['# Payload'], 'payload.md', { type: 'text/markdown' }),
        },
        {
          path: 'Recon/Valid-Note.md',
          file: new File(['# Valid Recon Note\nContent here.'], 'Valid-Note.md', { type: 'text/markdown' }),
        },
        {
          path: 'Foothold/Shell-Note.md',
          file: new File(['# Valid Foothold Note\nContent here.'], 'Shell-Note.md', { type: 'text/markdown' }),
        },
      ];

      const result = await parseObsidianVaultDirectory(mockFiles);

      expect(result.notes.length).toBe(2);
      expect(result.notes[0].relPath).toBe('Recon/Valid-Note.md');
      expect(result.notes[1].relPath).toBe('Foothold/Shell-Note.md');
    });

    it('ZIPSLIP-13: Throws when directory source contains zero valid safe markdown notes', async () => {
      const mockFiles: { path: string; file: File }[] = [
        {
          path: '../../outside/secret.md',
          file: new File(['# Secret'], 'secret.md', { type: 'text/markdown' }),
        },
        {
          path: 'images/diagram.png',
          file: new File(['binary'], 'diagram.png', { type: 'image/png' }),
        },
      ];

      await expect(parseObsidianVaultDirectory(mockFiles)).rejects.toThrow(
        /No markdown \(\.md or \.markdown\) notes were found in the selected directory/i
      );
    });
  });

  describe('Frontmatter & Markdown Ingestion Parser Boundaries', () => {
    it('ZIPSLIP-14: parseFrontmatterAndBody handles UTF-8 BOM, array tags, and inline hashtags safely', () => {
      const rawWithBom = '\uFEFF---\ntitle: "BOM Test"\ntags: [web, xss, sqli]\naliases: [Alias1, Alias2]\n---\n# Content\nParagraph with #inline-tag and #another_tag.';
      const parsed = parseFrontmatterAndBody(rawWithBom);

      expect(parsed.frontmatter['title']).toBe('BOM Test');
      expect(parsed.tags).toContain('web');
      expect(parsed.tags).toContain('xss');
      expect(parsed.tags).toContain('sqli');
      expect(parsed.tags).toContain('inline-tag');
      expect(parsed.tags).toContain('another_tag');
      expect(parsed.aliases).toContain('Alias1');
      expect(parsed.aliases).toContain('Alias2');
      expect(parsed.body).toContain('# Content');
    });

    it('ZIPSLIP-15: extractCommands ignores comments and non-command lines across shell blocks', () => {
      const markdown = `
\`\`\`bash
# This is a comment
// Another comment style
:: Batch comment
whoami
cat /etc/os-release
id
\`\`\`
`;
      const commands = extractCommands(markdown);
      expect(commands).toContain('whoami');
      expect(commands).toContain('cat /etc/os-release');
      expect(commands).not.toContain('# This is a comment');
      expect(commands).not.toContain('// Another comment style');
      expect(commands).not.toContain(':: Batch comment');
    });
  });
});
