import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Modal } from './Modal';

afterEach(() => {
  document.body.style.overflow = '';
});

describe('Modal', () => {
  it('renders a labelled modal dialog in a portal', () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="Test modal">
        <p>content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'Test modal' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} ariaLabel="x">
        <p>content</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on backdrop click but not on panel click', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="x">
        <button>inside</button>
      </Modal>
    );
    fireEvent.click(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector('[data-modal-backdrop]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores backdrop click when closeOnBackdrop is false', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="x" closeOnBackdrop={false}>
        <button>inside</button>
      </Modal>
    );
    fireEvent.click(document.querySelector('[data-modal-backdrop]')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc closes only the topmost of two modals', () => {
    const closeA = vi.fn();
    const closeB = vi.fn();
    render(
      <>
        <Modal open onClose={closeA} ariaLabel="A">
          <button>a</button>
        </Modal>
        <Modal open onClose={closeB} ariaLabel="B">
          <button>b</button>
        </Modal>
      </>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeB).toHaveBeenCalledTimes(1);
    expect(closeA).not.toHaveBeenCalled();
  });

  it('does not close on Esc when closeOnEsc is false', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="x" closeOnEsc={false}>
        <button>a</button>
      </Modal>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog and restores it on close', async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>opener</button>
          <Modal open={open} onClose={() => setOpen(false)} ariaLabel="x" instant>
            <button>first</button>
            <button>last</button>
          </Modal>
        </>
      );
    };
    render(<Harness />);
    const opener = screen.getByText('opener');
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByText('first')).toHaveFocus();

    // Tab from the last element wraps to the first.
    screen.getByText('last').focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByText('first')).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(opener).toHaveFocus();
  });

  it('honours initialFocusRef', () => {
    const Harness = () => {
      const ref = React.useRef<HTMLButtonElement>(null);
      return (
        <Modal open onClose={() => {}} ariaLabel="x" initialFocusRef={ref}>
          <button>first</button>
          <button ref={ref}>target</button>
        </Modal>
      );
    };
    render(<Harness />);
    expect(screen.getByText('target')).toHaveFocus();
  });

  it('ref-counts body scroll lock across nested modals', async () => {
    const Harness = ({ a, b }: { a: boolean; b: boolean }) => (
      <>
        <Modal open={a} onClose={() => {}} ariaLabel="A" instant>
          <p>a</p>
        </Modal>
        <Modal open={b} onClose={() => {}} ariaLabel="B" instant>
          <p>b</p>
        </Modal>
      </>
    );
    const { rerender } = render(<Harness a b />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Harness a b={false} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Harness a={false} b={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('instant unmounts immediately with no exit animation', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} ariaLabel="x" instant>
        <p>c</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    rerender(
      <Modal open={false} onClose={() => {}} ariaLabel="x" instant>
        <p>c</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('warns in dev when no accessible label is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Modal open onClose={() => {}} instant>
        <p>c</p>
      </Modal>
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ariaLabel'));
    warn.mockRestore();
  });

  it('does not warn when labelledBy is given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Modal open onClose={() => {}} labelledBy="t" instant>
        <h2 id="t">Title</h2>
      </Modal>
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
