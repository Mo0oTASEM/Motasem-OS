import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error.message, errorInfo.componentStack);
  }

  handleRetry = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.hash = '#/dashboard';
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="nova-state-card glass-panel" role="alert" style={{ margin: '2rem', padding: '2rem', textAlign: 'center' }}>
          <AlertTriangle size={32} className="text-magenta" />
          <strong>{this.props.name ? `${this.props.name} encountered an issue` : 'Something went wrong'}</strong>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '480px', margin: '0.5rem auto', lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected error occurred. You can retry or return to the dashboard.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button
              className="glass-btn"
              type="button"
              onClick={this.handleGoHome}
            >
              <Home size={14} /> Dashboard
            </button>
            <button
              className="glass-btn btn-cyan"
              type="button"
              onClick={this.handleRetry}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


