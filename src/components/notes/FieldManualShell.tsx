import React, { useEffect } from 'react';

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
  onCloseDrawers,
}) => {
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

  const asideBase = (narrow: boolean) =>
    narrow
      ? 'absolute top-0 bottom-0 z-20 overflow-hidden bg-surface-card shadow-2xl transition-transform duration-150 motion-reduce:transition-none'
      : 'flex-shrink-0 overflow-hidden bg-surface-card transition-[width] duration-150 motion-reduce:transition-none';
  const widthFor = (narrow: boolean, open: boolean) =>
    narrow ? { width: sidebarWidth } : { width: open ? sidebarWidth : 0 };
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
        style={widthFor(narrowLeft, isLeftOpen)}
        className={`${asideBase(narrowLeft)} ${leftClass}`}
      >
        {left}
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
