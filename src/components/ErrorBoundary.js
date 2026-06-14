import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Buddy error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F0F4FF',
          padding: '24px',
          fontFamily: 'Segoe UI, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🤖</div>
          <h2 style={{ fontSize: 20, color: '#1E293B', marginBottom: 8 }}>
            Oops! Something went wrong
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 24, maxWidth: 300 }}>
            Buddy had a small hiccup. Tap below to go back safely.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/home'; }}
            style={{
              background: 'linear-gradient(135deg, #60A5FA, #2563EB)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 10,
              fontFamily: 'inherit'
            }}
          >
            Go to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'transparent',
              color: '#2563EB',
              border: '1.5px solid #2563EB',
              borderRadius: 12,
              padding: '10px 24px',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
