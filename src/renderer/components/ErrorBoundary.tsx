import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '40px',
          background: '#1e1e1e',
          color: '#e0e0e0',
        }}>
          <h1 style={{ color: '#f44336', marginBottom: '16px' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '24px', textAlign: 'center', maxWidth: '500px' }}>
            An unexpected error occurred. You can try to continue or reload the app.
          </p>
          {this.state.error && (
            <pre style={{
              background: '#252526',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              maxWidth: '600px',
              overflow: 'auto',
              fontSize: '12px',
              color: '#808080',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleDismiss}
              style={{
                padding: '8px 16px',
                background: '#3c3c3c',
                border: 'none',
                borderRadius: '4px',
                color: '#e0e0e0',
                cursor: 'pointer',
              }}
            >
              Try to Continue
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 16px',
                background: '#094771',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
