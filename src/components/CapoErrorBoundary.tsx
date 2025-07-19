import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  onError?: (error: Error) => void;
  onRetry?: () => void;
  onBypass?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isV8Crash: boolean;
  isFileSystemError: boolean;
  errorCount: number;
}

class CapoErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isV8Crash: false,
      isFileSystemError: false,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check for V8 crash indicators
    const errorString = error.toString().toLowerCase();
    const isV8Crash = errorString.includes('v8') || 
                     errorString.includes('tolocal') || 
                     errorString.includes('maybelocal') ||
                     errorString.includes('fatal');
    
    // Check for file system errors
    const isFileSystemError = errorString.includes('emfile') ||
                             errorString.includes('too many') ||
                             errorString.includes('file operation') ||
                             error.message.includes('EMFILE');

    return {
      hasError: true,
      error,
      isV8Crash,
      isFileSystemError,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Capo Error Boundary caught error:', error, errorInfo);
    
    // Increment error count
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1
    }));

    // Call parent error handler
    this.props.onError?.(error);

    // Force garbage collection if available
    if (window.gc && (this.state.isV8Crash || this.state.isFileSystemError)) {
      try {
        window.gc();
        console.log('🧹 Forced garbage collection after capo error');
      } catch (gcError) {
        console.warn('Failed to force GC:', gcError);
      }
    }
  }

  handleRetry = () => {
    console.log('🔄 Retrying capo operation...');
    
    // Clear any pending retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Wait a bit before retrying to let the system recover
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        isV8Crash: false,
        isFileSystemError: false
      });
      this.props.onRetry?.();
    }, 1000); // 1 second delay
  };

  handleBypass = () => {
    console.log('⚠️ Bypassing capo error handling...');
    this.setState({
      hasError: false,
      error: null,
      isV8Crash: false,
      isFileSystemError: false
    });
    this.props.onBypass?.();
  };

  handleClear = () => {
    console.log('🧹 Clearing capo error state...');
    this.setState({
      hasError: false,
      error: null,
      isV8Crash: false,
      isFileSystemError: false,
      errorCount: 0
    });
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, isV8Crash, isFileSystemError, errorCount } = this.state;

    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 m-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              {isV8Crash ? '🚨 Critical V8 Engine Error' : 
               isFileSystemError ? '📁 File System Overload' : 
               '⚠️ Capo Operation Error'}
            </h3>
            
            <div className="mt-2 text-sm text-red-700">
              {isV8Crash && (
                <div className="mb-3">
                  <p className="font-semibold">V8 engine crashed when changing capo settings.</p>
                  <p>This usually happens when too many file operations occur simultaneously.</p>
                </div>
              )}
              
              {isFileSystemError && (
                <div className="mb-3">
                  <p className="font-semibold">Too many file operations in progress.</p>
                  <p>The system is overwhelmed with file saves. Try again in a moment.</p>
                </div>
              )}
              
              <details className="mt-2">
                <summary className="cursor-pointer text-red-600 hover:text-red-800">
                  Technical Details
                </summary>
                <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono">
                  <div><strong>Error:</strong> {error?.message}</div>
                  <div><strong>Count:</strong> {errorCount} occurrence(s)</div>
                  <div><strong>Type:</strong> {error?.name}</div>
                </div>
              </details>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={this.handleRetry}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                🔄 Retry in 1s
              </button>
              
              <button
                onClick={this.handleBypass}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
              >
                ⚠️ Continue Without Save
              </button>
              
              <button
                onClick={this.handleClear}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                🧹 Clear Error
              </button>
            </div>

            {errorCount > 2 && (
              <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded">
                <p className="text-sm text-orange-800">
                  <strong>⚠️ Multiple errors detected.</strong> Consider restarting the application or using "Continue Without Save" mode.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default CapoErrorBoundary;
