import React, { useState } from 'react';

const ErrorTestComponent: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error thrown by ErrorTestComponent');
  }

  const triggerAsyncError = async () => {
    // This will throw an error in the next tick
    setTimeout(() => {
      throw new Error('Async error thrown by ErrorTestComponent');
    }, 100);
  };

  const triggerNullError = () => {
    const obj = null;
    // @ts-expect-error: Intentionally accessing property of null for testing
    return obj.property; // This will throw
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-red-100 border border-red-300 rounded-lg p-3">
      <div className="text-red-800 font-medium text-sm mb-2">Error Testing (Dev Only)</div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShouldThrow(true)}
          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Trigger Component Error
        </button>
        <button
          onClick={triggerAsyncError}
          className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Trigger Async Error
        </button>
        <button
          onClick={triggerNullError}
          className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Trigger Null Error
        </button>
      </div>
    </div>
  );
};

export default ErrorTestComponent;
