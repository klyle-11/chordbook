import React, { Component } from 'react';
import type { ReactNode } from 'react';

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  fallbackHeight?: string;
  onError?: (error: Error, componentName: string) => void;
}

/**
 * Lightweight error boundary for individual components
 * Provides component-level isolation and recovery
 */
class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, ComponentErrorBoundaryState> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      errorId: this.generateErrorId()
    };
  }

  generateErrorId(): string {
    return `${this.props.componentName}-${Date.now()}`;
  }

  static getDerivedStateFromError(error: Error): Partial<ComponentErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.componentName}:`, error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, this.props.componentName);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorId: this.generateErrorId() 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col items-center justify-center"
          style={{ minHeight: this.props.fallbackHeight || '200px' }}
        >
          <div className="w-8 h-8 mb-3 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0l-8.998 10c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div className="text-yellow-800 font-medium text-sm mb-2">
            {this.props.componentName} Error
          </div>
          
          <div className="text-yellow-600 text-xs text-center mb-3 max-w-xs">
            This component encountered an error but the rest of the app is still working.
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              Retry
            </button>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs">
                <summary className="cursor-pointer text-yellow-600 hover:text-yellow-800">
                  Debug
                </summary>
                <div className="mt-1 p-2 bg-yellow-100 rounded text-yellow-800 text-xs max-w-xs overflow-auto">
                  {this.state.error?.message}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    // Key prop forces remount on retry
    return (
      <div key={this.state.errorId}>
        {this.props.children}
      </div>
    );
  }
}

export default ComponentErrorBoundary;
