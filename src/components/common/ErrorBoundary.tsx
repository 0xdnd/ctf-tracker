import { Component, ErrorInfo, ReactNode } from 'react';
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
      localStorage.removeItem('zerobox-tactical-store');
      localStorage.removeItem('specter_ctf_store_v2');
      localStorage.removeItem('specter_ctf_store_v3');
      localStorage.removeItem('specter_ctf_profile_guest');
      // Purge all user profile storage keys and corrupted backups
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('specter_ctf_profile_') || key.startsWith('zerobox-') || key.includes('_corrupted_backup_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-base text-primary flex flex-col items-center justify-center p-4 sm:p-6 font-sans selection:bg-accent/15 selection:text-current">
          <div className="w-full max-w-2xl p-4 sm:p-5 rounded-2xl border border-subtle bg-surface-card shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2.5 border-b border-subtle pb-3">
              <AlertTriangle className="w-5 h-5 text-callout-danger-fg flex-shrink-0" />
              <div>
                <h1 className="text-sm font-semibold text-primary">
                  Something went wrong
                </h1>
                <p className="text-xs text-muted">
                  An unexpected error was caught. You can reload the page or reset the local store.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-base border border-subtle text-xs text-callout-danger-fg font-mono overflow-x-auto max-h-48">
              <strong>Error:</strong> {this.state.error?.message || 'Unknown runtime error'}
              {this.state.error?.stack && (
                <pre className="text-[10px] text-muted mt-2 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3.5 py-1.5 rounded-lg bg-surface-card border border-subtle text-primary text-xs hover:border-strong transition-[transform,background-color,border-color,color] active:scale-[0.98]"
              >
                Reload page
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-callout-danger-bg border border-callout-danger-border text-callout-danger-fg font-medium text-xs hover:bg-callout-danger-bg/80 transition-[transform,background-color,border-color,color] active:scale-[0.98]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset store and recover</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
