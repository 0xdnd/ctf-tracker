import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewMachineModal } from '../../components/tracker/NewMachineModal';
import { TargetTypeBadge } from '../../components/common/TargetTypeBadge';
import { useCtfStore } from '../../store/useCtfStore';
import { getTargetType } from '../../utils/targetType';
import type { Machine } from '../../types';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const HELPER = "Track your own progress here. ZeroBox doesn't include any Pro Lab or exam content.";

const openModal = () => {
  useCtfStore.setState({ machines: [], newMachineModalOpen: true, soundEnabled: false });
  render(<NewMachineModal />);
};

const addTarget = async (type: 'Machine' | 'Pro Lab' | 'Exam', name: string, tags?: string) => {
  const user = userEvent.setup();
  openModal();
  await user.click(screen.getByRole('radio', { name: type }));
  await user.type(screen.getByLabelText('Machine or Room Name'), name);
  if (tags) await user.type(screen.getByLabelText('Attack Vectors and Tags'), tags);
  await user.click(screen.getByRole('button', { name: /Deploy Machine/ }));
  return useCtfStore.getState().machines[0];
};

beforeEach(() => {
  localStorage.clear();
});

describe('NewMachineModal target type', () => {
  it('defaults to Machine with no helper line and the platform picker visible', () => {
    openModal();
    expect(screen.getByRole('radio', { name: 'Machine' })).toBeChecked();
    expect(screen.queryByText(HELPER)).not.toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('Pro Lab shows the helper line, hides the platform picker and stores a Custom target tagged pro-lab', async () => {
    const user = userEvent.setup();
    openModal();
    await user.click(screen.getByRole('radio', { name: 'Pro Lab' }));
    expect(screen.getByText(HELPER)).toBeInTheDocument();
    expect(screen.queryByText('Platform')).not.toBeInTheDocument();
    expect(screen.getByText('Pro Lab name *')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Machine or Room Name'), 'My lab run');
    await user.click(screen.getByRole('button', { name: /Deploy Machine/ }));
    const saved = useCtfStore.getState().machines[0];
    expect(saved).toMatchObject({ name: 'My lab run', platform: 'Custom', isCustom: true });
    expect(saved.id.startsWith('custom-')).toBe(true);
    expect(saved.tags).toEqual(['pro-lab']);
    expect(getTargetType(saved)).toBe('pro-lab');
  });

  it('Pro Lab preset buttons auto-fill lab name, official URL, and exam alignment tags', async () => {
    const user = userEvent.setup();
    openModal();
    await user.click(screen.getByRole('radio', { name: 'Pro Lab' }));

    const danteBtn = screen.getByRole('button', { name: /Dante/ });
    await user.click(danteBtn);

    expect(screen.getByLabelText('Machine or Room Name')).toHaveValue('Dante');
    expect(screen.getByLabelText('Lab Room / Writeup URL')).toHaveValue('https://app.hackthebox.com/pro-labs/Dante');

    await user.click(screen.getByRole('button', { name: /Deploy Machine/ }));
    const saved = useCtfStore.getState().machines[0];
    expect(saved.name).toBe('Dante');
    expect(saved.difficulty).toBe('Medium');
    expect(saved.roomUrl).toBe('https://app.hackthebox.com/pro-labs/Dante');
    expect(saved.tags).toContain('pro-lab');
    expect(saved.tags).toContain('CPTS');
    expect(saved.tags).toContain('14-hosts');
    expect(saved.tags).toContain('27-flags');
    expect(getTargetType(saved)).toBe('pro-lab');
  });

  it('Exam keeps user tags after the exam marker', async () => {
    const saved = await addTarget('Exam', 'Practice attempt', 'AD, pivoting');
    expect(saved.platform).toBe('Custom');
    expect(saved.tags).toEqual(['exam', 'AD', 'pivoting']);
    expect(getTargetType(saved)).toBe('exam');
  });

  it('Machine adds no marker tag', async () => {
    const saved = await addTarget('Machine', 'Box one');
    expect(saved.tags).toEqual([]);
    expect(getTargetType(saved)).toBe('machine');
  });
});

describe('TargetTypeBadge', () => {
  const base: Pick<Machine, 'platform' | 'tags'> = { platform: 'Custom', tags: [] };

  it('labels personal Pro Lab and Exam targets', () => {
    const { rerender } = render(<TargetTypeBadge machine={{ ...base, id: 'custom-1-a', tags: ['pro-lab'] }} />);
    expect(screen.getByTestId('target-type-badge')).toHaveTextContent('Pro Lab');
    rerender(<TargetTypeBadge machine={{ ...base, id: 'custom-1-a', tags: ['Exam'] }} />);
    expect(screen.getByTestId('target-type-badge')).toHaveTextContent('Exam');
  });

  it('never labels catalog machines or untagged customs', () => {
    render(
      <>
        <TargetTypeBadge machine={{ id: 'htb-x', platform: 'HTB', tags: ['exam'] }} />
        <TargetTypeBadge machine={{ ...base, id: 'custom-1-b' }} />
      </>
    );
    expect(screen.queryByTestId('target-type-badge')).not.toBeInTheDocument();
  });
});
