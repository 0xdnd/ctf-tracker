/**
 * examDashboard.test.tsx
 * Comprehensive Vitest Suite for Milestone 3: Dedicated Simulator Dashboard & Evidence Dropzone
 * 
 * Verifies:
 * - ExamSimulatorPage:
 *   - Idle state renders pre-flight setup view with track rulesets and candidate config
 *   - Start exam transition to active cockpit view
 *   - Active cockpit renders live telemetry (score, countdown, pacing, targets)
 *   - Pause and resume timer controls
 *   - Target expansion and evidence drawer integration
 *   - Completed state renders final debrief and score
 *   - Visual victory celebration banner when passing threshold (>=70 pts) is reached
 *   - Report export triggering
 * - ExamEvidenceDropzone:
 *   - Interactive checklist inputs (flag, whoami, ipconfig)
 *   - Real-time flag validation (valid OffSec MD5 hex vs invalid)
 *   - Offline image file ingestion and canvas downscaling
 *   - Clipboard paste (Ctrl+V) handler
 *   - Caption editing and deletion of screenshot proofs
 *   - Real-time compliance badge (Incomplete vs OffSec Compliant)
 *   - Automatic milestone timestamping
 * - ExamBioBreakModal:
 *   - Visibility controls (isOpen true/false)
 *   - Presets (15m bio, 30m food, 2h rest, custom)
 *   - Active break countdown display
 *   - Break cancellation and conclusion
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, waitForElementToBeRemoved, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamSimulatorPage } from '../../pages/ExamSimulatorPage';
import { ExamEvidenceDropzone, downscaleImageFile } from '../../components/exam/ExamEvidenceDropzone';
import { ExamBioBreakModal } from '../../components/exam/ExamBioBreakModal';
import { useExamStore } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

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

  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();

  HTMLAnchorElement.prototype.click = vi.fn();

  if (HTMLCanvasElement.prototype.getContext === undefined) {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    });
  }
}

describe('Milestone 3: Dedicated Simulator Dashboard & Evidence Dropzone', () => {
  beforeEach(() => {
    // Reset Zustand store to clean baseline
    useExamStore.getState().resetExam('OSCP');
    useExamStore.setState({
      status: 'idle',
      candidateName: 'Daniel Dayan',
      candidateCallsign: '0xdnd',
      osid: 'OS-94821',
      includeBonusPoints: false,
    });
    useCtfStore.setState({
      soundEnabled: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. ExamSimulatorPage Tests
  // =========================================================================
  describe('ExamSimulatorPage', () => {
    it('renders the setup view when status is idle', () => {
      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('exam-setup-view')).toBeInTheDocument();
      expect(screen.getByTestId('exam-start-btn')).toBeInTheDocument();
      expect(screen.getByText(/ZEROBOX \/\/ CERTIFICATION EXAM SIMULATOR/i)).toBeInTheDocument();

      // Track selection cards
      expect(screen.getByTestId('exam-track-select-oscp')).toBeInTheDocument();
      expect(screen.getByTestId('exam-track-select-cpts')).toBeInTheDocument();
      expect(screen.getByTestId('exam-track-select-crto')).toBeInTheDocument();
    });

    it('switches tracks in setup view and updates target sets', () => {
      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      const cptsCard = screen.getByTestId('exam-track-select-cpts');
      fireEvent.click(cptsCard);

      expect(useExamStore.getState().track).toBe('CPTS');
      expect(screen.getByText(/Hack The Box CPTS/i)).toBeInTheDocument();
    });

    it('launches exam from setup view and mounts active cockpit', () => {
      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      const startBtn = screen.getByTestId('exam-start-btn');
      fireEvent.click(startBtn);

      expect(useExamStore.getState().status).toBe('running');
      expect(screen.getByTestId('exam-active-cockpit')).toBeInTheDocument();
      expect(screen.getByTestId('exam-score-display')).toHaveTextContent(/0\s*\/\s*100\s*PTS/i);
      expect(screen.getByTestId('exam-countdown-timer')).toBeInTheDocument();
    });

    it('pauses and resumes exam clock from cockpit telemetry controls', () => {
      useExamStore.getState().startExam('OSCP');

      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('exam-active-cockpit')).toBeInTheDocument();
      const toggleBtn = screen.getByTestId('exam-timer-toggle-btn');

      // Pause
      fireEvent.click(toggleBtn);
      expect(useExamStore.getState().status).toBe('paused');

      // Resume
      fireEvent.click(toggleBtn);
      expect(useExamStore.getState().status).toBe('running');
    });

    it('resets exam session when reset button is clicked', () => {
      useExamStore.getState().startExam('OSCP');

      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      const resetBtn = screen.getByTestId('exam-timer-reset-btn');
      fireEvent.click(resetBtn);

      expect(useExamStore.getState().status).toBe('idle');
      expect(screen.getByTestId('exam-setup-view')).toBeInTheDocument();
    });

    it('renders completion view when status is completed', () => {
      useExamStore.setState({ status: 'completed' });

      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('exam-completion-view')).toBeInTheDocument();
      expect(screen.getByText(/EXAM SESSION CONCLUDED/i)).toBeInTheDocument();
    });

    it('displays visual victory celebration banner when score reaches passing threshold', async () => {
      useExamStore.getState().startExam('OSCP');

      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      // Initially no victory banner
      expect(screen.queryByTestId('exam-victory-banner')).not.toBeInTheDocument();

      // Submit flags to reach 70 points
      const boxes = useExamStore.getState().boxes;
      const validHash = 'c4ca4238a0b923820dcc509a6f75849b';

      act(() => {
        // Pwn all AD targets (40 pts all-or-nothing in OSCP)
        const adTargets = boxes.filter((b) => b.type.startsWith('ad-'));
        adTargets.forEach((t) => {
          if (t.userPoints > 0) useExamStore.getState().submitFlag(t.id, 'user', validHash);
          if (t.rootPoints > 0) useExamStore.getState().submitFlag(t.id, 'root', validHash);
        });

        // Pwn 2 standalones (10 + 10 + 10 = 30 pts) -> 70 pts total
        const standalones = boxes.filter((b) => !b.type.startsWith('ad'));
        useExamStore.getState().submitFlag(standalones[0].id, 'user', validHash);
        useExamStore.getState().submitFlag(standalones[0].id, 'root', validHash);
        useExamStore.getState().submitFlag(standalones[1].id, 'user', validHash);
      });

      await waitFor(() => {
        expect(screen.getByTestId('exam-victory-banner')).toBeInTheDocument();
      });
      expect(screen.getByText(/PASSING THRESHOLD SURPASSED!/i)).toBeInTheDocument();
    });

    it('opens bio-break modal when bio-break button is clicked in cockpit', () => {
      useExamStore.getState().startExam('OSCP');

      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      const bioBreakBtn = screen.getByTestId('exam-open-bio-break-btn');
      fireEvent.click(bioBreakBtn);

      expect(screen.getByTestId('exam-bio-break-modal')).toBeInTheDocument();
    });

    it('exports markdown exam report when export button is clicked', () => {
      useExamStore.getState().startExam('OSCP');

      render(
        <MemoryRouter>
          <ExamSimulatorPage />
        </MemoryRouter>
      );

      const exportBtn = screen.getByTestId('exam-export-report-btn');
      fireEvent.click(exportBtn);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. ExamEvidenceDropzone Tests
  // =========================================================================
  describe('ExamEvidenceDropzone', () => {
    it('renders checklist inputs for flag, whoami, and ipconfig', () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[3]; // Standalone

      render(
        <ExamEvidenceDropzone box={box} flagType="user" />
      );

      expect(screen.getByTestId('evidence-dropzone')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-flag-input')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-whoami-input')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-ipconfig-input')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-paste-area')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-compliance-badge')).toHaveTextContent(/EVIDENCE INCOMPLETE/i);
    });

    it('validates flag format in real time and automatically submits valid flag', () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[3];

      render(
        <ExamEvidenceDropzone box={box} flagType="user" />
      );

      const flagInput = screen.getByTestId('evidence-flag-input');

      // Invalid flag (< 6 chars)
      fireEvent.change(flagInput, { target: { value: 'bad' } });
      expect(screen.getByText(/Invalid/i)).toBeInTheDocument();
      expect(useExamStore.getState().boxes.find((b) => b.id === box.id)?.userPwned).toBe(false);

      // Valid 32-char hex MD5 flag
      const validHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
      fireEvent.change(flagInput, { target: { value: validHash } });

      expect(screen.getByText(/OFFSEC \(MD5\)/i)).toBeInTheDocument();
      expect(useExamStore.getState().boxes.find((b) => b.id === box.id)?.userPwned).toBe(true);
    });

    it('updates whoami and ipconfig outputs in the store', () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[3];

      render(
        <ExamEvidenceDropzone box={box} flagType="user" />
      );

      const whoamiInput = screen.getByTestId('evidence-whoami-input');
      fireEvent.change(whoamiInput, { target: { value: 'offsec\\alice' } });

      const ipconfigInput = screen.getByTestId('evidence-ipconfig-input');
      fireEvent.change(ipconfigInput, { target: { value: 'inet 192.168.1.100/24' } });

      const updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
      expect(updatedBox.userProof.whoamiOutput).toBe('offsec\\alice');
      expect(updatedBox.userProof.ipconfigOutput).toBe('inet 192.168.1.100/24');
    });

    it('ingests image via file input and registers screenshot proof', async () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[3];

      render(
        <ExamEvidenceDropzone box={box} flagType="user" />
      );

      const fileInput = screen.getByTestId('evidence-file-input') as HTMLInputElement;
      const file = new File(['mock-image-binary-data'], 'terminal_proof.png', {
        type: 'image/png',
      });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        const updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
        expect(updatedBox.userProof.screenshots?.length).toBeGreaterThan(0);
      });

      const updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
      const sc = updatedBox.userProof.screenshots![0];
      expect(screen.getByTestId(`screenshot-card-${sc.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`screenshot-delete-btn-${sc.id}`)).toBeInTheDocument();
    });

    it('ingests image via clipboard paste event', async () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[3];

      render(
        <ExamEvidenceDropzone box={box} flagType="user" />
      );

      const dropzone = screen.getByTestId('evidence-dropzone');
      const file = new File(['pasted-image-bytes'], 'clipboard.png', { type: 'image/png' });

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => file,
            },
          ],
        },
      });

      await act(async () => {
        dropzone.dispatchEvent(pasteEvent);
      });

      await waitFor(() => {
        const updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
        expect(updatedBox.userProof.screenshots?.length).toBeGreaterThan(0);
      });
    });

    it('allows editing screenshot caption and deleting screenshot', async () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[3];

      // Add a screenshot manually into store
      act(() => {
        useExamStore.getState().addScreenshot(box.id, 'user', {
          id: 'sc_test_1',
          dataUrl: 'data:image/jpeg;base64,sample',
          caption: 'Initial caption',
          timestamp: new Date().toISOString(),
          sizeBytes: 1024,
        });
      });

      render(
        <ExamEvidenceDropzone box={box} flagType="user" />
      );

      expect(screen.getByText('Initial caption')).toBeInTheDocument();

      // Click edit caption button
      const editBtn = screen.getByTitle('Edit caption');
      fireEvent.click(editBtn);

      const captionInput = screen.getByTestId('screenshot-caption-input-sc_test_1');
      fireEvent.change(captionInput, { target: { value: 'Updated proof caption' } });

      const saveBtn = screen.getByTitle('Save caption');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        const updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
        expect(updatedBox.userProof.screenshots![0].caption).toBe('Updated proof caption');
      });

      // Delete screenshot
      const deleteBtn = screen.getByTestId('screenshot-delete-btn-sc_test_1');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        const updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
        expect(updatedBox.userProof.screenshots?.length).toBe(0);
      });
    });

    it('shows OFFSEC COMPLIANT badge when all evidence requirements are met', () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[3];

      // Fill in all proof criteria
      act(() => {
        useExamStore.getState().updateProof(box.id, 'user', {
          flagText: '4f5343505f6c6f63616c5f666c616731', // valid 32-hex
          whoamiOutput: 'offsec\\alice',
          ipconfigOutput: 'inet 192.168.1.10/24',
          screenshotTaken: true,
          screenshots: [
            {
              id: 'sc_compliant_1',
              dataUrl: 'data:image/jpeg;base64,data',
              caption: 'proof',
              timestamp: new Date().toISOString(),
            },
          ],
        });
        useExamStore.getState().submitFlag(box.id, 'user', '4f5343505f6c6f63616c5f666c616731');
      });

      render(
        <ExamEvidenceDropzone boxId={box.id} flagType="user" />
      );

      const badge = screen.getByTestId('evidence-compliance-badge');
      expect(badge).toHaveTextContent(/OFFSEC COMPLIANT/i);
    });
  });

  // =========================================================================
  // 3. ExamBioBreakModal Tests
  // =========================================================================
  describe('ExamBioBreakModal', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(
        <ExamBioBreakModal isOpen={false} onClose={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('exam-bio-break-modal')).not.toBeInTheDocument();
    });

    it('renders modal with break presets when isOpen is true', () => {
      render(
        <ExamBioBreakModal isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByTestId('exam-bio-break-modal')).toBeInTheDocument();
      expect(screen.getByTestId('break-preset-bio-15')).toBeInTheDocument();
      expect(screen.getByTestId('break-preset-food-30')).toBeInTheDocument();
      expect(screen.getByTestId('break-preset-rest-120')).toBeInTheDocument();
    });

    it('starts a 15m bio break and displays active countdown panel', () => {
      render(
        <ExamBioBreakModal isOpen={true} onClose={vi.fn()} />
      );

      const bio15Btn = screen.getByTestId('break-preset-bio-15');
      fireEvent.click(bio15Btn);

      const state = useExamStore.getState();
      expect(state.activeBreak.isActive).toBe(true);
      expect(state.activeBreak.type).toBe('bio');

      expect(screen.getByTestId('active-break-panel')).toBeInTheDocument();
      expect(screen.getByTestId('break-countdown')).toHaveTextContent(/15:00|14:59/);
    });

    it('cancels an active break when cancel button is clicked', () => {
      act(() => {
        useExamStore.getState().startBreak('food');
      });

      render(
        <ExamBioBreakModal isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByTestId('active-break-panel')).toBeInTheDocument();

      const cancelBtn = screen.getByTestId('break-cancel-btn');
      fireEvent.click(cancelBtn);

      expect(useExamStore.getState().activeBreak.isActive).toBe(false);
      expect(screen.getByTestId('break-preset-bio-15')).toBeInTheDocument();
    });

    it('removes modal content from the DOM after isOpen flips to false (exit animation)', async () => {
      const { rerender } = render(
        <ExamBioBreakModal isOpen={true} onClose={vi.fn()} />
      );
      expect(screen.getByTestId('exam-bio-break-modal')).toBeInTheDocument();

      rerender(<ExamBioBreakModal isOpen={false} onClose={vi.fn()} />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('exam-bio-break-modal'));
      expect(screen.queryByTestId('exam-bio-break-dialog-container')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onCloseMock = vi.fn();
      render(
        <ExamBioBreakModal isOpen={true} onClose={onCloseMock} />
      );

      const closeBtn = screen.getByTestId('break-modal-close');
      fireEvent.click(closeBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 4. Utility & Image Processing Tests
  // =========================================================================
  describe('downscaleImageFile helper', () => {
    it('resolves a base64 data URI for an image file', async () => {
      const file = new File(['binary-content-of-image'], 'screenshot.png', {
        type: 'image/png',
      });
      const dataUri = await downscaleImageFile(file, 1280, 0.8);
      expect(dataUri).toMatch(/^data:image\//);
    });

    it('rejects if file is not an image', async () => {
      const file = new File(['text content'], 'notes.txt', {
        type: 'text/plain',
      });
      await expect(downscaleImageFile(file)).rejects.toThrow('Selected file is not an image');
    });
  });
});
