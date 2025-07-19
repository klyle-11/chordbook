import { useState, useEffect } from 'react';
import { 
  createFullBackup, 
  downloadBackupAsJSON,
  getBackupInfo,
  loadBackupFromLocalStorage,
  restoreFromBackup,
  importBackupFromJSON,
  performAutoBackup
} from '../lib/backupService';
import StorageStats from './StorageStats';

interface BackupManagerProps {
  onDataRestored?: () => void;
}

export default function BackupManager({ onDataRestored }: BackupManagerProps) {
  const [backupInfo, setBackupInfo] = useState<{ exists: boolean, timestamp?: string }>({ exists: false });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    // Load initial backup info
    const info = getBackupInfo();
    setBackupInfo(info);

    // Set up auto-backup every 5 minutes
    const autoBackupInterval = setInterval(() => {
      performAutoBackup();
      // Refresh backup info after auto-backup
      const updatedInfo = getBackupInfo();
      setBackupInfo(updatedInfo);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(autoBackupInterval);
  }, []);

  const handleCreateFullBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = createFullBackup();
      
      let message = 'Backup created: ';
      if (result.localStorage && result.download) {
        message += 'Saved to local storage and downloaded as JSON file';
      } else if (result.localStorage) {
        message += 'Saved to local storage only (download failed)';
      } else if (result.download) {
        message += 'Downloaded as JSON file only (local storage failed)';
      } else {
        message = 'Backup failed for both sources';
      }
      
      alert(message);
      
      // Refresh backup info
      const info = getBackupInfo();
      setBackupInfo(info);
    } catch (error) {
      alert('Backup failed: ' + (error as Error).message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = () => {
    try {
      const success = downloadBackupAsJSON();
      if (success) {
        alert('Backup downloaded successfully');
      } else {
        alert('Failed to download backup');
      }
    } catch (error) {
      alert('Download failed: ' + (error as Error).message);
    }
  };

  const handleRestoreFromLocalStorage = async () => {
    if (!confirm('This will replace all current data with the backup. Are you sure?')) {
      return;
    }

    setIsRestoring(true);
    try {
      const backup = loadBackupFromLocalStorage();
      if (!backup) {
        alert('No backup found in local storage');
        return;
      }

      const success = restoreFromBackup(backup);
      if (success) {
        alert('Data restored successfully from local storage backup');
        onDataRestored?.();
      } else {
        alert('Failed to restore data');
      }
    } catch (error) {
      alert('Restore failed: ' + (error as Error).message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportBackup = async () => {
    if (!importFile) return;

    if (!confirm('This will replace all current data with the imported backup. Are you sure?')) {
      return;
    }

    setIsRestoring(true);
    try {
      const backup = await importBackupFromJSON(importFile);
      const success = restoreFromBackup(backup);
      
      if (success) {
        alert('Data restored successfully from imported backup');
        onDataRestored?.();
        setShowImportDialog(false);
        setImportFile(null);
      } else {
        alert('Failed to restore data from backup');
      }
    } catch (error) {
      alert('Import failed: ' + (error as Error).message);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Restore</h3>
      
      {/* Backup Info */}
      {backupInfo.exists && backupInfo.timestamp && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            <span className="font-medium">Last backup:</span> {formatTimestamp(backupInfo.timestamp)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Auto-backup runs every 5 minutes
          </p>
        </div>
      )}
      
      {/* Backup Actions */}
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Create Backup</h4>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCreateFullBackup}
              disabled={isCreatingBackup}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingBackup ? 'Creating...' : 'Full Backup (Local + Download)'}
            </button>
            
            <button
              onClick={handleDownloadBackup}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Download JSON Only
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Full backup saves to local storage and downloads a JSON file
          </p>
        </div>

        {/* Restore Actions */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Restore Data</h4>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRestoreFromLocalStorage}
              disabled={!backupInfo.exists || isRestoring}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRestoring ? 'Restoring...' : 'Restore from Local Storage'}
            </button>
            
            <button
              onClick={() => setShowImportDialog(true)}
              disabled={isRestoring}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Import from JSON File
            </button>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Backup</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select backup JSON file
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {importFile && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Warning:</span> This will replace all current songs and progressions with the imported data.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportBackup}
                disabled={!importFile || isRestoring}
                className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isRestoring ? 'Importing...' : 'Import & Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <StorageStats />
    </div>
  );
}
