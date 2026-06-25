import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: '#25233a',
            background: '#f4f1ff',
          }}
        >
          <p style={{ fontSize: 48, margin: 0 }}>💥</p>
          <h1 style={{ margin: 0, fontSize: 22 }}>页面出了点问题</h1>
          <p style={{ margin: 0, color: '#77738c', fontSize: 14, textAlign: 'center' }}>
            渲染时遇到了意外错误，请尝试刷新页面。
          </p>
          {this.state.error?.message ? (
            <p
              style={{
                margin: 0,
                maxWidth: 480,
                padding: '12px 16px',
                border: '1px solid #ffd2d2',
                borderRadius: 8,
                background: '#fff5f5',
                color: '#a53131',
                fontSize: 13,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {this.state.error.message}
            </p>
          ) : null}
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 8,
              border: '1px solid #ded7ff',
              borderRadius: 999,
              background: '#fff',
              color: '#5d45d6',
              padding: '10px 24px',
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgb(91 69 180 / 10%)',
            }}
          >
            重试
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
