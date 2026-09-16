import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ZeroBox Route Exception Trapped:', error, errorInfo);
  }

  public handleRetry = () => {
    // Dynamic import rejection promises are cached by the browser module loader.
    // Reloading the page forces a fresh network request for the dropped module chunk.
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 font-mono selection:bg-cyan-500/25 selection:text-current dark:selection:bg-cyan-400/25 dark:selection:text-white">
          <div className="w-full max-w-xl p-5 rounded-xl border border-cyber-amber/50 bg-white dark:bg-cyber-card shadow-xl space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-cyber-border pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 animate-pulse" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  TACTICAL MODULE CHUNK FAILURE
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-cyber-muted">
                  A transient network or chunk delivery error occurred while streaming this view.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-100 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-xs text-amber-700 dark:text-amber-400 font-mono overflow-x-auto">
              {this.state.error?.message || 'Failed to initialize module'}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-cyber-emerald dark:hover:bg-cyber-emerald/80 text-white dark:text-slate-950 font-bold text-xs transition-all shadow-sm active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Module</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
