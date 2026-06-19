// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary — catches JavaScript errors in child routes and displays
// a fallback UI with recovery options.
// ─────────────────────────────────────────────────────────────────────────────

import { Component, type ReactNode, type ErrorInfo } from "react";
import { Link } from "@tanstack/react-router";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-lg w-full">
            <div className="rounded-xl border border-rule bg-card p-10 text-center">
              <div className="font-display text-6xl text-ink-3 mb-4">⚠</div>
              <h1 className="font-display text-3xl mb-3">Something went wrong</h1>
              <p className="text-ink-2 mb-6 leading-relaxed">
                An unexpected error occurred while rendering this page. The error has been logged
                and can be reported to the development team.
              </p>

              {/* Error details (collapsed) */}
              {this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink">
                    Technical details
                  </summary>
                  <div className="mt-3 rounded-lg bg-paper-2 p-4 font-mono text-xs text-ink-2 overflow-auto max-h-48">
                    <div className="font-bold mb-2">{this.state.error.message}</div>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="whitespace-pre-wrap text-[10px] text-ink-3">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink-2"
                >
                  Try again
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-full border border-rule bg-background px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-2"
                >
                  Go home
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
