import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { ExamHeaderCapsule } from '../../components/exam/ExamHeaderCapsule';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';
import type { Machine } from '../../types';
import { openSessionPanel } from './openSessionPanel';

describe('header controls stay reachable at every width', () => {
  it('keeps the pentest report shortcut in the Session popover, with no per-breakpoint ladder', async () => {
    useCtfStore.setState({
      activeTargetId: 'm1',
      machines: [
        { id: 'm1', name: 'Luanne', ip: '10.10.10.218', platform: 'HTB', status: 'foothold', difficulty: 'Easy', os: 'BSD', tags: [], certifications: [], timeSpentSeconds: 1, createdAt: new Date().toISOString() } as unknown as Machine,
      ],
    });
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>,
    );
    // Not in the bar itself, so it cannot crowd the exam clock.
    expect(screen.queryByRole('button', { name: 'Pentest report for Luanne' })).toBeNull();
    await openSessionPanel();
    const btn = screen.getByRole('button', { name: 'Pentest report for Luanne' });
    expect(btn.className).not.toMatch(/\b(?:hidden|2xl:flex|xl:flex)\b/);
    fireEvent.click(btn);
    expect(useCtfStore.getState().reportMachineId).toBe('m1');
  });

  it('keeps the exam capsule chevron visible at every size', () => {
    useExamStore.getState().startExam('OSCP');
    render(
      <MemoryRouter>
        <ExamHeaderCapsule />
      </MemoryRouter>,
    );
    const chevron = screen.getByTestId('exam-header-capsule').querySelector('svg.lucide-chevron-down');
    expect(chevron).not.toBeNull();
    expect(chevron?.getAttribute('class')).not.toMatch(/\bhidden\b/);
  });

  it('never hides the exam capsule behind a breakpoint inside the header', () => {
    useExamStore.getState().startExam('OSCP');
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>,
    );
    const capsule = screen.getByTestId('exam-header-capsule');
    expect(capsule.className).not.toMatch(/(^|\s)(?:max-[a-z0-9]+:|[a-z0-9]+:)?hidden(\s|$)/);
    expect(capsule.parentElement?.className ?? '').not.toMatch(/hidden/);
  });
});
