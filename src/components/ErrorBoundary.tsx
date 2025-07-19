import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; errorInfo?: React.ErrorInfo; onReset?: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// Default fallback component
function DefaultErrorFallback({ 
  error, 
  errorInfo, 
  onReset 
}: { 
  error?: Error; 
  errorInfo?: React.ErrorInfo; 
  onReset?: () => void; 
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-red-800 mb-4 flex items-center gap-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Something went wrong
          </h1>
          
          <p className="text-red-700 mb-4">
            The application encountered an unexpected error. This has been logged for debugging.
          </p>
          
          {error && (
            <div className="mb-4">
              <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
              <code className="block bg-red-100 border border-red-300 rounded p-3 text-sm text-red-900 whitespace-pre-wrap break-words">
                {error.name}: {error.message}
              </code>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onReset}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>

        {/* Debug information - only show in development */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-2">Debug Information:</h3>
            <details className="mb-4">
              <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                Stack Trace
              </summary>
              <code className="block bg-gray-100 border border-gray-300 rounded p-3 text-sm text-gray-900 whitespace-pre-wrap break-words mt-2">
                {error.stack}
              </code>
            </details>
            
            {errorInfo && (
              <details>
                <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                  Component Stack
                </summary>
                <code className="block bg-gray-100 border border-gray-300 rounded p-3 text-sm text-gray-900 whitespace-pre-wrap break-words mt-2">
                  {errorInfo.componentStack}
                </code>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
