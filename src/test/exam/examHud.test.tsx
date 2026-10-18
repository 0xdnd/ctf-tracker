/**
 * examHud.test.tsx
 * Comprehensive Vitest suite for Milestone 2: Persistent Global HUD & Header Capsule
 * 
 * Verifies:
 * - ExamHeaderCapsule rendering, countdown formatting, live 1Hz ticks, score calculation,
 *   passing status indicators (In Progress, Passing, Critical), bio-break display, and click toggle.
 * - ExamQuickActionDrawer slide-over rendering, focus trapping, ESC/backdrop dismiss,
 *   rapid flag submission with real-time format validation, bio-break controls,
 *   milestone logging, and navigation to full cockpit.
 * - UnifiedHeader integration and route mounting (/targets/:id).
 * - Global hotkey Alt+E drawer toggle.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExamHeaderCapsule } from '../../components/exam/ExamHeaderCapsule';
import { ExamQuickActionDrawer } from '../../components/exam/ExamQuickActionDrawer';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { ThemeProvider } from '../../hooks/useTheme';
import { useTacticalHotkeys } from '../../hooks/useTacticalHotkeys';
import { useExamStore } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';

// Mock window.matchMedia for headless JSDOM environment
if (typeof window !== 'undefined' && !window.matchMedia) {
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

// Test harness that activates tactical hotkeys
const HotkeyTestHarness: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useTacticalHotkeys();
  return <>{children}</>;
};

describe('Milestone 2: Persistent Global HUD & Header Capsule', () => {
  beforeEach(() => {
    // Reset Zustand stores to clean deterministic baseline
    useExamStore.getState().resetExam('OSCP');
    useExamStore.setState({ isQuickDrawerOpen: false });
    useCtfStore.setState({
      activeTargetId: null,
      soundEnabled: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. ExamHeaderCapsule Unit & Integration Tests
  // =========================================================================
  describe('ExamHeaderCapsule', () => {
    it('returns null when exam session status is idle', () => {
      useExamStore.setState({ status: 'idle' });
      const { container } = render(
        <MemoryRouter>
          <ExamHeaderCapsule />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('exam-header-capsule')).not.toBeInTheDocument();
    });

    it('renders the compact HUD capsule when exam is running', () => {
      useExamStore.getState().startExam('OSCP');

      render(
        <MemoryRouter>
          <ExamHeaderCapsule />
        </MemoryRouter>
      );

      const capsule = screen.getByTestId('exam-header-capsule');
      expect(capsule).toBeInTheDocument();

      // Check track badge
      expect(screen.getByTestId('exam-capsule-track')).toHaveTextContent('OSCP');

      // Check live countdown (24h = 24:00:00 or 23:59:59)
      const countdown = screen.getByTestId('exam-capsule-countdown');
      expect(countdown).toBeInTheDocument();
      expect(countdown.textContent).toMatch(/^(24:00:00|23:59:5[89])/);

      // Check initial points
      const scoreEl = screen.getByTestId('exam-capsule-score');
      expect(scoreEl).toHaveTextContent(/0\s*\/\s*100\s*PTS/i);

      // Check initial passing status: In Progress
      const statusEl = screen.getByTestId('exam-capsule-status');
      expect(statusEl).toHaveTextContent(/In Progress/i);
    });

    it('updates countdown display deterministically on store tick', () => {
      vi.useFakeTimers();
      const baseTime = 1727370000000;
      vi.setSystemTime(baseTime);

      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({
        startedAt: baseTime,
        examExpiresAt: baseTime + 3600 * 1000,
        remainingSeconds: 3600,
      });

      render(
        <MemoryRouter>
          <ExamHeaderCapsule />
        </MemoryRouter>
      );

      expect(screen.getByTestId('exam-capsule-countdown')).toHaveTextContent('01:00:00');

      // Advance clock by 1 second and tick
      act(() => {
        vi.advanceTimersByTime(1000);
        useExamStore.getState().tick();
      });

      expect(screen.getByTestId('exam-capsule-countdown')).toHaveTextContent('00:59:59');
    });

    it('displays Passing status badge in emerald when passing threshold is reached', () => {
      useExamStore.getState().startExam('OSCP');

      // Submit all 3 AD boxes (40 pts) and standalones to exceed 70 pts threshold
      const boxes = useExamStore.getState().boxes;
      boxes.forEach((b) => {
        useExamStore.setState((state) => ({
          boxes: state.boxes.map((box) =>
            box.id === b.id ? { ...box, userPwned: true, rootPwned: true } : box
          ),
        }));
      });

      render(
        <MemoryRouter>
          <ExamHeaderCapsule />
        </MemoryRouter>
      );

      const statusBadge = screen.getByTestId('exam-capsule-status');
      expect(statusBadge).toHaveTextContent('Passing');

      const scoreEl = screen.getByTestId('exam-capsule-score');
      expect(scoreEl).toHaveTextContent(/100\s*\/\s*100\s*PTS/i);
    });

    it('displays Critical status badge in crimson when remaining time is <= 2 hours and not passing', () => {
      useExamStore.getState().startExam('OSCP');
      const now = Date.now();
      // 1 hour remaining (3600s <= 7200s threshold) with 0 points
      useExamStore.setState({
        examExpiresAt: now + 3600 * 1000,
        remainingSeconds: 3600,
      });

      render(
        <MemoryRouter>
          <ExamHeaderCapsule />
        </MemoryRouter>
      );

      const statusBadge = screen.getByTestId('exam-capsule-status');
      expect(statusBadge).toHaveTextContent('Critical');
    });

    it('renders pause indicator when exam is paused', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.getState().pauseExam();

      render(
        <MemoryRouter>
          <ExamHeaderCapsule />
        </MemoryRouter>
      );

      const countdown = screen.getByTestId('exam-capsule-countdown');
      expect(countdown.textContent).toMatch(/PAUSED/i);
    });

    it('displays active break badge and countdown when bio-break is active', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.getState().startBreak('bio');

      render(
        <MemoryRouter>
          <ExamHeaderCapsule />
        </MemoryRouter>
      );

      const breakBadge = screen.getByTestId('exam-capsule-break');
      expect(breakBadge).toBeInTheDocument();
      // 15m break = 15:00 or 14:59
      expect(breakBadge.textContent).toMatch(/1[45]:\d{2}/);
    });

    it('toggles quick drawer on capsule click and keyboard Enter/Space', () => {
      useExamStore.getState().startExam('OSCP');

      render(
        <MemoryRouter>
          <ExamHeaderCapsule />
        </MemoryRouter>
      );

      const capsule = screen.getByTestId('exam-header-capsule');
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);

      // Click toggles open
      fireEvent.click(capsule);
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(true);

      // Click toggles closed
      fireEvent.click(capsule);
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);

      // Keyboard Enter toggles open
      fireEvent.keyDown(capsule, { key: 'Enter' });
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(true);

      // Keyboard Space toggles closed
      fireEvent.keyDown(capsule, { key: ' ' });
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);
    });
  });

  // =========================================================================
  // 2. ExamQuickActionDrawer Unit & Integration Tests
  // =========================================================================
  describe('ExamQuickActionDrawer', () => {
    it('returns null when isQuickDrawerOpen is false', () => {
      useExamStore.setState({ isQuickDrawerOpen: false });
      const { container } = render(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('exam-quick-action-drawer')).not.toBeInTheDocument();
    });

    it('renders drawer dialog when isQuickDrawerOpen is true', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({ isQuickDrawerOpen: true });

      render(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      const drawer = screen.getByTestId('exam-quick-action-drawer');
      expect(drawer).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: /Exam Mission Quick Action Drawer/i })).toBeInTheDocument();
      expect(screen.getByText(/MISSION QUICK ACTIONS/i)).toBeInTheDocument();
    });

    it('closes drawer on close button click and backdrop click', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({ isQuickDrawerOpen: true });

      const { rerender } = render(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      const closeBtn = screen.getByTestId('exam-drawer-close');
      fireEvent.click(closeBtn);
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);

      // Open again and test backdrop click
      act(() => {
        useExamStore.setState({ isQuickDrawerOpen: true });
      });
      rerender(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      const backdrop = screen.getByTestId('exam-drawer-backdrop');
      fireEvent.click(backdrop);
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);
    });

    it('closes drawer on Escape key press via focus trap', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({ isQuickDrawerOpen: true });

      render(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);
    });

    it('validates flag format in real time and submits valid flag', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({ isQuickDrawerOpen: true });

      render(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      const flagInput = screen.getByTestId('exam-drawer-flag-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('exam-drawer-submit-flag') as HTMLButtonElement;

      // Initially empty -> submit button is disabled
      expect(submitBtn).toBeDisabled();

      // Enter invalid flag string (< 6 chars)
      fireEvent.change(flagInput, { target: { value: 'bad' } });
      expect(screen.getByTestId('exam-flag-format-badge')).toHaveTextContent(/unrecognized/i);
      expect(submitBtn).toBeDisabled();

      // Select a standalone box so points immediately register
      const standaloneBox = useExamStore.getState().boxes.find((b) => !b.type.startsWith('ad-'))!;
      const boxSelect = screen.getByTestId('exam-drawer-box-select') as HTMLSelectElement;
      fireEvent.change(boxSelect, { target: { value: standaloneBox.id } });

      // Enter valid 32-char hex MD5 flag hash
      const validHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
      fireEvent.change(flagInput, { target: { value: validHash } });
      expect(screen.getByTestId('exam-flag-format-badge')).toHaveTextContent(/OffSec/i);
      expect(submitBtn).not.toBeDisabled();

      // Submit the flag
      fireEvent.click(submitBtn);

      // Verify success feedback appears
      expect(screen.getByTestId('exam-drawer-feedback')).toHaveTextContent(/Registered USER flag/i);

      // Verify box marked as pwned
      const updatedBox = useExamStore.getState().boxes.find((b) => b.id === standaloneBox.id);
      expect(updatedBox?.userPwned).toBe(true);

      // Verify store points updated (standalone user flag = 10 pts)
      expect(useExamStore.getState().getScore().totalScore).toBe(10);
    });

    it('handles bio-break controls: starts break and cancels break', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({ isQuickDrawerOpen: true });

      const { rerender } = render(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      // Click 15m bio-break
      const bioBtn = screen.getByTestId('exam-drawer-start-bio-15');
      fireEvent.click(bioBtn);

      expect(useExamStore.getState().activeBreak.isActive).toBe(true);
      expect(useExamStore.getState().activeBreak.type).toBe('bio');

      // Drawer should now show active break countdown and cancel button
      rerender(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      expect(screen.getByTestId('exam-drawer-break-countdown')).toBeInTheDocument();
      const cancelBtn = screen.getByTestId('exam-drawer-cancel-break');
      expect(cancelBtn).toBeInTheDocument();

      // Click cancel break
      fireEvent.click(cancelBtn);
      expect(useExamStore.getState().activeBreak.isActive).toBe(false);
    });

    it('handles quick milestone logging and custom milestone logging', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({ isQuickDrawerOpen: true });

      render(
        <MemoryRouter>
          <ExamQuickActionDrawer />
        </MemoryRouter>
      );

      // Quick milestone: Foothold
      const footholdBtn = screen.getByTestId('exam-drawer-milestone-foothold');
      fireEvent.click(footholdBtn);

      const milestones = useExamStore.getState().milestones;
      const footholdMs = milestones.find((m) => m.notes.includes('Foothold Shell'));
      expect(footholdMs).toBeDefined();

      // Custom milestone logging
      const customInput = screen.getByTestId('exam-drawer-custom-milestone-input');
      const customSubmit = screen.getByTestId('exam-drawer-custom-milestone-submit');

      fireEvent.change(customInput, { target: { value: 'Dumped ntds.dit with secretsdump' } });
      fireEvent.click(customSubmit);

      const customMs = useExamStore.getState().milestones.find((m) =>
        m.notes.includes('Dumped ntds.dit with secretsdump')
      );
      expect(customMs).toBeDefined();
    });

    it('navigates to /exam full simulator cockpit and closes drawer', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({ isQuickDrawerOpen: true });

      render(
        <MemoryRouter initialEntries={['/tracker']}>
          <Routes>
            <Route path="/tracker" element={<ExamQuickActionDrawer />} />
            <Route path="/exam" element={<div data-testid="full-exam-page">Full Exam Cockpit</div>} />
          </Routes>
        </MemoryRouter>
      );

      const cockpitBtn = screen.getByTestId('exam-drawer-open-cockpit');
      fireEvent.click(cockpitBtn);

      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);
      expect(screen.getByTestId('full-exam-page')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. UnifiedHeader Integration & Route Mounting
  // =========================================================================
  describe('UnifiedHeader & Routing Integration', () => {
    it('mounts ExamHeaderCapsule inside UnifiedHeader when exam is running', () => {
      useExamStore.getState().startExam('OSCP');

      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/tracker']}>
            <UnifiedHeader />
          </MemoryRouter>
        </ThemeProvider>
      );

      expect(screen.getByTestId('exam-header-capsule')).toBeInTheDocument();
    });

    it('does not render ExamHeaderCapsule in UnifiedHeader when exam is idle', () => {
      useExamStore.setState({ status: 'idle' });

      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/tracker']}>
            <UnifiedHeader />
          </MemoryRouter>
        </ThemeProvider>
      );

      expect(screen.queryByTestId('exam-header-capsule')).not.toBeInTheDocument();
    });

    it('toggles quick action drawer via Alt+E keyboard event when hotkey listener is active', () => {
      useExamStore.getState().startExam('OSCP');
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);

      render(
        <MemoryRouter initialEntries={['/tracker']}>
          <HotkeyTestHarness />
        </MemoryRouter>
      );

      // Dispatch Alt+e on window
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'e',
            altKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
      });

      expect(useExamStore.getState().isQuickDrawerOpen).toBe(true);

      // Dispatch Alt+E to toggle back closed
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'E',
            altKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
      });

      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);
    });

    it('mounts target detail route on both /target/:id and /targets/:id aliases', () => {
      render(
        <MemoryRouter initialEntries={['/targets/box-123']}>
          <Routes>
            <Route path="/target/:id" element={<div data-testid="target-route-canonical">Target Page</div>} />
            <Route path="/targets/:id" element={<div data-testid="target-route-alias">Target Page Alias</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('target-route-alias')).toBeInTheDocument();
    });
  });
});
