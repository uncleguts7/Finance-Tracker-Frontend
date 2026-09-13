import { Component, type ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
          <div className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <h2 className="text-lg font-semibold text-red-700">Something went wrong</h2>
            <p className="mt-2 text-sm text-red-600">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}