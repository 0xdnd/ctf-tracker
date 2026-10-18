import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { CyberButton } from './CyberButton';

interface Props {
  children: ReactNode;
  /** When this value changes (e.g. route pathname), the boundary clears its error state. */
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
];

export function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  const message = error.message || '';
  return CHUNK_ERROR_PATTERNS.some((p) => message.includes(p));
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

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  public handleReload = () => {
    // Dynamic import rejections are cached by the module loader; a reload forces a fresh fetch.
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    const chunk = isChunkLoadError(this.state.error);
    const title = chunk ? "Couldn't load this view" : 'Something went wrong in this view';
    const description = chunk
      ? 'A part of the app failed to load. Reloading usually fixes this.'
      : 'This view hit an unexpected error. Your data is untouched.';

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
        <div
          role="alert"
          className="w-full max-w-xl p-5 rounded-2xl border border-subtle bg-surface-card machined-edge space-y-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-callout-danger-fg flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-primary">{title}</h2>
              <p className="text-xs text-secondary mt-0.5">{description}</p>
            </div>
          </div>

          <details className="group rounded-lg border border-callout-danger-border bg-callout-danger-bg">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-callout-danger-fg">
              Error details
            </summary>
            <pre className="px-3 pb-3 text-xs font-mono text-callout-danger-fg whitespace-pre-wrap break-words overflow-x-auto">
              {this.state.error?.message || 'Failed to initialize module'}
            </pre>
          </details>

          <div className="flex items-center justify-end gap-2">
            {chunk ? (
              <CyberButton
                variant="primary"
                size="sm"
                iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={this.handleReload}
              >
                Reload
              </CyberButton>
            ) : (
              <>
                <CyberButton variant="ghost" size="sm" onClick={this.handleReload}>
                  Reload app
                </CyberButton>
                <CyberButton
                  variant="primary"
                  size="sm"
                  iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={this.handleReset}
                >
                  Try again
                </CyberButton>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}
