import React, { useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import axe from 'axe-core';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { FloatingPayloadBar } from '../../components/common/FloatingPayloadBar';
import { useCtfStore } from '../../store/useCtfStore';

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
});
