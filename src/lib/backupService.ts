import type { Song, SavedSong } from '../types/song';
import type { Progression } from '../types/progression';
import { loadSongs, saveSongs } from './songStorage';
import { loadProgressions, saveProgressions } from './progressionStorage';
import { logger } from './logger';

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
  
  // Helper function to safely convert to ISO string
  const safeToISOString = (date: Date | string): string => {
    if (typeof date === 'string') {
      return date; // Already a string, return as-is
    }
    if (date instanceof Date) {
      return date.toISOString();
    }
    // Fallback for any other type
    return new Date(date).toISOString();
  };
  
  // Serialize songs for JSON storage
  const serializedSongs: SavedSong[] = songs.map(song => ({
    ...song,
    progressions: song.progressions.map(p => ({
      ...p,
      createdAt: safeToISOString(p.createdAt),
      updatedAt: safeToISOString(p.updatedAt)
    })),
    createdAt: safeToISOString(song.createdAt),
    updatedAt: safeToISOString(song.updatedAt)
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
    logger.infoThrottled('backup-save', 'Backup saved to localStorage at', backup.timestamp);
    return true;
  } catch (error) {
    logger.error('Failed to save backup to localStorage:', error);
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
    
    logger.info('Backup downloaded as JSON file at', backup.timestamp);
    return true;
  } catch (error) {
    logger.error('Failed to download backup as JSON:', error);
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
    logger.error('Failed to load backup from localStorage:', error);
    return null;
  }
}

// Restore data from backup
export function restoreFromBackup(backup: BackupData): boolean {
  try {
    // Restore songs - convert ISO string dates back to Date objects
    const songs: Song[] = backup.songs.map(savedSong => ({
      ...savedSong,
      progressions: savedSong.progressions.map(p => ({
        ...p,
        // p.createdAt and p.updatedAt are ISO strings from the backup, convert to Date
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      })),
      // savedSong.createdAt and savedSong.updatedAt are ISO strings from the backup, convert to Date
      createdAt: new Date(savedSong.createdAt),
      updatedAt: new Date(savedSong.updatedAt)
    }));
    
    saveSongs(songs);
    
    // Restore progressions
    saveProgressions(backup.progressions);
    
    logger.info('Data restored from backup created at', backup.timestamp);
    return true;
  } catch (error) {
    logger.error('Failed to restore from backup:', error);
    return false;
  }
}

// Auto-backup function that runs periodically
export function performAutoBackup(): void {
  try {
    saveBackupToLocalStorage();
    logger.debug('Auto-backup completed');
  } catch (error) {
    logger.error('Auto-backup failed:', error);
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
          throw new Error('Invalid file content: File appears to be empty or corrupted');
        }
        
        let backup: unknown;
        try {
          backup = JSON.parse(result);
        } catch (parseError) {
          throw new Error(`Invalid JSON format: ${(parseError as Error).message}`);
        }
        
        // Type guard to ensure backup is an object
        if (!backup || typeof backup !== 'object') {
          throw new Error('Invalid backup file: Root element must be an object');
        }
        
        const backupObj = backup as Record<string, unknown>;
        
        // Detailed validation with specific error messages
        const validationErrors: string[] = [];
        
        if (!backupObj) {
          validationErrors.push('Backup data is null or undefined');
        } else {
          if (!backupObj.songs) {
            validationErrors.push('Missing "songs" property');
          } else if (!Array.isArray(backupObj.songs)) {
            validationErrors.push('"songs" property must be an array');
          }
          
          if (!backupObj.progressions) {
            validationErrors.push('Missing "progressions" property');
          } else if (!Array.isArray(backupObj.progressions)) {
            validationErrors.push('"progressions" property must be an array');
          }
          
          if (!backupObj.timestamp) {
            validationErrors.push('Missing "timestamp" property');
          } else if (typeof backupObj.timestamp !== 'string') {
            validationErrors.push('"timestamp" property must be a string');
          }
          
          if (!backupObj.version) {
            validationErrors.push('Missing "version" property');
          } else if (typeof backupObj.version !== 'string') {
            validationErrors.push('"version" property must be a string');
          }
          
          // Check if songs have required structure
          if (backupObj.songs && Array.isArray(backupObj.songs)) {
            backupObj.songs.forEach((song: unknown, index: number) => {
              if (!song || typeof song !== 'object') {
                validationErrors.push(`Song at index ${index} is not a valid object`);
                return;
              }
              const songObj = song as Record<string, unknown>;
              if (!songObj.id) {
                validationErrors.push(`Song at index ${index} is missing "id" property`);
              }
              if (!songObj.name) {
                validationErrors.push(`Song at index ${index} is missing "name" property`);
              }
              if (!songObj.createdAt) {
                validationErrors.push(`Song at index ${index} is missing "createdAt" property`);
              }
              if (!songObj.updatedAt) {
                validationErrors.push(`Song at index ${index} is missing "updatedAt" property`);
              }
            });
          }
        }
        
        if (validationErrors.length > 0) {
          throw new Error(`Invalid backup file structure:\n${validationErrors.join('\n')}`);
        }
        
        logger.debug('Backup file validation successful:', {
          songsCount: (backupObj.songs as unknown[]).length,
          progressionsCount: (backupObj.progressions as unknown[]).length,
          version: backupObj.version,
          timestamp: backupObj.timestamp
        });
        
        resolve(backupObj as unknown as BackupData);
      } catch (error) {
        logger.error('Import error:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file: File reading error occurred'));
    };
    
    reader.readAsText(file);
  });
}
