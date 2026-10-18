import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { confirmAction, useConfirmStore } from '../../store/useConfirmStore';

afterEach(() => {
  act(() => useConfirmStore.getState().settle(false));
});

describe('ConfirmDialog', () => {
  it('resolves true on confirm', async () => {
    render(<ConfirmDialog />);
    let p!: Promise<boolean>;
    act(() => { p = confirmAction({ title: 'Delete?', body: 'Gone', confirmLabel: 'Yes' }); });
    expect(await screen.findByRole('alertdialog')).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(screen.getByText('Yes'));
    await expect(p).resolves.toBe(true);
  });

  it('resolves false on cancel and focuses cancel when danger', async () => {
    render(<ConfirmDialog />);
    let p!: Promise<boolean>;
    act(() => { p = confirmAction({ title: 'Wipe?', tone: 'danger' }); });
    const cancel = await screen.findByText('Cancel');
    expect(document.activeElement).toBe(cancel.closest('button'));
    fireEvent.click(cancel);
    await expect(p).resolves.toBe(false);
  });

  it('resolves false on Escape', async () => {
    render(<ConfirmDialog />);
    let p!: Promise<boolean>;
    act(() => { p = confirmAction({ title: 'Sure?' }); });
    await screen.findByRole('alertdialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await expect(p).resolves.toBe(false);
  });

  it('resolves a superseded pending dialog as false', async () => {
    render(<ConfirmDialog />);
    let a!: Promise<boolean>;
    let b!: Promise<boolean>;
    act(() => { a = confirmAction({ title: 'First' }); });
    act(() => { b = confirmAction({ title: 'Second', confirmLabel: 'Go' }); });
    await expect(a).resolves.toBe(false);
    fireEvent.click(await screen.findByText('Go'));
    await expect(b).resolves.toBe(true);
  });
});
