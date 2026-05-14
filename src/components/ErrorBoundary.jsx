import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '1rem',
          fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center',
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h2 style={{ fontSize: '1.4rem', color: '#e74c3c', margin: 0 }}>
            Algo salió mal
          </h2>
          <p style={{ color: '#666', margin: 0, maxWidth: 420 }}>
            La aplicación encontró un error inesperado. Podés intentar recargar la página.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '0.65rem 1.6rem', background: '#3498db', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            Recargar página
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: '1rem', padding: '1rem', background: '#fff5f5',
              border: '1px solid #ffc5c5', borderRadius: 8, fontSize: '0.73rem',
              maxWidth: '80vw', overflow: 'auto', color: '#c0392b', textAlign: 'left',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
