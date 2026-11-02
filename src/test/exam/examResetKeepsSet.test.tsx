import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Difficulty, Machine, OperatingSystem } from '../../types';

const CATALOG = vi.hoisted(() => {
  const out: Machine[] = [];
  let n = 0;
  for (const os of ['Linux', 'Windows'] as OperatingSystem[]) {
    for (const difficulty of ['Easy', 'Medium', 'Hard'] as Difficulty[]) {
      for (let i = 0; i < 12; i++) {
        const id = `m${String(++n).padStart(3, '0')}`;
        out.push({
          id,
          name: id.toUpperCase(),
          ip: '10.10.10.10',
          os,
          platform: 'HTB',
          difficulty,
          status: 'backlog',
          tags: os === 'Windows' && i % 3 === 0 ? ['Active Directory'] : [],
          certifications: i % 2 === 0 ? ['OSCP', 'CPTS'] : [],
          timeSpentSeconds: 0,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        } as Machine);
      }
    }
  }
  return out;
});

// The page loads the catalog lazily; the CTF store's own use of it is left untouched (reports not loaded).
vi.mock('../../data/loadMachinesCatalog', () => ({
  getLoadedMachinesCatalog: () => null,
  loadMachinesCatalog: () => Promise.resolve(CATALOG),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { ExamSimulatorPage } from '../../pages/ExamSimulatorPage';
import { Sidebar } from '../../components/layout/Sidebar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useExamStore } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useConfirmStore } from '../../store/useConfirmStore';

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

const FLAG = 'a3f789e02c1145b209d84e1bfa892104';
const store = () => useExamStore.getState();
const slots = () => store().boxes.map((b) => `${b.id}:${b.machineId ?? b.name}`);

afterEach(() => {
  act(() => useConfirmStore.getState().settle(false));
  cleanup();
});

describe('resetExam keeps the seed and brings back the same mock machines', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({ soundEnabled: false });
    store().resetExam('OSCP', CATALOG);
  });

  it('restores the same boxes with progress, proofs, notes and milestones cleared', () => {
    const seed = store().seed;
    const before = slots();
    expect(before.some((s) => s.includes(':m'))).toBe(true); // filled from the catalog, not the fallback set

    store().startExam('OSCP', undefined, CATALOG);
    const target = store().boxes[3];
    expect(store().submitFlag(target.id, 'user', FLAG)).toBe(true);
    store().setScratchNotes('creds: admin');
    expect(store().boxes[3].userPwned).toBe(true);

    store().resetExam('OSCP', CATALOG);

    expect(store().status).toBe('idle');
    expect(store().seed).toBe(seed);
    expect(slots()).toEqual(before);
    expect(store().boxes.every((b) => !b.userPwned && !b.rootPwned && !b.userProof.flagText && !b.rootProof.flagText)).toBe(true);
    expect(store().scratchNotes).not.toContain('creds: admin');
    expect(store().milestones).toEqual([]);
  });

  it('also restores the same boxes when the exam was already idle', () => {
    const seed = store().seed;
    const before = slots();
    store().resetExam('OSCP', CATALOG);
    store().resetExam('OSCP', CATALOG);
    expect(store().seed).toBe(seed);
    expect(slots()).toEqual(before);
  });

  it('keeps the seed even when no catalog is passed (the page re-rolls from it once loaded)', () => {
    const seed = store().seed;
    store().resetExam('OSCP');
    expect(store().seed).toBe(seed);
    const fallback = slots();
    store().setSeed(seed, CATALOG);
    expect(store().seed).toBe(seed);
    expect(slots()).not.toEqual(fallback); // the catalog roll from the same seed replaces the fallback set
  });

  it('still lets the user roll a different set', () => {
    const seed = store().seed;
    store().shuffleTargets(CATALOG);
    expect(store().seed).not.toBe(seed);
  });

  it('keeps the seed when the reset switches track', () => {
    const seed = store().seed;
    store().resetExam('CPTS', CATALOG);
    expect(store().track).toBe('CPTS');
    expect(store().seed).toBe(seed);
  });

  it('the reset button on a running exam shows the same machines on the setup screen', async () => {
    const seed = store().seed;
    const before = slots();
    store().startExam('OSCP', undefined, CATALOG);
    store().submitFlag(store().boxes[3].id, 'user', FLAG);

    render(
      <MemoryRouter>
        <ExamSimulatorPage />
        <ConfirmDialog />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('exam-timer-reset-btn'));
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: 'Reset exam' }));

    await waitFor(() => expect(store().status).toBe('idle'));
    expect(await screen.findByTestId('exam-setup-view')).toBeInTheDocument();
    expect(screen.getByTestId('exam-seed-display')).toHaveTextContent(seed);
    // The set is correct right after the reset and stays so once the page's own re-roll from the seed has run
    expect(slots()).toEqual(before);
    await act(async () => { await Promise.resolve(); });
    expect(slots()).toEqual(before);
  });
});

describe('sidebar exam badge follows the selected track', () => {
  beforeEach(() => {
    localStorage.clear();
    store().resetExam('OSCP', CATALOG);
  });

  it('shows the default track and updates when the track changes', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    const examButton = () => screen.getByRole('button', { name: /Exam Simulator/ });
    expect(examButton()).toHaveTextContent('OSCP');

    act(() => store().setTrack('CPTS', CATALOG));
    expect(examButton()).toHaveTextContent('CPTS');
    expect(examButton()).not.toHaveTextContent('OSCP');
  });
});
