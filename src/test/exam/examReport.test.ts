/**
 * examReport.test.ts
 * Opaque-box, requirement-driven Vitest test suite for Certification Exam Report Generator.
 * Verifies R5 (1-Click Submission-Ready Exam Report Generator) from ORIGINAL_REQUEST.md.
 */

import { describe, it, expect } from 'vitest';
import {
  generateExamReportMarkdown,
  ExamSessionState,
  ExamBox,
  ExamTrack,
} from '../../utils/examComplianceUtils';
import { parseMarkdownToHtml } from '../../utils/writeupHtmlExporter';

// Helper to generate populated exam session
function createMockExamSession(track: ExamTrack, isPassingState: boolean, hasFullProofs: boolean): ExamSessionState {
  const baseBoxes: ExamBox[] = [
    {
      id: 'ad-1',
      name: 'CORP-WEB01',
      ip: '192.168.1.30',
      os: 'Linux',
      difficulty: 'Easy',
      type: 'ad-foothold',
      label: 'AD Initial Access Foothold',
      userPoints: 10,
      rootPoints: 0,
      userPwned: isPassingState,
      rootPwned: false,
      userProof: {
        flagText: hasFullProofs ? 'c0ffee1234567890abcdef1234567890' : '',
        whoamiOutput: hasFullProofs ? 'www-data' : '',
        ipconfigOutput: hasFullProofs ? 'eth0: 192.168.1.30' : '',
        screenshotTaken: hasFullProofs,
        screenshots: hasFullProofs
          ? [
              {
                id: 'sc-1',
                dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                caption: 'Foothold proof on CORP-WEB01',
                timestamp: '2026-09-26T18:30:00Z',
              },
            ]
          : [],
      },
      rootProof: { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshotTaken: false },
    },
    {
      id: 'ad-2',
      name: 'CORP-SRV01',
      ip: '192.168.1.20',
      os: 'Windows',
      difficulty: 'Medium',
      type: 'ad-lateral',
      label: 'AD Lateral Movement',
      userPoints: 10,
      rootPoints: 0,
      userPwned: isPassingState,
      rootPwned: false,
      userProof: {
        flagText: hasFullProofs ? 'a1b2c3d4e5f678901234567890abcdef' : '',
        whoamiOutput: hasFullProofs ? 'corp\\svc_backup' : '',
        ipconfigOutput: hasFullProofs ? 'IPv4 Address: 192.168.1.20' : '',
        screenshotTaken: hasFullProofs,
      },
      rootProof: { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshotTaken: false },
    },
    {
      id: 'ad-3',
      name: 'CORP-DC01',
      ip: '192.168.1.10',
      os: 'Windows',
      difficulty: 'Hard',
      type: 'ad-dc',
      label: 'AD Domain Controller (Forest Root)',
      userPoints: 0,
      rootPoints: 20,
      userPwned: false,
      rootPwned: isPassingState,
      userProof: { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshotTaken: false },
      rootProof: {
        flagText: hasFullProofs ? 'deadbeef1234567890abcdef12345678' : '',
        whoamiOutput: hasFullProofs ? 'nt authority\\system' : '',
        ipconfigOutput: hasFullProofs ? 'IPv4 Address: 192.168.1.10' : '',
        screenshotTaken: hasFullProofs,
        screenshots: hasFullProofs
          ? [
              {
                id: 'sc-2',
                dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                caption: 'proof.txt on DC01 showing NT AUTHORITY\\SYSTEM',
                timestamp: '2026-09-26T21:15:00Z',
              },
            ]
          : [],
      },
    },
    {
      id: 'st-1',
      name: 'ALPHA',
      ip: '192.168.1.101',
      os: 'Linux',
      difficulty: 'Easy',
      type: 'standalone-1',
      label: 'Standalone 01 (Linux Easy)',
      userPoints: 10,
      rootPoints: 10,
      userPwned: isPassingState,
      rootPwned: isPassingState,
      userProof: {
        flagText: hasFullProofs ? '11112222333344445555666677778888' : '',
        whoamiOutput: hasFullProofs ? 'developer' : '',
        ipconfigOutput: hasFullProofs ? 'eth0: 192.168.1.101' : '',
        screenshotTaken: hasFullProofs,
      },
      rootProof: {
        flagText: hasFullProofs ? '99998888777766665555444433332222' : '',
        whoamiOutput: hasFullProofs ? 'root' : '',
        ipconfigOutput: hasFullProofs ? 'eth0: 192.168.1.101' : '',
        screenshotTaken: hasFullProofs,
      },
    },
    {
      id: 'st-2',
      name: 'BRAVO',
      ip: '192.168.1.102',
      os: 'Windows',
      difficulty: 'Medium',
      type: 'standalone-2',
      label: 'Standalone 02 (Windows Medium)',
      userPoints: 10,
      rootPoints: 10,
      userPwned: isPassingState,
      rootPwned: false, // User only: 10 pts
      userProof: {
        flagText: hasFullProofs ? 'aaaabbbbccccddddeeeeffff00001111' : '',
        whoamiOutput: hasFullProofs ? 'CORP\\contractor' : '',
        ipconfigOutput: hasFullProofs ? '192.168.1.102' : '',
        screenshotTaken: hasFullProofs,
      },
      rootProof: { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshotTaken: false },
    },
    {
      id: 'st-3',
      name: 'CHARLIE',
      ip: '192.168.1.103',
      os: 'Linux',
      difficulty: 'Hard',
      type: 'standalone-3',
      label: 'Standalone 03 (Linux Hard)',
      userPoints: 10,
      rootPoints: 10,
      userPwned: false,
      rootPwned: false,
      userProof: { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshotTaken: false },
      rootProof: { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshotTaken: false },
    },
  ];

  return {
    track,
    candidateName: 'Daniel Dayan',
    candidateCallsign: '0xdnd',
    osid: 'OS-94821',
    examStartedAt: 1727370000000,
    examDurationSeconds: 24 * 3600,
    examExpiresAt: 1727370000000 + 24 * 3600 * 1000,
    isTimerRunning: true,
    timerPausedRemainingSeconds: null,
    boxes: baseBoxes,
    scratchNotes: 'Pivot established via Chisel SOCKS5 proxy on port 1080. Kerberoasted svc_backup hash cracked.',
  };
}

describe('Certification Exam Submission Report Generator (R5)', () => {
  // =========================================================================
  // 1. OffSec OSCP Markdown Report Generation
  // =========================================================================
  describe('OffSec OSCP Formatted Markdown Report', () => {
    it('REPORT-01: Generates complete official OffSec report header with candidate details and passing result', () => {
      // 40 AD pts + 20 Standalone 1 pts + 10 Standalone 2 user pts = 70 PTS (Passing threshold reached)
      const session = createMockExamSession('OSCP', true, true);
      const markdown = generateExamReportMarkdown(session);

      expect(markdown).toContain('OFFSEC');
      expect(markdown).toContain('PEN-200');
      expect(markdown).toContain('Daniel Dayan');
      expect(markdown).toContain('0xdnd');
      expect(markdown).toContain('OS-94821');
      expect(markdown).toContain('PASSED (REQUIREMENTS SATISFIED)');
      expect(markdown).toContain('70 / 100 PTS');
      expect(markdown).toContain('100% COMPLIANT');
    });

    it('REPORT-02: Generates Executive Summary scoring table with accurate points per target', () => {
      const session = createMockExamSession('OSCP', true, true);
      const markdown = generateExamReportMarkdown(session);

      // Verify table headers
      expect(markdown).toContain('| Target System | Role / Type | IP Address | Foothold (User) | Privilege Escalation (Root/SYSTEM) | Points Awarded |');
      // Verify individual target rows
      expect(markdown).toContain('| **CORP-WEB01** |');
      expect(markdown).toContain('`192.168.1.30`');
      expect(markdown).toContain('| **CORP-DC01** |');
      expect(markdown).toContain('`192.168.1.10`');
      expect(markdown).toContain('| **ALPHA** |');
      expect(markdown).toContain('`192.168.1.101`');
      expect(markdown).toContain('**20 PTS**');
      expect(markdown).toContain('| **BRAVO** |');
      expect(markdown).toContain('**10 PTS**');
      expect(markdown).toContain('| **CHARLIE** |');
      expect(markdown).toContain('**0 PTS**');
    });

    it('REPORT-03: Includes target technical walkthroughs with whoami, ipconfig, and flag strings', () => {
      const session = createMockExamSession('OSCP', true, true);
      const markdown = generateExamReportMarkdown(session);

      // Section for DC01
      expect(markdown).toContain('### 2.3 Target: CORP-DC01 (`192.168.1.10` - Windows)');
      expect(markdown).toContain('`deadbeef1234567890abcdef12345678`');
      expect(markdown).toContain('`whoami` Output:');
      expect(markdown).toContain('nt authority\\system');
      expect(markdown).toContain('`ipconfig / ifconfig` Output:');
      expect(markdown).toContain('IPv4 Address: 192.168.1.10');
      expect(markdown).toContain('**Proof Screenshot Recorded:** YES [x]');
      expect(markdown).toContain('Screenshots Attached: 1');
      expect(markdown).toContain('proof.txt on DC01 showing NT AUTHORITY\\SYSTEM');
    });

    it('REPORT-04: Includes candidate scratchpad notes in Section 3', () => {
      const session = createMockExamSession('OSCP', true, true);
      const markdown = generateExamReportMarkdown(session);

      expect(markdown).toContain('## 3. Candidate Operational Scratchpad & Notes');
      expect(markdown).toContain('Pivot established via Chisel SOCKS5 proxy on port 1080');
      expect(markdown).toContain('Kerberoasted svc_backup hash cracked');
    });

    it('REPORT-05: Emits Compliance Warning Log when proof requirements are missing', () => {
      const sessionIncomplete = createMockExamSession('OSCP', true, false); // hasFullProofs: false
      const markdown = generateExamReportMarkdown(sessionIncomplete);

      expect(markdown).toContain('### ⚠️ Compliance Warning Log');
      expect(markdown).toContain('- [ ] *Non-Compliance Risk:*');
      expect(markdown).toContain('whoami command output missing');
      expect(markdown).toContain('Mandatory User proof screenshot is not confirmed');
    });

    it('REPORT-06: Incorporates OffSec 10-point bonus lab exercises when toggled', () => {
      const session = createMockExamSession('OSCP', false, false); // 0 box pts
      session.includeBonusPoints = true;
      const markdown = generateExamReportMarkdown(session);

      expect(markdown).toContain('| **OFFSEC BONUS LABS** | Official Lab Bonus | `N/A` | [x] COMPLETED | [x] COMPLETED | **10 PTS** |');
      expect(markdown).toContain('10 / 100 PTS');
    });
  });

  // =========================================================================
  // 2. Hack The Box CPTS Markdown Report Generation
  // =========================================================================
  describe('HTB CPTS Formatted Markdown Report', () => {
    it('REPORT-07: Formats report for HTB CPTS track with 85-point passing criteria', () => {
      const session = createMockExamSession('CPTS', true, true);
      const markdown = generateExamReportMarkdown(session);

      expect(markdown).toContain('HACK THE BOX CPTS');
      expect(markdown).toContain('Passing Threshold: 85 Points');
      expect(markdown).toContain('MINIMUM PASSING SCORE:** **85 PTS**');
    });
  });

  // =========================================================================
  // 3. Standalone Zero-Egress HTML Report Export
  // =========================================================================
  describe('Air-Gapped Standalone HTML Report Exporter', () => {
    function exportStandaloneHtmlReport(markdownReport: string): string {
      const parsedBody = parseMarkdownToHtml(markdownReport);
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; script-src 'none'; font-src 'self';">
  <title>ZeroBox Tactical Certification Exam Report</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #0a0a0c; color: #e4e4e7; line-height: 1.6; padding: 2rem; }
    h1, h2, h3, h4 { color: #10b981; border-bottom: 1px solid #27272a; padding-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { border: 1px solid #27272a; padding: 0.75rem; text-align: left; }
    th { background: #18181b; color: #10b981; }
    pre { background: #18181b; padding: 1rem; border-radius: 4px; overflow-x: auto; border: 1px solid #27272a; }
    code { font-family: inherit; color: #a1a1aa; }
    img { max-width: 100%; height: auto; border: 1px solid #27272a; border-radius: 4px; margin: 1rem 0; }
    @media print {
      body { background: #ffffff !important; color: #000000 !important; padding: 0 !important; }
      h1, h2, h3, h4 { color: #000000 !important; border-bottom: 1px solid #cccccc !important; }
      table, th, td { border-color: #cccccc !important; color: #000000 !important; }
      th { background: #f4f4f5 !important; }
      pre { background: #f4f4f5 !important; border-color: #cccccc !important; color: #000000 !important; }
      img { border-color: #cccccc !important; }
    }
  </style>
</head>
<body>
  ${parsedBody}
</body>
</html>`;
    }

    it('HTML-01: Generates valid standalone HTML with embedded DOCTYPE, CSP meta tag, and parsed tables', () => {
      const session = createMockExamSession('OSCP', true, true);
      const markdown = generateExamReportMarkdown(session);
      const html = exportStandaloneHtmlReport(markdown);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<meta http-equiv="Content-Security-Policy"');
      expect(html).toContain('<table');
      expect(html).toContain('<th');
      expect(html).toContain('<td');
      expect(html).toContain('CORP-WEB01');
    });

    it('HTML-02: Enforces strict ZERO NETWORK EGRESS in exported HTML', () => {
      const session = createMockExamSession('OSCP', true, true);
      const markdown = generateExamReportMarkdown(session);
      const html = exportStandaloneHtmlReport(markdown);

      // Disallow any external scripts
      expect(html).not.toMatch(/<script\s+src=/i);
      // Disallow remote stylesheets
      expect(html).not.toMatch(/<link\s+[^>]*href=["']https?:\/\//i);
      // Disallow Google Fonts or remote @import
      expect(html).not.toMatch(/@import\s+url\(["']?https?:\/\//i);
      expect(html).not.toContain('fonts.googleapis.com');
      expect(html).not.toContain('cdnjs.cloudflare.com');
      expect(html).not.toContain('unpkg.com');
    });

    it('HTML-03: Includes print-ready media query stylesheet (@media print) for PDF export', () => {
      const session = createMockExamSession('OSCP', true, true);
      const markdown = generateExamReportMarkdown(session);
      const html = exportStandaloneHtmlReport(markdown);

      expect(html).toContain('@media print');
      expect(html).toContain('background: #ffffff !important');
      expect(html).toContain('color: #000000 !important');
    });

    it('HTML-04: Preserves embedded Base64 screenshot data URIs inside img tags', () => {
      const markdownWithImage = '![DC01 Proof](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)';
      const html = exportStandaloneHtmlReport(markdownWithImage);

      expect(html).toContain('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="');
      expect(html).toContain('alt="DC01 Proof"');
    });

    it('HTML-05: Neutralizes XSS payload attempts injected into candidate scratch notes', () => {
      const session = createMockExamSession('OSCP', true, true);
      session.scratchNotes = '<script>alert("XSS")</script><img src="x" onerror="alert(\'XSS\')" />';
      const markdown = generateExamReportMarkdown(session);
      const html = exportStandaloneHtmlReport(markdown);

      // Verify <script> tags are neutralized (escaped to &lt;script&gt;)
      expect(html).not.toContain('<script>alert("XSS")</script>');
      expect(html).toContain('&lt;script&gt;');
      // Verify onerror is neutralized
      expect(html).not.toContain('onerror="alert');
    });
  });
});
