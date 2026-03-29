import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || this.state.error?.toString() || 'Unknown error'
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-warm-50">
          <div className="text-6xl mb-6">😕</div>
          <h1 className="font-display text-2xl text-warm-900 mb-3">Something went wrong</h1>
          <p className="text-warm-600 mb-2 max-w-md">
            An error occurred. Please try refreshing.
          </p>
          <p className="text-warm-400 text-xs mb-6 max-w-md font-mono break-all">
            {errorMessage}
          </p>
          <button 
            onClick={this.handleRefresh}
            className="bg-primary-400 hover:bg-primary-500 text-white font-semibold px-6 py-3 rounded-xl"
          >
            Refresh page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}