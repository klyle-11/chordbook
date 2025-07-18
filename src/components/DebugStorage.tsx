import { useState } from 'react';

export default function DebugStorage() {
  const [storageData, setStorageData] = useState<{
    progressions: unknown;
    currentProgression: string | null;
    customChords: unknown;
    allKeys: string[];
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const checkStorage = () => {
    const progressions = localStorage.getItem('chordbook-progressions');
    const currentProgression = localStorage.getItem('chordbook-current-progression');
    const customChords = localStorage.getItem('chordbook-custom-chords');
    
    setStorageData({
      progressions: progressions ? JSON.parse(progressions) : null,
      currentProgression,
      customChords: customChords ? JSON.parse(customChords) : null,
      allKeys: Object.keys(localStorage).filter(key => key.includes('chord'))
    });
    setShowDebug(true);
  };

  const exportData = () => {
    const data = {
      progressions: localStorage.getItem('chordbook-progressions'),
      currentProgression: localStorage.getItem('chordbook-current-progression'),
      customChords: localStorage.getItem('chordbook-custom-chords'),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chordbook-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!showDebug) {
    return (
      <div className="flex justify-end mt-8 mb-4 mr-4">
        <button
          onClick={checkStorage}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          title="Recovery & Debug Tools"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Storage Debug Information</h3>
          <div className="space-x-2">
            <button
              onClick={exportData}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Export Backup
            </button>
            <button
              onClick={() => setShowDebug(false)}
              className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
        
        {storageData && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">All ChordBook Keys:</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {JSON.stringify(storageData.allKeys, null, 2)}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Saved Progressions:</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {JSON.stringify(storageData.progressions, null, 2)}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Current Progression:</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {storageData.currentProgression || 'null'}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Custom Chords:</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {JSON.stringify(storageData.customChords, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
