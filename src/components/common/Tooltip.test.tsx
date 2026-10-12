import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Tooltip } from './Tooltip';

// React derives onPointerEnter from pointerover; build the event by hand so
// pointerType survives jsdom's missing PointerEvent.
function pointerOver(el: Element, pointerType: string) {
  const ev = new Event('pointerover', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'pointerType', { value: pointerType });
  act(() => {
    el.dispatchEvent(ev);
  });
}
function pointerOut(el: Element) {
  const ev = new Event('pointerout', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'pointerType', { value: 'mouse' });
  act(() => {
    el.dispatchEvent(ev);
  });
}

const setup = () =>
  render(
    <>
      <Tooltip content="Tip one">
        <button>one</button>
      </Tooltip>
      <Tooltip content="Tip two">
        <button>two</button>
      </Tooltip>
    </>
  );

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Make sure the module-level skip window from a previous test has elapsed.
    vi.advanceTimersByTime(1000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on hover only after the delay', () => {
    setup();
    pointerOver(screen.getByText('one'), 'mouse');
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tip one');
  });

  it('opens immediately on focus and closes on blur', () => {
    setup();
    fireEvent.focus(screen.getByText('one'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.blur(screen.getByText('one'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('sets aria-describedby to the tooltip id while open', () => {
    setup();
    const btn = screen.getByText('one');
    expect(btn).not.toHaveAttribute('aria-describedby');
    fireEvent.focus(btn);
    expect(btn).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
  });

  it('closes on Escape', () => {
    setup();
    fireEvent.focus(screen.getByText('one'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes on pointer leave and cancels a pending open', () => {
    setup();
    const btn = screen.getByText('one');
    pointerOver(btn, 'mouse');
    pointerOut(btn);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('skips the delay for a tooltip opened within 300ms of another closing', () => {
    setup();
    const one = screen.getByText('one');
    const two = screen.getByText('two');
    fireEvent.focus(one);
    fireEvent.blur(one);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    pointerOver(two, 'mouse');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tip two');
  });

  it('applies the delay again after the skip window elapses', () => {
    setup();
    const one = screen.getByText('one');
    fireEvent.focus(one);
    fireEvent.blur(one);
    act(() => {
      vi.advanceTimersByTime(301);
    });
    pointerOver(screen.getByText('two'), 'mouse');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not open from touch pointers', () => {
    setup();
    pointerOver(screen.getByText('one'), 'touch');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('never opens when disabled', () => {
    render(
      <Tooltip content="Nope" disabled>
        <button>x</button>
      </Tooltip>
    );
    fireEvent.focus(screen.getByText('x'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
