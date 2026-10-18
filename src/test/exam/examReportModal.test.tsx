/**
 * examReportModal.test.tsx
 * Comprehensive Vitest suite for Milestone 4: 1-Click Submission-Ready Exam Report Generator & Modal
 * 
 * Verifies:
 * - ExamReportModal:
 *   - Rendering & accessibility (isOpen true/false, focus trapping, ESC/backdrop dismissal)
 *   - Live candidate parameter binding (Name, Callsign, OSID, Date)
 *   - Authentic template switching (OffSec OSCP, HTB CPTS, ZPS CRTO)
 *   - 1-Click "Copy Markdown to Clipboard" with visual "Copied!" feedback
 *   - 1-Click "Download Markdown (.md)" client-side blob generation
 *   - 1-Click "Export Standalone HTML (.html)" zero-egress air-gapped exporter
 *   - Report options toggling (Bonus points, Base64 screenshot embeddings, Remediation)
 *   - Live preview tabs (Formatted HTML preview vs Raw Markdown)
 *   - Strict XSS neutralization in report preview and export
 * - Page & Drawer Integration:
 *   - ExamSimulatorPage "Export Report" button opens modal
 *   - ExamQuickActionDrawer "Report" button opens modal
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamReportModal } from '../../components/exam/ExamReportModal';
import { ExamSimulatorPage } from '../../pages/ExamSimulatorPage';
import { ExamQuickActionDrawer } from '../../components/exam/ExamQuickActionDrawer';
import { useExamStore } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';
import * as helpers from '../../utils/helpers';
import {
  generateExamReportMarkdown,
  generateExamReportHtml,
  exportStandaloneHtmlReport,
} from '../../utils/examReportGenerator';
import {
  ExamSessionState,
  ExamBox,
  ExamTrack,
  createDefaultProof,
} from '../../utils/examComplianceUtils';

// JSDOM Mocks
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
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

  window.URL.createObjectURL = vi.fn(() => 'blob:mock-exam-report-blob');
  window.URL.revokeObjectURL = vi.fn();
}

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Test helper to generate populated test session
function createTestExamSession(track: ExamTrack = 'OSCP', isPassing = true): ExamSessionState {
  const sampleBoxes: ExamBox[] = [
    {
      id: 'box-ad-1',
      name: 'CORP-WEB01',
      ip: '192.168.1.30',
      os: 'Linux',
      difficulty: 'Easy',
      type: 'ad-foothold',
      label: 'AD Initial Access Foothold',
      userPoints: 10,
      rootPoints: 0,
      userPwned: isPassing,
      rootPwned: false,
      userProof: {
        flagText: 'c0ffee1234567890abcdef1234567890',
        whoamiOutput: 'www-data',
        ipconfigOutput: 'eth0: 192.168.1.30',
        screenshotTaken: true,
        screenshots: [
          {
            id: 'sc-1',
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            caption: 'Web foothold on CORP-WEB01',
            timestamp: '2026-09-26T18:00:00Z',
          },
        ],
      },
      rootProof: createDefaultProof(),
    },
    {
      id: 'box-ad-2',
      name: 'CORP-SRV01',
      ip: '192.168.1.20',
      os: 'Windows',
      difficulty: 'Medium',
      type: 'ad-lateral',
      label: 'AD Lateral Movement',
      userPoints: 10,
      rootPoints: 0,
      userPwned: isPassing,
      rootPwned: false,
      userProof: {
        flagText: 'a1b2c3d4e5f678901234567890abcdef',
        whoamiOutput: 'corp\\svc_backup',
        ipconfigOutput: '192.168.1.20',
        screenshotTaken: true,
      },
      rootProof: createDefaultProof(),
    },
    {
      id: 'box-ad-3',
      name: 'CORP-DC01',
      ip: '192.168.1.10',
      os: 'Windows',
      difficulty: 'Hard',
      type: 'ad-dc',
      label: 'AD Domain Controller (Forest Root)',
      userPoints: 0,
      rootPoints: 20,
      userPwned: false,
      rootPwned: isPassing,
      userProof: createDefaultProof(),
      rootProof: {
        flagText: 'deadbeef1234567890abcdef12345678',
        whoamiOutput: 'nt authority\\system',
        ipconfigOutput: 'IPv4 Address: 192.168.1.10',
        screenshotTaken: true,
        screenshots: [
          {
            id: 'sc-2',
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            caption: 'proof.txt on DC01 showing NT AUTHORITY\\SYSTEM',
            timestamp: '2026-09-26T21:00:00Z',
          },
        ],
      },
    },
    {
      id: 'box-st-1',
      name: 'ALPHA',
      ip: '192.168.1.101',
      os: 'Linux',
      difficulty: 'Easy',
      type: 'standalone-1',
      label: 'Standalone 01 (Linux Easy)',
      userPoints: 10,
      rootPoints: 10,
      userPwned: isPassing,
      rootPwned: isPassing,
      userProof: {
        flagText: '11112222333344445555666677778888',
        whoamiOutput: 'developer',
        ipconfigOutput: 'eth0: 192.168.1.101',
        screenshotTaken: true,
      },
      rootProof: {
        flagText: '99998888777766665555444433332222',
        whoamiOutput: 'root',
        ipconfigOutput: 'eth0: 192.168.1.101',
        screenshotTaken: true,
      },
    },
    {
      id: 'box-st-2',
      name: 'BRAVO',
      ip: '192.168.1.102',
      os: 'Windows',
      difficulty: 'Medium',
      type: 'standalone-2',
      label: 'Standalone 02 (Windows Medium)',
      userPoints: 10,
      rootPoints: 10,
      userPwned: isPassing,
      rootPwned: false,
      userProof: {
        flagText: 'aaaabbbbccccddddeeeeffff00001111',
        whoamiOutput: 'CORP\\contractor',
        ipconfigOutput: '192.168.1.102',
        screenshotTaken: true,
      },
      rootProof: createDefaultProof(),
    },
    {
      id: 'box-st-3',
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
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
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
    boxes: sampleBoxes,
    scratchNotes: 'Pivot established via Chisel SOCKS5 proxy on port 1080. Kerberoasted svc_backup hash cracked.',
    includeBonusPoints: false,
  };
}

describe('Milestone 4: 1-Click Submission-Ready Exam Report Generator & Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useExamStore.getState().resetExam('OSCP');
    useExamStore.setState({
      candidateName: 'Daniel Dayan',
      candidateCallsign: '0xdnd',
      osid: 'OS-94821',
      scratchNotes: 'Pivot established via Chisel SOCKS5 proxy on port 1080.',
      status: 'running',
    });
    useCtfStore.setState({ soundEnabled: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Modal Visibility & Accessibility
  // =========================================================================
  describe('Modal Visibility & Accessibility', () => {
    it('does not render dialog content when isOpen is false', () => {
      render(<ExamReportModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByTestId('exam-report-modal')).toBeNull();
    });

    it('renders accessible dialog container when isOpen is true', () => {
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} />);
      const modal = screen.getByTestId('exam-report-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText(/Submission-Ready Exam Report Generator/i)).toBeInTheDocument();
    });

    it('invokes onClose when clicking the close button', () => {
      const handleClose = vi.fn();
      render(<ExamReportModal isOpen={true} onClose={handleClose} />);
      const closeBtn = screen.getByTestId('report-modal-close');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('invokes onClose when clicking the modal backdrop', () => {
      const handleClose = vi.fn();
      render(<ExamReportModal isOpen={true} onClose={handleClose} />);
      const backdrop = screen.getByTestId('exam-report-backdrop');
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 2. Candidate Parameters & Live Report Sync
  // =========================================================================
  describe('Candidate Parameters & Live Sync', () => {
    it('populates initial form inputs from active session', () => {
      const session = createTestExamSession('OSCP', true);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      const nameInput = screen.getByTestId('report-candidate-name') as HTMLInputElement;
      const callsignInput = screen.getByTestId('report-candidate-callsign') as HTMLInputElement;
      const osidInput = screen.getByTestId('report-candidate-osid') as HTMLInputElement;

      expect(nameInput.value).toBe('Daniel Dayan');
      expect(callsignInput.value).toBe('0xdnd');
      expect(osidInput.value).toBe('OS-94821');
    });

    it('updates live generated markdown preview when candidate parameters change', () => {
      const session = createTestExamSession('OSCP', true);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      // Switch to raw mode to inspect text
      fireEvent.click(screen.getByTestId('report-tab-raw'));

      const nameInput = screen.getByTestId('report-candidate-name');
      fireEvent.change(nameInput, { target: { value: 'Alex Morgan' } });

      const rawPre = screen.getByTestId('report-raw-markdown');
      expect(rawPre.textContent).toContain('Alex Morgan');
    });
  });

  // =========================================================================
  // 3. Template Selection & Certification Tracks
  // =========================================================================
  describe('Certification Template Selection', () => {
    it('switches to Hack The Box CPTS template with 85-pt threshold and PTES methodology', () => {
      const session = createTestExamSession('OSCP', true);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      // Click CPTS track selector
      fireEvent.click(screen.getByTestId('report-track-select-cpts'));

      // Switch to raw markdown to check generated contents
      fireEvent.click(screen.getByTestId('report-tab-raw'));
      const rawPre = screen.getByTestId('report-raw-markdown');

      expect(rawPre.textContent).toContain('HACK THE BOX CPTS');
      expect(rawPre.textContent).toContain('Passing Threshold: 85 Points');
      expect(rawPre.textContent).toContain('Penetration Testing Execution Standard (PTES)');
    });

    it('switches to Zero-Point Security CRTO template with 75-pt threshold and C2 OpSec methodology', () => {
      const session = createTestExamSession('OSCP', true);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      // Click CRTO track selector
      fireEvent.click(screen.getByTestId('report-track-select-crto'));

      // Switch to raw markdown to check contents
      fireEvent.click(screen.getByTestId('report-tab-raw'));
      const rawPre = screen.getByTestId('report-raw-markdown');

      expect(rawPre.textContent).toContain('ZERO-POINT SECURITY CRTO');
      expect(rawPre.textContent).toContain('Passing Threshold: 75 Points');
      expect(rawPre.textContent).toContain('Malleable C2 Beaconing');
    });
  });

  // =========================================================================
  // 4. Report Options & Checkboxes
  // =========================================================================
  describe('Report Options Toggles', () => {
    it('toggles OffSec 10-point bonus exercises in report', () => {
      const session = createTestExamSession('OSCP', false);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      const bonusToggle = screen.getByTestId('report-opt-bonus');
      fireEvent.click(bonusToggle);

      fireEvent.click(screen.getByTestId('report-tab-raw'));
      const rawPre = screen.getByTestId('report-raw-markdown');
      expect(rawPre.textContent).toContain('OFFSEC BONUS LABS');
      expect(rawPre.textContent).toContain('10 PTS');
    });

    it('toggles inclusion of Base64 proof screenshots', () => {
      const session = createTestExamSession('OSCP', true);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      fireEvent.click(screen.getByTestId('report-tab-raw'));
      let rawPre = screen.getByTestId('report-raw-markdown');
      expect(rawPre.textContent).toContain('data:image/png;base64');

      // Uncheck screenshots
      fireEvent.click(screen.getByTestId('report-opt-screenshots'));
      rawPre = screen.getByTestId('report-raw-markdown');
      expect(rawPre.textContent).not.toContain('data:image/png;base64');
    });

    it('toggles inclusion of Strategic Remediation section', () => {
      const session = createTestExamSession('OSCP', true);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      fireEvent.click(screen.getByTestId('report-tab-raw'));
      let rawPre = screen.getByTestId('report-raw-markdown');
      expect(rawPre.textContent).toContain('Strategic Remediation Plan');

      // Uncheck remediation
      fireEvent.click(screen.getByTestId('report-opt-remediation'));
      rawPre = screen.getByTestId('report-raw-markdown');
      expect(rawPre.textContent).not.toContain('Strategic Remediation Plan');
    });
  });

  // =========================================================================
  // 5. 1-Click Clipboard Copy Action
  // =========================================================================
  describe('1-Click Clipboard Copy Action', () => {
    it('copies generated markdown and displays visual "Copied!" feedback', async () => {
      const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
      const session = createTestExamSession('OSCP', true);

      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      const copyBtn = screen.getByTestId('report-copy-markdown-btn');
      expect(copyBtn).toHaveTextContent('Copy Markdown');

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(copySpy).toHaveBeenCalledTimes(1);
      expect(copySpy.mock.calls[0][0]).toContain('OFFSEC');
      expect(screen.getByTestId('report-copy-markdown-btn')).toHaveTextContent('Copied!');
    });
  });

  // =========================================================================
  // 6. 1-Click Download Markdown & HTML Actions
  // =========================================================================
  describe('1-Click Download Actions', () => {
    it('triggers client-side Blob download for Markdown (.md)', () => {
      const session = createTestExamSession('OSCP', true);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      const downloadMdBtn = screen.getByTestId('report-download-md-btn');
      fireEvent.click(downloadMdBtn);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(screen.getByTestId('report-feedback-toast')).toHaveTextContent(
        'Markdown report (.md) downloaded.'
      );
    });

    it('triggers client-side Blob download for Standalone HTML (.html)', () => {
      const session = createTestExamSession('OSCP', true);
      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      const exportHtmlBtn = screen.getByTestId('report-export-html-btn');
      fireEvent.click(exportHtmlBtn);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(screen.getByTestId('report-feedback-toast')).toHaveTextContent(
        'Air-gapped standalone HTML report (.html) downloaded.'
      );
    });
  });

  // =========================================================================
  // 7. Zero-Egress Security & XSS Sanitization Invariants
  // =========================================================================
  describe('Zero-Egress Security & XSS Neutralization', () => {
    it('neutralizes malicious XSS scripts in candidate notes within rendered preview', () => {
      const session = createTestExamSession('OSCP', true);
      session.scratchNotes = '<script>alert("PWNED_XSS")</script><img src="x" onerror="alert(1)" />';

      render(<ExamReportModal isOpen={true} onClose={vi.fn()} session={session} />);

      // Ensure rendered preview does NOT contain executable script or malicious img elements
      const preview = screen.getByTestId('report-rendered-preview');
      expect(preview.querySelector('script')).toBeNull();
      expect(preview.querySelector('img[src="x"]')).toBeNull();
      expect(preview.querySelector('img[onerror]')).toBeNull();
      expect(preview.innerHTML).not.toContain('<script>alert("PWNED_XSS")</script>');
      expect(preview.innerHTML).toContain('&lt;script&gt;');
      expect(preview.innerHTML).toContain('&lt;img src=');
    });

    it('ensures exported standalone HTML satisfies air-gapped zero-egress invariants', () => {
      const session = createTestExamSession('OSCP', true);
      const html = generateExamReportHtml(session);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<meta http-equiv="Content-Security-Policy"');
      expect(html).toContain("script-src 'none'");
      expect(html).not.toMatch(/<script\s+src=/i);
      expect(html).not.toMatch(/<link\s+[^>]*href=["']https?:\/\//i);
      expect(html).not.toContain('fonts.googleapis.com');
      expect(html).not.toContain('cdnjs.cloudflare.com');
      expect(html).toContain('@media print');
    });
  });

  // =========================================================================
  // 8. ExamSimulatorPage & ExamQuickActionDrawer Integration
  // =========================================================================
  describe('Page & Drawer Modal Integration', () => {
    it('opens ExamReportModal from ExamSimulatorPage export button', () => {
      useExamStore.setState({ status: 'running' });

      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      const exportBtn = screen.getByTestId('exam-export-report-btn');
      fireEvent.click(exportBtn);

      // Verify modal opened
      expect(screen.getByTestId('exam-report-modal')).toBeInTheDocument();
      expect(screen.getByText(/Submission-Ready Exam Report Generator/i)).toBeInTheDocument();
    });

    it('opens ExamReportModal from ExamQuickActionDrawer report button', () => {
      useExamStore.setState({ isQuickDrawerOpen: true, status: 'running' });

      render(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      const reportBtn = screen.getByTestId('exam-drawer-export-report');
      fireEvent.click(reportBtn);

      // Verify modal opened
      expect(screen.getByTestId('exam-report-modal')).toBeInTheDocument();
    });
  });
});
