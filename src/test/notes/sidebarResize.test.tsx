import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FieldManualShell } from '../../components/notes/FieldManualShell';

const KEY = 'zerobox.test.leftWidth';

const shell = (extra: Partial<React.ComponentProps<typeof FieldManualShell>> = {}) =>
  render(
    <FieldManualShell
      ribbon={<div />}
      left={<div>left</div>}
      right={<div>right</div>}
      statusBar={null}
      isLeftOpen
      isRightOpen={false}
      isNarrow={false}
      onCloseDrawers={() => {}}
      {...extra}
    >
      <div>center</div>
    </FieldManualShell>,
  );

const leftWidth = () => screen.getByTestId('notes-left-panel').style.width;

beforeEach(() => window.localStorage.removeItem(KEY));
afterEach(cleanup);

describe('FieldManualShell left sidebar resize', () => {
  it('has no handle without resizeStorageKey', () => {
    shell();
    expect(screen.queryByTestId('notes-left-resize-handle')).toBeNull();
  });

  it('has no handle in narrow (drawer) mode', () => {
    shell({ resizeStorageKey: KEY, narrowLeft: true });
    expect(screen.queryByTestId('notes-left-resize-handle')).toBeNull();
  });

  it('exposes separator semantics', () => {
    shell({ resizeStorageKey: KEY });
    const h = screen.getByTestId('notes-left-resize-handle');
    expect(h).toHaveAttribute('role', 'separator');
    expect(h).toHaveAttribute('aria-label', 'Resize sidebar');
    expect(h).toHaveAttribute('aria-valuenow', '260');
    expect(h).toHaveAttribute('aria-valuemin', '180');
  });

  it('ArrowRight widens by 16px and persists', () => {
    shell({ resizeStorageKey: KEY });
    fireEvent.keyDown(screen.getByTestId('notes-left-resize-handle'), { key: 'ArrowRight' });
    expect(leftWidth()).toBe('276px');
    expect(window.localStorage.getItem(KEY)).toBe('276');
    fireEvent.keyDown(screen.getByTestId('notes-left-resize-handle'), { key: 'ArrowRight', shiftKey: true });
    expect(leftWidth()).toBe('324px');
  });

  it('restores a stored width and ignores non-finite values', () => {
    window.localStorage.setItem(KEY, '300');
    shell({ resizeStorageKey: KEY });
    expect(leftWidth()).toBe('300px');
    cleanup();
    window.localStorage.setItem(KEY, 'abc');
    shell({ resizeStorageKey: KEY });
    expect(leftWidth()).toBe('260px');
  });

  it('double-click resets to the default width', () => {
    shell({ resizeStorageKey: KEY, sidebarWidth: 240 });
    const h = screen.getByTestId('notes-left-resize-handle');
    fireEvent.keyDown(h, { key: 'ArrowRight' });
    expect(leftWidth()).toBe('256px');
    fireEvent.doubleClick(h);
    expect(leftWidth()).toBe('240px');
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('clamps at the minimum', () => {
    shell({ resizeStorageKey: KEY });
    const h = screen.getByTestId('notes-left-resize-handle');
    fireEvent.keyDown(h, { key: 'Home' });
    expect(leftWidth()).toBe('180px');
    fireEvent.keyDown(h, { key: 'ArrowLeft' });
    expect(leftWidth()).toBe('180px');
  });

  it('pointer drag changes width live', () => {
    shell({ resizeStorageKey: KEY });
    const h = screen.getByTestId('notes-left-resize-handle');
    fireEvent.pointerDown(h, { button: 0, clientX: 100, pointerId: 1 });
    expect(document.body.style.userSelect).toBe('none');
    fireEvent.pointerMove(h, { clientX: 150, pointerId: 1 });
    expect(leftWidth()).toBe('310px');
    fireEvent.pointerUp(h, { pointerId: 1 });
    expect(document.body.style.userSelect).toBe('');
    expect(window.localStorage.getItem(KEY)).toBe('310');
  });
});
