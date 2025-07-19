import { useState, useEffect } from 'react';
import { getAutoSaveStatus, reenableAutoSave } from '../lib/songStorage';
import { capoRateLimiter } from '../lib/capoRateLimit';

function AutoSaveStatus() {
  const [status, setStatus] = useState(getAutoSaveStatus());
  const [rateLimiterStatus, setRateLimiterStatus] = useState(capoRateLimiter.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getAutoSaveStatus());
      setRateLimiterStatus(capoRateLimiter.getStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleReenableAutoSave = () => {
    reenableAutoSave();
    capoRateLimiter.clear();
    setStatus(getAutoSaveStatus());
    setRateLimiterStatus(capoRateLimiter.getStatus());
    
    // Show temporary success message
    console.log('✅ Auto-save re-enabled by user');
  };

  if (!status.disabled && rateLimiterStatus.queueLength === 0) {
    return null; // Don't show anything when everything is working
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {status.disabled && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-2 max-w-sm">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <strong>Auto-save disabled</strong>
              <p className="text-sm">
                {status.maxFailures} consecutive failures detected
              </p>
            </div>
          </div>
          <button
            onClick={handleReenableAutoSave}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            title="Reset failure counter and re-enable automatic saving"
          >
            🔄 Reset & Re-enable
          </button>
        </div>
      )}

      {rateLimiterStatus.queueLength > 0 && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded max-w-sm">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <div>
              <strong>Capo changes queued</strong>
              <p className="text-sm">
                {rateLimiterStatus.queueLength} operation(s) pending
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutoSaveStatus;
