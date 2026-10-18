import React, { useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { FloatingPayloadBar } from '../../components/common/FloatingPayloadBar';
import { CyberSelect } from '../../components/common/CyberSelect';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { RevShellModal } from '../../components/common/RevShellModal';
import { ExamSimulatorPage } from '../../pages/ExamSimulatorPage';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
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

// Test harness component to exercise useFocusTrap in full DOM context
function FocusTrapModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const containerRef = useFocusTrap({ isActive: isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="modal-backdrop"
    >
      <h2 id="modal-title">Tactical Operations Modal</h2>
      <button type="button" id="btn-first" aria-label="First action">
        First Button
      </button>
      <input type="text" id="input-middle" placeholder="Tactical Input" aria-label="Tactical Input" />
      <button type="button" id="btn-last" aria-label="Close dialog" onClick={onClose}>
        Last Button
      </button>
    </div>
  );
}

function FocusTrapTriggerWrapper() {
  const [open, setOpen] = useState(false);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <button
        ref={triggerBtnRef}
        id="trigger-btn"
        type="button"
        onClick={() => setOpen(true)}
      >
        Open Modal
      </button>
      <FocusTrapModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

describe('Layer 2: WCAG 2.1 AA Accessibility & Focus Trapping Assault', () => {
  beforeEach(() => {
    useCtfStore.setState({
      globalVars: {
        lhost: '10.10.14.99',
        lport: '9001',
        targetIp: '10.10.10.200',
        interface: 'tun0',
        customVars: {},
      },
      activeTargetId: null,
      soundEnabled: false,
    });
    useExamStore.getState().resetExam();
  });

  afterEach(() => {
    cleanup();
  });

  it('A11Y-1: Automated axe-core scan asserts 0 critical or serious violations on interactive components', async () => {
    const { container } = render(<FloatingPayloadBar />);

    const results = await axe.run(container, {
      rules: {
        // In jsdom without real CSS layout engines, color-contrast can yield false positives
        'color-contrast': { enabled: false },
      },
    });

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSerious).toEqual([]);
  });

  it('A11Y-2: useFocusTrap traps keyboard focus within active modal (Tab wrap-around to first)', async () => {
    render(<FocusTrapTriggerWrapper />);
    const trigger = screen.getByRole('button', { name: 'Open Modal' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open modal
    fireEvent.click(trigger);

    // Wait for auto-focus on first interactive element
    await waitFor(() => {
      const firstBtn = screen.getByRole('button', { name: 'First action' });
      expect(document.activeElement).toBe(firstBtn);
    });

    const firstBtn = screen.getByRole('button', { name: 'First action' });
    const lastBtn = screen.getByRole('button', { name: 'Close dialog' });

    // Focus on the last button and press Tab -> MUST wrap around to the first button
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    fireEvent.keyDown(lastBtn, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstBtn);
  });

  it('A11Y-3: useFocusTrap traps keyboard focus backwards (Shift+Tab wrap-around to last)', async () => {
    render(<FocusTrapTriggerWrapper />);
    const trigger = screen.getByRole('button', { name: 'Open Modal' });
    fireEvent.click(trigger);

    await waitFor(() => {
      const firstBtn = screen.getByRole('button', { name: 'First action' });
      expect(document.activeElement).toBe(firstBtn);
    });

    const firstBtn = screen.getByRole('button', { name: 'First action' });
    const lastBtn = screen.getByRole('button', { name: 'Close dialog' });

    // Focus on first button and press Shift+Tab -> MUST wrap around to the last button
    firstBtn.focus();
    expect(document.activeElement).toBe(firstBtn);

    fireEvent.keyDown(firstBtn, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastBtn);
  });

  it('A11Y-4: Pressing Escape invokes dismiss callback and restores focus to triggering element', async () => {
    render(<FocusTrapTriggerWrapper />);
    const trigger = screen.getByRole('button', { name: 'Open Modal' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open modal
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Focus is restored to the element that triggered the modal
    expect(document.activeElement).toBe(trigger);
  });

  it('A11Y-5: Modal dialog maintains valid accessibility roles, aria-modal, and labelledby', () => {
    render(<FocusTrapModal isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(screen.getByText('Tactical Operations Modal')).toHaveAttribute('id', 'modal-title');
  });

  it('A11Y-6: CyberSelect trigger button complies with WCAG 2.1 SC 2.5.3 (Label-in-Name)', () => {
    const options = [
      { value: 'all', label: 'All Certifications' },
      { value: 'oscp', label: 'OffSec OSCP' },
    ];

    // 1. With explicit ariaLabel that diverges from visible label:
    // Accessible name MUST include visible label "OffSec OSCP"
    const { unmount } = render(
      <CyberSelect
        id="cert-select"
        label="Certification"
        ariaLabel="Filter Certification"
        value="oscp"
        options={options}
        onChange={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: /OffSec OSCP/ });
    expect(button).toBeInTheDocument();
    const ariaLabel = button.getAttribute('aria-label');
    expect(ariaLabel).toContain('OffSec OSCP');
    expect(ariaLabel?.toLowerCase()).toContain('filter certification');
    unmount();

    // 2. With placeholder when no option selected
    render(
      <CyberSelect
        id="track-select"
        placeholder="Select Practice Track..."
        ariaLabel="More Practice Tracks"
        value=""
        options={options}
        onChange={() => {}}
      />
    );
    const placeholderBtn = screen.getByRole('button', { name: /Select Practice Track/ });
    expect(placeholderBtn).toBeInTheDocument();
    const placeholderAria = placeholderBtn.getAttribute('aria-label');
    expect(placeholderAria).toContain('Select Practice Track...');
  });

  it('A11Y-7: UnifiedHeader variable copy and RevShell buttons comply with Label-in-Name', () => {
    useCtfStore.setState({
      globalVars: {
        lhost: '10.10.14.99',
        lport: '9001',
        targetIp: '10.10.10.200',
        interface: 'tun0',
        customVars: {},
      },
    });

    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

    // Variable inputs and copy buttons comply with accessibility naming
    const copyLhostBtn = screen.getByRole('button', { name: /Copy LHOST/i });
    expect(copyLhostBtn).toBeInTheDocument();
    expect(screen.getByLabelText('Attacker IP (LHOST)')).toHaveValue('10.10.14.99');

    const copyTargetBtn = screen.getByRole('button', { name: /Copy Target IP/i });
    expect(copyTargetBtn).toBeInTheDocument();
    expect(screen.getByLabelText('Target IP (RHOST)')).toHaveValue('10.10.10.200');

    const copyLportBtn = screen.getByRole('button', { name: /Copy LPORT/i });
    expect(copyLportBtn).toBeInTheDocument();
    expect(screen.getByLabelText('Listener Port (LPORT)')).toHaveValue('9001');

    // RevShell button: visible text is RevShell (prompt >_ is aria-hidden)
    const revShellBtn = screen.getByRole('button', { name: /RevShell/ });
    expect(revShellBtn).toBeInTheDocument();
    expect(revShellBtn.getAttribute('aria-label')).toContain('RevShell');
  });

  it('A11Y-8: Form inputs in RevShellModal and ExamSimulatorPage have associated labels with htmlFor and id', () => {
    // 1. RevShellModal
    useCtfStore.setState({ revShellModalOpen: true });
    const { unmount } = render(
      <MemoryRouter>
        <RevShellModal />
      </MemoryRouter>
    );

    const lhostInput = screen.getByLabelText(/LHOST/i);
    expect(lhostInput).toBeInTheDocument();
    expect(lhostInput).toHaveAttribute('id', 'revshell-lhost');

    const lportInput = screen.getByLabelText(/LPORT/i);
    expect(lportInput).toBeInTheDocument();
    expect(lportInput).toHaveAttribute('id', 'revshell-lport');

    const rhostInput = screen.getByLabelText(/RHOST/i);
    expect(rhostInput).toBeInTheDocument();
    expect(rhostInput).toHaveAttribute('id', 'revshell-rhost');

    // Close button has accessible name
    const closeBtn = screen.getByRole('button', { name: 'Close Reverse Shell Generator' });
    expect(closeBtn).toBeInTheDocument();
    unmount();

    // 2. ExamSimulatorPage
    render(
      <MemoryRouter>
        <ExamSimulatorPage />
      </MemoryRouter>
    );

    const candidateName = screen.getByLabelText(/Candidate Full Name/i);
    expect(candidateName).toBeInTheDocument();
    expect(candidateName).toHaveAttribute('id', 'candidate-name');

    const candidateCallsign = screen.getByLabelText(/Candidate Callsign/i);
    expect(candidateCallsign).toBeInTheDocument();
    expect(candidateCallsign).toHaveAttribute('id', 'candidate-callsign');

    const candidateOsid = screen.getByLabelText(/OffSec OSID/i);
    expect(candidateOsid).toBeInTheDocument();
    expect(candidateOsid).toHaveAttribute('id', 'candidate-osid');
  });
});
