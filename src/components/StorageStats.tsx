import { useState, useEffect } from 'react';
import { getStorageStats } from '../lib/fileStorage';

export default function StorageStats() {
  const [stats, setStats] = useState<{
    totalSongs: number;
    totalSizeKB: number;
    oldestFile?: Date;
    newestFile?: Date;
  }>({ totalSongs: 0, totalSizeKB: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = async () => {
    setIsLoading(true);
    try {
      const newStats = await getStorageStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error loading storage stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatSize = (sizeKB: number): string => {
    if (sizeKB < 1024) {
      return `${sizeKB} KB`;
    }
    return `${(sizeKB / 1024).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">File Storage</h4>
        <p className="text-sm text-gray-600">Loading storage statistics...</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">File Storage</h4>
        <button
          onClick={refreshStats}
          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Files:</p>
          <p className="font-medium">{stats.totalSongs} songs</p>
        </div>
        <div>
          <p className="text-gray-600">Size:</p>
          <p className="font-medium">{formatSize(stats.totalSizeKB)}</p>
        </div>
        
        {stats.oldestFile && (
          <div className="col-span-2">
            <p className="text-gray-600">Oldest file:</p>
            <p className="text-xs text-gray-500">{formatDate(stats.oldestFile)}</p>
          </div>
        )}
        
        {stats.newestFile && (
          <div className="col-span-2">
            <p className="text-gray-600">Latest file:</p>
            <p className="text-xs text-gray-500">{formatDate(stats.newestFile)}</p>
          </div>
        )}
      </div>

      {stats.totalSongs > 80 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <p className="text-yellow-800">
            <span className="font-medium">Note:</span> You have {stats.totalSongs} song files. 
            Old files will be automatically cleaned up when you exceed 100 files.
          </p>
        </div>
      )}
    </div>
  );
}
