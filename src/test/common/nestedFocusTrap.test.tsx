import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { confirmAction } from '../../store/useConfirmStore';

const Outer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useFocusTrap<HTMLDivElement>({ isActive: true, onClose });
  return (
    <div ref={ref} data-testid="outer">
      <button>outer-a</button>
      <button>outer-b</button>
    </div>
  );
};

describe('nested focus traps', () => {
  it('only the top-most trap handles Escape and Tab', async () => {
    const close = vi.fn();
    render(
      <>
        <Outer onClose={close} />
        <ConfirmDialog />
      </>
    );

    let result: Promise<boolean> | undefined;
    act(() => {
      result = confirmAction({ title: 'Sure?', tone: 'danger' });
    });
    const dialog = await screen.findByRole('alertdialog');

    // Tab from last dialog button wraps inside the dialog
    const buttons = dialog.querySelectorAll('button');
    const last = buttons[buttons.length - 1] as HTMLElement;
    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(window, { key: 'Escape' });
    await expect(result).resolves.toBe(false);
    expect(close).not.toHaveBeenCalled();

    // Dialog closed: outer trap is top-of-stack again
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
