import React from 'react';

// ErrorBoundary is a special React class component.
// It catches crashes in any child component and shows a friendly error screen.
// Think of it like a "try-catch" but for the entire UI.

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // This runs automatically when any child component crashes
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // This logs the error so you can debug it
  componentDidCatch(error, info) {
    console.error('💥 Buddy App Error:', error, info);
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
          background: '#f8fafc',
          padding: '20px',
          fontFamily: 'Poppins, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤖</div>
          <h2 style={{ fontSize: '22px', color: '#1e293b', marginBottom: '8px' }}>
            Oops! Something went wrong
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', maxWidth: '320px' }}>
            Buddy had a small hiccup! Don't worry — tap the button below to go back to safety.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/home';
            }}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            🏠 Go to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'transparent',
              color: '#2563eb',
              border: '1px solid #2563eb',
              borderRadius: '12px',
              padding: '10px 24px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄 Reload Page
          </button>
          {/* Show error details only during development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '24px', fontSize: '11px', color: '#94a3b8', maxWidth: '400px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer' }}>🔧 Error details (dev only)</summary>
              <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
