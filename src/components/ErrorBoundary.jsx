import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-lg font-semibold text-navy-800">Something went wrong</h2>
          <p className="text-sm text-muted mt-2 max-w-md">{String(this.state.error?.message || this.state.error).slice(0, 300)}</p>
          <button onClick={() => location.reload()} className="mt-4 px-4 py-2 rounded-lg bg-navy-700 text-white text-sm">Reload</button>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-2 text-xs text-muted underline">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
