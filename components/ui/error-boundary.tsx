'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error 
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
      }

      // Default error UI
      return (
        <Card className="border-red-800 bg-red-900/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              ⚠️ Something went wrong
            </CardTitle>
            <CardDescription className="text-red-300">
              A rendering error occurred while displaying the data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-200">
              <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
            </div>
            
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-sm text-red-400 cursor-pointer">
                  Debug Information (Development Only)
                </summary>
                <pre className="mt-2 p-4 bg-gray-900 rounded-lg text-xs text-red-300 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error?.stack}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Specialized error boundary for data rendering
export function DataRenderBoundary({ 
  children, 
  dataType = 'data' 
}: { 
  children: React.ReactNode
  dataType?: string 
}) {
  const fallback = ({ error, retry }: { error?: Error; retry?: () => void }) => (
    <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-400">⚠️</span>
        <span className="text-yellow-300 font-medium">
          Error rendering {dataType}
        </span>
      </div>
      <div className="text-sm text-yellow-200 mb-3">
        {error?.message || 'Unable to display this section'}
      </div>
      {retry && (
        <button
          onClick={retry}
          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-black rounded text-sm transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  )
}