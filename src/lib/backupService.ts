import type { Song, SavedSong } from '../types/song';
import type { Progression } from '../types/progression';
import { loadSongs, saveSongs } from './songStorage';
import { loadProgressions, saveProgressions } from './progressionStorage';

interface BackupData {
  songs: SavedSong[];
  progressions: Progression[];
  timestamp: string;
  version: string;
}

const BACKUP_STORAGE_KEY = 'chordbook-backup';
const BACKUP_VERSION = '1.0';

// Generate a timestamp for backup identification
function generateTimestamp(): string {
  return new Date().toISOString();
}

// Create a complete backup of all data
export function createBackup(): BackupData {
  const songs = loadSongs();
  const progressions = loadProgressions();
  
  // Serialize songs for JSON storage
  const serializedSongs: SavedSong[] = songs.map(song => ({
    ...song,
    progressions: song.progressions.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    })),
    createdAt: song.createdAt.toISOString(),
    updatedAt: song.updatedAt.toISOString(),
    lastOpened: song.lastOpened?.toISOString()
  }));
  
  const backup: BackupData = {
    songs: serializedSongs,
    progressions,
    timestamp: generateTimestamp(),
    version: BACKUP_VERSION
  };
  
  return backup;
}

// Save backup to localStorage (primary backup)
export function saveBackupToLocalStorage(): boolean {
  try {
    const backup = createBackup();
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
    console.log('Backup saved to localStorage at', backup.timestamp);
    return true;
  } catch (error) {
    console.error('Failed to save backup to localStorage:', error);
    return false;
  }
}

// Save backup to JSON file download (secondary backup)
export function downloadBackupAsJSON(): boolean {
  try {
    const backup = createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chordbook-backup-${backup.timestamp.replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('Backup downloaded as JSON file at', backup.timestamp);
    return true;
  } catch (error) {
    console.error('Failed to download backup as JSON:', error);
    return false;
  }
}

// Save backup to both sources
export function createFullBackup(): { localStorage: boolean, download: boolean } {
  const localStorageSuccess = saveBackupToLocalStorage();
  const downloadSuccess = downloadBackupAsJSON();
  
  return {
    localStorage: localStorageSuccess,
    download: downloadSuccess
  };
}

// Load backup from localStorage
export function loadBackupFromLocalStorage(): BackupData | null {
  try {
    const backupStr = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!backupStr) return null;
    
    const backup: BackupData = JSON.parse(backupStr);
    return backup;
  } catch (error) {
    console.error('Failed to load backup from localStorage:', error);
    return null;
  }
}

// Restore data from backup
export function restoreFromBackup(backup: BackupData): boolean {
  try {
    // Restore songs
    const songs: Song[] = backup.songs.map(savedSong => ({
      ...savedSong,
      progressions: savedSong.progressions.map(p => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      })),
      createdAt: new Date(savedSong.createdAt),
      updatedAt: new Date(savedSong.updatedAt),
      lastOpened: savedSong.lastOpened ? new Date(savedSong.lastOpened) : undefined
    }));
    
    saveSongs(songs);
    
    // Restore progressions
    saveProgressions(backup.progressions);
    
    console.log('Data restored from backup created at', backup.timestamp);
    return true;
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return false;
  }
}

// Auto-backup function that runs periodically
export function performAutoBackup(): void {
  try {
    saveBackupToLocalStorage();
    console.log('Auto-backup completed');
  } catch (error) {
    console.error('Auto-backup failed:', error);
  }
}

// Get backup information
export function getBackupInfo(): { exists: boolean, timestamp?: string, version?: string } {
  const backup = loadBackupFromLocalStorage();
  if (!backup) {
    return { exists: false };
  }
  
  return {
    exists: true,
    timestamp: backup.timestamp,
    version: backup.version
  };
}

// Import backup from uploaded JSON file
export function importBackupFromJSON(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') {
          throw new Error('Invalid file content');
        }
        
        const backup: BackupData = JSON.parse(result);
        
        // Validate backup structure
        if (!backup.songs || !backup.progressions || !backup.timestamp || !backup.version) {
          throw new Error('Invalid backup file structure');
        }
        
        resolve(backup);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

// Auto-save status tracking
interface AutoSaveStatus {
  disabled: boolean;
  maxFailures: number;
  currentFailures: number;
  lastError?: string;
}

const AUTO_SAVE_STATUS_KEY = 'chordbook-autosave-status';
const MAX_FAILURES = 5;

// Get current auto-save status
export function getAutoSaveStatus(): AutoSaveStatus {
  try {
    const stored = localStorage.getItem(AUTO_SAVE_STATUS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load auto-save status:', error);
  }
  
  return {
    disabled: false,
    maxFailures: MAX_FAILURES,
    currentFailures: 0
  };
}

// Update auto-save status
function setAutoSaveStatus(status: AutoSaveStatus): void {
  try {
    localStorage.setItem(AUTO_SAVE_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.warn('Failed to save auto-save status:', error);
  }
}

// Re-enable auto-save after it was disabled
export function reenableAutoSave(): void {
  const status = getAutoSaveStatus();
  status.disabled = false;
  status.currentFailures = 0;
  status.lastError = undefined;
  setAutoSaveStatus(status);
}

// Record a save failure
export function recordSaveFailure(error: string): void {
  const status = getAutoSaveStatus();
  status.currentFailures += 1;
  status.lastError = error;
  
  if (status.currentFailures >= status.maxFailures) {
    status.disabled = true;
  }
  
  setAutoSaveStatus(status);
}

// Record a successful save (reset failure count)
export function recordSaveSuccess(): void {
  const status = getAutoSaveStatus();
  status.currentFailures = 0;
  status.lastError = undefined;
  setAutoSaveStatus(status);
}
