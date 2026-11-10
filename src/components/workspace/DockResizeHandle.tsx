import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useNotesWorkspaceStore,
  clampDockWidth,
  dockMaxPx,
  dockPresetWidth,
  DOCK_MIN_PX,
} from '../../store/useNotesWorkspaceStore';

const STEP_PX = 16;
const STEP_SHIFT_PX = 64;

const viewport = (): number => (typeof window !== 'undefined' && window.innerWidth) || 1280;

/**
 * Vertical drag handle on the dock's left edge (desktop only; the aside is hidden below md).
 * While dragging it writes the aside's inline width directly (one rAF per frame) and commits to the
 * store on release, so the rest of the app does not re-render per pixel.
 */
export const DockResizeHandle: React.FC = () => {
  const dockWidthPx = useNotesWorkspaceStore((s) => s.dockWidthPx);
  const dockSize = useNotesWorkspaceStore((s) => s.dockSize);
  const setDockWidth = useNotesWorkspaceStore((s) => s.setDockWidth);
  const resetDockWidth = useNotesWorkspaceStore((s) => s.resetDockWidth);

  const [vw, setVw] = useState(viewport);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startW: number; next: number; raf: number } | null>(null);

  const min = DOCK_MIN_PX;
  const max = dockMaxPx(vw);
  const width = clampDockWidth(dockWidthPx ?? dockPresetWidth(dockSize, vw), vw);

  // Re-clamp a custom width when the window shrinks.
  useEffect(() => {
    const onResize = () => {
      const next = viewport();
      setVw(next);
      const w = useNotesWorkspaceStore.getState().dockWidthPx;
      if (w !== null && w !== clampDockWidth(w, next)) setDockWidth(w);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setDockWidth]);

  const aside = () => ref.current?.parentElement ?? null;

  const endDrag = useCallback(
    (commit: boolean) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      cancelAnimationFrame(d.raf);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      aside()?.removeAttribute('data-dock-dragging');
      if (commit && d.next !== d.startW) setDockWidth(d.next);
    },
    [setDockWidth]
  );

  useEffect(() => () => endDrag(false), [endDrag]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = aside();
    if (!el) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // pointer already released
    }
    const startW = el.getBoundingClientRect().width || width;
    drag.current = { startX: e.clientX, startW, next: startW, raf: 0 };
    el.setAttribute('data-dock-dragging', 'true');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // The dock is on the right: dragging left widens it.
    d.next = clampDockWidth(d.startW + (d.startX - e.clientX), viewport());
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      const cur = drag.current;
      if (!cur) return;
      cur.raf = 0;
      const el = aside();
      if (el) {
        el.style.width = `${cur.next}px`;
        el.style.minWidth = '0';
        el.style.maxWidth = 'none';
      }
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // pointer already released
    }
    endDrag(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? STEP_SHIFT_PX : STEP_PX;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = width + step;
    else if (e.key === 'ArrowRight') next = width - step;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    else if (e.key === 'Enter') {
      e.preventDefault();
      resetDockWidth();
      return;
    }
    if (next === null) return;
    e.preventDefault();
    setDockWidth(next);
  };

  return (
    // A focusable separator is a WAI-ARIA window splitter; the lint rules do not model it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize notes panel"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      data-testid="dock-resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={resetDockWidth}
      onKeyDown={onKeyDown}
      className="group absolute inset-y-0 left-0 z-30 flex w-2 cursor-col-resize touch-none items-center justify-center outline-none"
    >
      <span
        aria-hidden="true"
        className="h-10 w-0.5 rounded-full bg-accent opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100"
      />
    </div>
  );
};
