import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ZeroBox Caught Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    try {
      localStorage.removeItem('specter_ctf_store_v3');
      localStorage.removeItem('specter_ctf_profile_guest');
    } catch (_) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cyber-bg text-cyber-text flex flex-col items-center justify-center p-6 font-mono selection:bg-cyan-500/25 selection:text-current dark:selection:bg-cyan-400/25 dark:selection:text-white">
          <div className="w-full max-w-2xl p-6 rounded-xl border border-cyber-crimson/50 bg-cyber-card shadow-2xl shadow-glow-crimson/20 space-y-4">
            <div className="flex items-center gap-3 border-b border-cyber-border pb-3">
              <AlertTriangle className="w-6 h-6 text-cyber-crimson animate-bounce" />
              <div>
                <h1 className="text-base font-bold text-white tracking-wider">
                  SYSTEM ANOMALY DETECTED // RUNTIME RECOVERY
                </h1>
                <p className="text-xs text-cyber-muted">
                  An unexpected render exception was trapped by the kernel boundary.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-cyber-crimson font-mono overflow-x-auto max-h-48">
              <strong>Error:</strong> {this.state.error?.message || 'Unknown runtime error'}
              {this.state.error?.stack && (
                <pre className="text-[10px] text-cyber-muted mt-2 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-cyber-card border border-cyber-border text-white text-xs hover:border-cyber-cyan transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyber-crimson text-black font-bold text-xs hover:bg-cyber-crimson/90 transition-all shadow-glow-crimson"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Store & Recover</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
