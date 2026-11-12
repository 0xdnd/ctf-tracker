import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SidebarResizeHandle,
  clampSidebarWidth,
  readStoredSidebarWidth,
  writeStoredSidebarWidth,
} from './SidebarResizeHandle';

export interface FieldManualShellProps {
  ribbon: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
  statusBar: React.ReactNode;
  children: React.ReactNode;
  isLeftOpen: boolean;
  isRightOpen: boolean;
  isNarrow: boolean;
  /** Left aside as a slide-over drawer. Defaults to `isNarrow`. */
  narrowLeft?: boolean;
  /** Right aside as a slide-over drawer. Defaults to `isNarrow`. */
  narrowRight?: boolean;
  /** Width of each aside in px (default 260). */
  sidebarWidth?: number;
  /** localStorage key; when set, the left aside gets a drag handle and remembers its width. */
  resizeStorageKey?: string;
  /** Escape and a scrim click call this; it should close the drawers that are open as overlays. */
  onCloseDrawers: () => void;
}

const DEFAULT_SIDEBAR_WIDTH = 260;

// React 18 has no typed boolean inert prop: an empty string sets the attribute, an empty object omits it.
const inertProps = (open: boolean): Record<string, string> => (open ? {} : { inert: '' });

/**
 * Layout only: ribbon, left aside, center column, right aside. App owns the header and main
 * elements, so this renders neither. When `isNarrow` (or per side, `narrowLeft` / `narrowRight`) an
 * aside is a slide-over drawer above a scrim; Escape or a scrim click calls `onCloseDrawers`.
 */
export const FieldManualShell: React.FC<FieldManualShellProps> = ({
  ribbon,
  left,
  right,
  statusBar,
  children,
  isLeftOpen,
  isRightOpen,
  isNarrow,
  narrowLeft = isNarrow,
  narrowRight = isNarrow,
  sidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  resizeStorageKey,
  onCloseDrawers,
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const [leftCustom, setLeftCustom] = useState<number | null>(() =>
    resizeStorageKey ? readStoredSidebarWidth(resizeStorageKey) : null,
  );
  const [dragging, setDragging] = useState(false);
  const canResize = !!resizeStorageKey && isLeftOpen && !narrowLeft;
  const shellWidth = () => shellRef.current?.getBoundingClientRect().width ?? 0;
  const leftWidth = resizeStorageKey && leftCustom !== null ? clampSidebarWidth(leftCustom, shellWidth()) : sidebarWidth;

  const handleResize = useCallback(
    (w: number, commit: boolean) => {
      setLeftCustom(w);
      if (commit && resizeStorageKey) writeStoredSidebarWidth(resizeStorageKey, w);
    },
    [resizeStorageKey],
  );
  const handleReset = useCallback(() => {
    setLeftCustom(null);
    if (resizeStorageKey) writeStoredSidebarWidth(resizeStorageKey, null);
  }, [resizeStorageKey]);
  const getShell = useCallback(() => shellRef.current, []);
  const anyDrawerOpen = (narrowLeft && isLeftOpen) || (narrowRight && isRightOpen);
  useEffect(() => {
    if (!anyDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      onCloseDrawers();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anyDrawerOpen, onCloseDrawers]);

  const asideBase = (narrow: boolean, noTransition = false) =>
    narrow
      ? 'absolute top-0 bottom-0 z-20 overflow-hidden bg-surface-card shadow-2xl transition-transform duration-150 motion-reduce:transition-none'
      : `flex-shrink-0 overflow-hidden bg-surface-card ${noTransition ? '' : 'transition-[width] duration-150 motion-reduce:transition-none'}`;
  const widthFor = (narrow: boolean, open: boolean, w: number = sidebarWidth) =>
    narrow ? { width: w } : { width: open ? w : 0 };
  const leftClass = narrowLeft
    ? `left-[44px] border-r border-subtle ${isLeftOpen ? 'translate-x-0' : '-translate-x-[120%]'}`
    : isLeftOpen
      ? 'border-r border-subtle'
      : '';
  const rightClass = narrowRight
    ? `right-0 border-l border-subtle ${isRightOpen ? 'translate-x-0' : 'translate-x-[120%]'}`
    : isRightOpen
      ? 'border-l border-subtle'
      : '';

  return (
    <div
      ref={shellRef}
      data-testid="field-manual-shell"
      className="relative isolate flex h-full w-full overflow-hidden bg-surface-base"
    >
      {ribbon}
      {anyDrawerOpen && (
        <div
          data-testid="notes-drawer-scrim"
          aria-hidden="true"
          onClick={onCloseDrawers}
          className="absolute inset-0 z-10 bg-surface-inverse/70"
        />
      )}
      <aside
        aria-label="Sidebar"
        data-testid="notes-left-panel"
        data-state={isLeftOpen ? 'open' : 'closed'}
        aria-hidden={isLeftOpen ? undefined : true}
        {...inertProps(isLeftOpen)}
        style={widthFor(narrowLeft, isLeftOpen, leftWidth)}
        className={`${asideBase(narrowLeft, dragging)} ${leftClass}${canResize ? ' relative' : ''}`}
      >
        {left}
        {canResize && (
          <SidebarResizeHandle
            width={leftWidth}
            getShell={getShell}
            onResize={handleResize}
            onReset={handleReset}
            onDraggingChange={setDragging}
          />
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        {statusBar}
      </div>
      <aside
        aria-label="Details"
        data-testid="notes-right-sidebar"
        data-state={isRightOpen ? 'open' : 'closed'}
        aria-hidden={isRightOpen ? undefined : true}
        {...inertProps(isRightOpen)}
        style={widthFor(narrowRight, isRightOpen)}
        className={`${asideBase(narrowRight)} ${rightClass}`}
      >
        {right}
      </aside>
    </div>
  );
};

export default FieldManualShell;
