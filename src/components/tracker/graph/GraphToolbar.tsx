import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Maximize2,
  Minimize2,
  Share2,
  Focus,
  Network,
  Download,
  Undo2,
  Redo2,
  Workflow,
  MoreHorizontal
} from 'lucide-react';

interface GraphToolbarProps {
  scale: number;
  isConnectingMode: boolean;
  onToggleConnecting: () => void;
  handleExportObsidian: () => void;
  handleExportSvg: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string | null;
  redoLabel?: string | null;
  handleAutoLayout: () => void;
  /** True when there are no nodes or the SHOW ALL layout is active. */
  autoLayoutDisabled: boolean;
  /** Subnets are collapsed: auto layout arranges one open subnet at a time. */
  autoLayoutNeedsSubnet?: boolean;
  showAllNodes: boolean;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  handleFitToScreen: () => void;
  handleCenterSelection: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  scale,
  isConnectingMode,
  onToggleConnecting,
  handleExportObsidian,
  handleExportSvg,
  undo,
  redo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  handleAutoLayout,
  autoLayoutDisabled,
  autoLayoutNeedsSubnet = false,
  showAllNodes,
  handleZoomIn,
  handleZoomOut,
  handleResetView,
  handleFitToScreen,
  handleCenterSelection,
  isFullscreen,
  setIsFullscreen,
}) => {
  // Phones keep zoom in/out and fit; the rest opens from the more button so the rail does not cover the graph.
  const [moreOpen, setMoreOpen] = useState(false);
  const secondary = `flex flex-col items-center gap-1 ${moreOpen ? '' : 'max-sm:hidden'}`;
  return (
    <div 
      data-testid="canvas-nav-toolbar"
      className="self-end flex flex-col items-center gap-1 bg-surface-elevated/95 backdrop-blur-sm border border-subtle p-1.5 rounded-xl shadow-md pointer-events-auto machined-edge"
    >
      <span className="text-xs font-semibold text-muted select-none font-mono tabular-nums">
        {Math.round(scale * 100)}%
      </span>

      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        aria-expanded={moreOpen}
        aria-label={moreOpen ? 'Fewer tools' : 'More tools'}
        title={moreOpen ? 'Fewer tools' : 'More tools'}
        className="sm:hidden p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary active:scale-[0.97] cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      <div className={secondary}>
      {/* Interactive Pivot Vector Connection Mode Button */}
      <button
        data-testid="graph-connect-vector"
        onClick={onToggleConnecting}
        className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1.5 cursor-pointer ${
          isConnectingMode
            ? 'bg-accent text-on-accent font-semibold shadow-xs'
            : 'hover:bg-surface-hover text-accent border border-transparent hover:border-subtle'
        }`}
        title={isConnectingMode ? 'Stop linking (Alt+C)' : 'Link two machines (Alt+C)'}
        aria-label={isConnectingMode ? 'Stop linking' : 'Add link'}
      >
        <Network className="w-3.5 h-3.5" />
        <span className="hidden text-xs">
          {isConnectingMode ? 'Linking...' : 'Add link'}
        </span>
      </button>

      {/* Export Obsidian Canvas */}
      <button
        data-testid="graph-export-canvas"
        onClick={handleExportObsidian}
        className="p-1.5 rounded-md hover:bg-surface-hover text-callout-tip-fg hover:text-callout-tip-fg transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1 cursor-pointer"
        title="Export as an Obsidian canvas file (.canvas)"
        aria-label="Export canvas file"
      >
        <Download className="w-4 h-4" />
        <span className="text-xs font-semibold hidden">Canvas file</span>
      </button>

      {/* Export SVG */}
      <button
        data-testid="graph-export-svg"
        onClick={handleExportSvg}
        className="p-1.5 rounded-md hover:bg-surface-hover text-accent hover:text-callout-info-fg transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1 cursor-pointer"
        title="Export as an SVG image (.svg)"
        aria-label="Export SVG"
      >
        <Share2 className="w-4 h-4" />
        <span className="text-xs font-semibold hidden">SVG</span>
      </button>

      <div className="h-px w-4 bg-border-subtle my-0.5" />

      <button
        type="button"
        data-testid="graph-undo"
        onClick={() => { undo(); }}
        disabled={!canUndo}
        aria-label="Undo"
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted disabled:active:scale-100"
        title={undoLabel ? `Undo ${undoLabel} (Ctrl/Cmd+Z)` : 'Undo (Ctrl/Cmd+Z)'}
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        data-testid="graph-redo"
        onClick={() => { redo(); }}
        disabled={!canRedo}
        aria-label="Redo"
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted disabled:active:scale-100"
        title={redoLabel ? `Redo ${redoLabel} (Ctrl/Cmd+Shift+Z)` : 'Redo (Ctrl/Cmd+Shift+Z)'}
      >
        <Redo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        data-testid="graph-auto-layout"
        onClick={handleAutoLayout}
        disabled={autoLayoutDisabled}
        aria-disabled={autoLayoutDisabled ? true : undefined}
        aria-label="Auto layout"
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted disabled:active:scale-100"
        title={
          showAllNodes
            ? 'Auto layout is available in scoped view'
            : autoLayoutNeedsSubnet
            ? 'Open a subnet to auto-arrange its machines'
            : 'Auto layout: arrange nodes by attack path (undoable)'
        }
      >
        <Workflow className="w-4 h-4" />
      </button>

      </div>

      <div className="h-px w-4 bg-border-subtle my-0.5" />

      <button
        type="button"
        data-testid="graph-zoom-in"
        onClick={handleZoomIn}
        aria-label="Zoom In"
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
        title="Zoom In (+)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        data-testid="graph-zoom-out"
        onClick={handleZoomOut}
        aria-label="Zoom Out"
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
        title="Zoom Out (-)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <div className={secondary}>
      <button
        type="button"
        data-testid="graph-reset-view"
        onClick={handleResetView}
        aria-label="Reset View"
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
        title="Reset View (1:1)"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      </div>
      <button
        type="button"
        data-testid="graph-fit-screen"
        onClick={handleFitToScreen}
        aria-label="Fit to Screen"
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
        title="Fit to Screen (Framing)"
      >
        <Focus className="w-4 h-4" />
      </button>
      <div className={secondary}>
      <button
        type="button"
        data-testid="graph-center-selection"
        onClick={handleCenterSelection}
        aria-label="Center on selected machine"
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
        title="Center on the selected machine, or the middle of the graph if none is selected"
      >
        <Crosshair className="w-4 h-4" />
      </button>
      <button
        type="button"
        data-testid="graph-fullscreen-toggle"
        onClick={() => setIsFullscreen(!isFullscreen)}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        className={`p-1.5 rounded-md transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer ${
          isFullscreen ? 'bg-accent text-on-accent font-semibold' : 'hover:bg-surface-hover text-muted hover:text-primary'
        }`}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
      </div>
    </div>
  );
};
