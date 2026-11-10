import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  useNotesWorkspaceStore,
  clampDockWidth,
  dockMaxPx,
  DOCK_MIN_PX,
} from '../../store/useNotesWorkspaceStore';
import { DockResizeHandle } from '../../components/workspace/DockResizeHandle';

describe('dock width store logic', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1400, configurable: true, writable: true });
    useNotesWorkspaceStore.setState({ dockSize: 'normal', dockWidthPx: null });
  });

  it('clamps to min and to viewport minus 480', () => {
    expect(clampDockWidth(10, 1400)).toBe(DOCK_MIN_PX);
    expect(clampDockWidth(5000, 1400)).toBe(920);
    expect(dockMaxPx(600)).toBe(DOCK_MIN_PX);
  });

  it('setDockWidth clamps and null clears', () => {
    useNotesWorkspaceStore.getState().setDockWidth(5000);
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBe(920);
    useNotesWorkspaceStore.getState().setDockWidth(null);
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBeNull();
  });

  it('presets and reset clear the custom width', () => {
    const s = useNotesWorkspaceStore.getState();
    s.setDockWidth(500);
    s.toggleDockSize();
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBeNull();
    s.setDockWidth(500);
    s.setDockSize('expanded');
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBeNull();
    s.setDockWidth(500);
    s.resetDockWidth();
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBeNull();
    expect(useNotesWorkspaceStore.getState().dockSize).toBe('normal');
  });
});

describe('DockResizeHandle', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1400, configurable: true, writable: true });
    useNotesWorkspaceStore.setState({ dockSize: 'normal', dockWidthPx: 600 });
  });

  const setup = () =>
    render(
      <MemoryRouter>
        <aside>
          <DockResizeHandle />
        </aside>
      </MemoryRouter>
    );

  it('exposes separator semantics', () => {
    setup();
    const h = screen.getByRole('separator', { name: 'Resize notes panel' });
    expect(h.getAttribute('aria-orientation')).toBe('vertical');
    expect(h.getAttribute('aria-valuenow')).toBe('600');
    expect(h.getAttribute('aria-valuemin')).toBe('320');
    expect(h.getAttribute('aria-valuemax')).toBe('920');
    expect(h.tabIndex).toBe(0);
  });

  it('arrow keys change width and dispatch to the store', () => {
    setup();
    const h = screen.getByRole('separator');
    fireEvent.keyDown(h, { key: 'ArrowLeft' });
    expect(h.getAttribute('aria-valuenow')).toBe('616');
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBe(616);
    fireEvent.keyDown(h, { key: 'ArrowRight', shiftKey: true });
    expect(h.getAttribute('aria-valuenow')).toBe('552');
    fireEvent.keyDown(h, { key: 'Home' });
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBe(320);
    fireEvent.keyDown(h, { key: 'End' });
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBe(920);
  });

  it('Enter and double-click reset to the normal preset', () => {
    setup();
    const h = screen.getByRole('separator');
    fireEvent.keyDown(h, { key: 'Enter' });
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBeNull();
    useNotesWorkspaceStore.getState().setDockWidth(700);
    fireEvent.doubleClick(h);
    expect(useNotesWorkspaceStore.getState().dockWidthPx).toBeNull();
    expect(useNotesWorkspaceStore.getState().dockSize).toBe('normal');
  });
});
