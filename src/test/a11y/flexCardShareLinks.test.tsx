import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OperatorFlexCardModal } from '../../components/common/OperatorFlexCardModal';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useCtfStore.setState({ flexCardModalOpen: false });
});

describe('OperatorFlexCardModal share links', () => {
  it.each(['Share on LinkedIn', 'Share on X'])('%s opens the page without an opener reference', (label) => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    useCtfStore.setState({ flexCardModalOpen: true });
    render(<OperatorFlexCardModal />);

    fireEvent.click(screen.getByText(label));

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][1]).toBe('_blank');
    expect(open.mock.calls[0][2]).toBe('noopener,noreferrer');
  });
});
