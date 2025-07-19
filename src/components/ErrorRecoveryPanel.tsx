import React, { useState, useEffect } from 'react';
import { errorMonitor, type ComponentError } from '../services/ErrorMonitoring';

const ErrorRecoveryPanel: React.FC = () => {
  const [errors, setErrors] = useState<ComponentError[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<Record<string, { total: number; recovered: number }>>({});

  useEffect(() => {
    // Update errors and stats every 2 seconds
    const interval = setInterval(() => {
      const recentErrors = errorMonitor.getRecentErrors();
      const errorStats = errorMonitor.getErrorStats();
      
      setErrors(recentErrors);
      setStats(errorStats);
      
      // Auto-collapse if no recent errors
      if (recentErrors.length === 0) {
        setIsExpanded(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleClearErrors = () => {
    errorMonitor.clearErrors();
    setErrors([]);
    setStats({});
    setIsExpanded(false);
  };

  const recentErrors = errors.slice(0, 5); // Show only last 5
  const hasErrors = errors.length > 0;
  const hasRecentUnrecovered = errors.some(err => !err.recovered && 
    (Date.now() - err.timestamp.getTime()) < 30000 // Last 30 seconds
  );

  if (!hasErrors) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-lg border-l-4 transition-all duration-300 ${
        hasRecentUnrecovered ? 'border-red-500' : 'border-yellow-500'
      }`}>
        {/* Header */}
        <div 
          className="p-3 cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              hasRecentUnrecovered ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm font-medium text-gray-700">
              {hasRecentUnrecovered ? 'Active Errors' : 'Error Log'}
            </span>
            <span className="text-xs text-gray-500">
              ({errors.length})
            </span>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200">
            {/* Stats */}
            <div className="p-3 bg-gray-50">
              <div className="text-xs text-gray-600 mb-2">Component Health:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(stats).map(([component, stat]) => (
                  <div key={component} className="flex justify-between">
                    <span className="text-gray-700">{component}:</span>
                    <span className={stat.total > stat.recovered ? 'text-red-600' : 'text-green-600'}>
                      {stat.recovered}/{stat.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Errors */}
            <div className="p-3 max-h-40 overflow-y-auto">
              <div className="text-xs text-gray-600 mb-2">Recent Errors:</div>
              {recentErrors.map((error, index) => (
                <div key={index} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${error.recovered ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-medium text-gray-700">
                      {error.componentName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {error.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 ml-3 truncate">
                    {error.error.message}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-gray-200 flex gap-2">
              <button
                onClick={handleClearErrors}
                className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorRecoveryPanel;
