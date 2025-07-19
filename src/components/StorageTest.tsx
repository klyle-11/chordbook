import React, { useEffect, useState } from 'react';

const StorageTest: React.FC = () => {
  const [storageData, setStorageData] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    try {
      console.log('🔧 StorageTest: Testing localStorage access...');
      
      // Check current storage
      const currentSongs = localStorage.getItem('chordbook-songs');
      console.log('🔧 StorageTest: Current songs storage:', currentSongs);
      setStorageData(currentSongs || 'No songs found');
      
      // Test write
      localStorage.setItem('chordbook-test', 'test-value');
      const testRead = localStorage.getItem('chordbook-test');
      
      if (testRead === 'test-value') {
        setTestResult('✅ localStorage is working');
        console.log('🔧 StorageTest: localStorage test passed');
      } else {
        setTestResult('❌ localStorage read failed');
        console.log('🔧 StorageTest: localStorage read failed');
      }
      
      // Cleanup
      localStorage.removeItem('chordbook-test');
      
    } catch (error) {
      console.error('🔧 StorageTest: Error testing localStorage:', error);
      setTestResult(`❌ localStorage error: ${error}`);
    }
  }, []);

  const handleClearStorage = () => {
    if (confirm('Clear all chordbook storage?')) {
      Object.keys(localStorage).filter(key => key.startsWith('chordbook')).forEach(key => {
        localStorage.removeItem(key);
      });
      setStorageData('Cleared');
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-3 max-w-xs">
      <div className="text-blue-800 font-medium text-sm mb-2">Storage Test (Dev Only)</div>
      
      <div className="text-xs mb-2">
        <strong>Test Result:</strong> {testResult}
      </div>
      
      <div className="text-xs mb-2 max-h-20 overflow-y-auto">
        <strong>Current Storage:</strong>
        <div className="bg-blue-50 p-1 rounded mt-1 break-all">
          {storageData.slice(0, 200)}{storageData.length > 200 ? '...' : ''}
        </div>
      </div>
      
      <button
        onClick={handleClearStorage}
        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Clear Storage
      </button>
    </div>
  );
};

export default StorageTest;
