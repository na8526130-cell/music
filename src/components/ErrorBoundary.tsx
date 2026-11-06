import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    // If it is a transient WebKit DOM reconciliation error, automatically attempt soft recovery
    if (
      error?.message?.includes('The object can not be found here') ||
      error?.message?.includes('NotFoundError') ||
      error?.message?.includes('removeChild')
    ) {
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 100);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0a0a0c] text-white">
          <div className="max-w-md w-full bg-[#14151c] border border-white/10 rounded-2xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold">一時的な表示エラーが発生しました</h2>
            <p className="text-xs text-neutral-400">
              画面の再読み込みを行うと正常に復旧します。
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] font-mono text-neutral-500 bg-neutral-900 p-2 rounded-lg truncate">
                {this.state.error.message}
              </p>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/30"
            >
              <RefreshCw className="w-4 h-4" />
              <span>画面を再読み込みして復旧する</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
