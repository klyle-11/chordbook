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

interface BackupManagerProps {
  onDataRestored?: () => void;
  compact?: boolean;
}

export default function BackupManager({ onDataRestored, compact }: BackupManagerProps) {
  const [backupInfo, setBackupInfo] = useState<{ exists: boolean, timestamp?: string }>({ exists: false });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const info = getBackupInfo();
    setBackupInfo(info);
    const interval = setInterval(() => {
      performAutoBackup();
      setBackupInfo(getBackupInfo());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-clear status message
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleCreateFullBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = await createFullBackup();
      const msg = result.localStorage && result.download
        ? 'Saved and downloaded.'
        : result.localStorage ? 'Saved locally.' : result.download ? 'Downloaded.' : 'Backup failed.';
      setStatusMessage({ text: msg, type: result.localStorage || result.download ? 'success' : 'error' });
      setBackupInfo(getBackupInfo());
    } catch (error) {
      setStatusMessage({ text: 'Backup failed: ' + (error as Error).message, type: 'error' });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async () => {
    const success = await downloadBackupAsJSON();
    setStatusMessage({ text: success ? 'Backup downloaded.' : 'Download failed.', type: success ? 'success' : 'error' });
  };

  const handleRestoreFromLocalStorage = async () => {
    setIsRestoring(true);
    try {
      const backup = loadBackupFromLocalStorage();
      if (!backup) {
        setStatusMessage({ text: 'No backup found.', type: 'error' });
        return;
      }
      const success = await restoreFromBackup(backup);
      if (success) {
        setStatusMessage({ text: 'Restored successfully.', type: 'success' });
        setShowRestoreConfirm(false);
        onDataRestored?.();
      } else {
        setStatusMessage({ text: 'Restore failed.', type: 'error' });
      }
    } catch (error) {
      setStatusMessage({ text: 'Restore failed: ' + (error as Error).message, type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleImportBackup = async () => {
    if (!importFile) return;
    setIsRestoring(true);
    try {
      const backup = await importBackupFromJSON(importFile);
      const success = await restoreFromBackup(backup);
      if (success) {
        setStatusMessage({ text: 'Imported successfully.', type: 'success' });
        setShowImportDialog(false);
        setImportFile(null);
        onDataRestored?.();
      } else {
        setStatusMessage({ text: 'Import failed.', type: 'error' });
      }
    } catch (error) {
      setStatusMessage({ text: 'Import failed: ' + (error as Error).message, type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const [showMenu, setShowMenu] = useState(false);

  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        {/* Folder icon trigger */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="backup-menu__trigger"
          aria-label="Backup menu"
          title="Backup & Restore"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}>
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
        </button>

        {/* Context menu */}
        {showMenu && (
          <>
            <div className="backup-menu__backdrop" onClick={() => setShowMenu(false)} />
            <div className="backup-menu__popover">
              {backupInfo.exists && backupInfo.timestamp && (
                <div className="backup-menu__info">
                  Last backup: {new Date(backupInfo.timestamp).toLocaleString()}
                </div>
              )}
              {statusMessage && (
                <div className="backup-menu__info" style={{ color: statusMessage.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                  {statusMessage.text}
                </div>
              )}
              <button
                className="backup-menu__item"
                onClick={() => { handleCreateFullBackup(); setShowMenu(false); }}
                disabled={isCreatingBackup}
              >
                {isCreatingBackup ? 'Saving...' : 'Backup Now'}
              </button>
              <button
                className="backup-menu__item"
                onClick={() => { handleDownloadBackup(); setShowMenu(false); }}
              >
                Export JSON
              </button>
              <button
                className="backup-menu__item"
                onClick={() => { setShowImportDialog(true); setShowMenu(false); }}
                disabled={isRestoring}
              >
                Import JSON
              </button>
              <button
                className="backup-menu__item"
                onClick={() => { setShowRestoreConfirm(true); setShowMenu(false); }}
                disabled={!backupInfo.exists || isRestoring}
              >
                Restore from Local
              </button>
            </div>
          </>
        )}

        {/* Restore confirmation dialog */}
        {showRestoreConfirm && (
          <div className="fixed inset-0 themed-overlay flex items-center justify-center z-50 p-4">
            <div className="themed-dialog p-6 max-w-md w-full animate-fade-in">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>Restore from Local Backup</h3>
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--danger-subtle)' }}>
                <p className="text-sm" style={{ color: 'var(--danger)' }}>This will replace all current data with the backup.</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowRestoreConfirm(false)} className="themed-btn-secondary">Cancel</button>
                <button onClick={handleRestoreFromLocalStorage} disabled={isRestoring} className="themed-btn-danger">
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import dialog */}
        {showImportDialog && (
          <div className="fixed inset-0 themed-overlay flex items-center justify-center z-50 p-4">
            <div className="themed-dialog p-6 max-w-md w-full animate-fade-in">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>Import Backup</h3>
              <input
                type="file"
                accept=".json"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm mb-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              {importFile && (
                <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--danger-subtle)' }}>
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>This will replace all current data.</p>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowImportDialog(false); setImportFile(null); }} className="themed-btn-secondary">Cancel</button>
                <button onClick={handleImportBackup} disabled={!importFile || isRestoring} className="themed-btn-primary">
                  {isRestoring ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="themed-card p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
        Backup & Restore
      </h3>

      {backupInfo.exists && backupInfo.timestamp && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--success-subtle)', border: '1px solid var(--success)' }}>
          <p className="text-sm" style={{ color: 'var(--success)' }}>
            Last backup: {new Date(backupInfo.timestamp).toLocaleString()}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Auto-backup every 5 min</p>
        </div>
      )}

      {statusMessage && (
        <div className="mb-4 p-3 rounded-lg" style={{
          background: statusMessage.type === 'success' ? 'var(--success-subtle)' : 'var(--danger-subtle)',
          border: `1px solid ${statusMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
        }}>
          <p className="text-sm" style={{ color: statusMessage.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {statusMessage.text}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Create</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleCreateFullBackup} disabled={isCreatingBackup} className="themed-btn-primary">
              {isCreatingBackup ? 'Creating...' : 'Full Backup'}
            </button>
            <button onClick={handleDownloadBackup} className="themed-btn-secondary">Download JSON</button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Restore</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowRestoreConfirm(true)} disabled={!backupInfo.exists || isRestoring} className="themed-btn-primary">
              {isRestoring ? 'Restoring...' : 'From Local'}
            </button>
            <button onClick={() => setShowImportDialog(true)} disabled={isRestoring} className="themed-btn-secondary">
              Import JSON
            </button>
          </div>
        </div>
      </div>

      {/* Restore confirmation dialog */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 themed-overlay flex items-center justify-center z-50 p-4">
          <div className="themed-dialog p-6 max-w-md w-full animate-fade-in">
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>Restore from Local Backup</h3>
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--danger-subtle)' }}>
              <p className="text-sm" style={{ color: 'var(--danger)' }}>This will replace all current data with the backup.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRestoreConfirm(false)} className="themed-btn-secondary">Cancel</button>
              <button onClick={handleRestoreFromLocalStorage} disabled={isRestoring} className="themed-btn-danger">
                {isRestoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 themed-overlay flex items-center justify-center z-50 p-4">
          <div className="themed-dialog p-6 max-w-md w-full animate-fade-in">
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>Import Backup</h3>
            <input
              type="file"
              accept=".json"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-sm mb-4"
              style={{ color: 'var(--text-secondary)' }}
            />
            {importFile && (
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--danger-subtle)' }}>
                <p className="text-sm" style={{ color: 'var(--danger)' }}>This will replace all current data.</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowImportDialog(false); setImportFile(null); }} className="themed-btn-secondary">Cancel</button>
              <button onClick={handleImportBackup} disabled={!importFile || isRestoring} className="themed-btn-primary">
                {isRestoring ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
