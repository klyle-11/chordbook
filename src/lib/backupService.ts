import type { Song, SavedSong } from '../types/song';
import { loadSongsAsync, saveSongsAsync } from './songStorage';

interface BackupData {
  songs: SavedSong[];
  timestamp: string;
  version: string;
}

const BACKUP_STORAGE_KEY = 'chordbook-backup';
const BACKUP_VERSION = '2.0';

export async function createBackup(): Promise<BackupData> {
  const songs = await loadSongsAsync();

  const serializedSongs: SavedSong[] = songs.map(song => ({
    ...song,
    progressions: song.progressions.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    })),
    pairings: song.pairings?.map(pair => ({
      ...pair,
      createdAt: pair.createdAt.toISOString(),
      updatedAt: pair.updatedAt.toISOString()
    })),
    createdAt: song.createdAt.toISOString(),
    updatedAt: song.updatedAt.toISOString(),
    lastOpened: song.lastOpened?.toISOString()
  }));

  return {
    songs: serializedSongs,
    timestamp: new Date().toISOString(),
    version: BACKUP_VERSION
  };
}

export async function saveBackupToLocalStorage(): Promise<boolean> {
  try {
    const backup = await createBackup();
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
    return true;
  } catch (error) {
    console.error('Failed to save backup to localStorage:', error);
    return false;
  }
}

export async function downloadBackupAsJSON(): Promise<boolean> {
  try {
    const backup = await createBackup();
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
    return true;
  } catch (error) {
    console.error('Failed to download backup as JSON:', error);
    return false;
  }
}

export async function createFullBackup(): Promise<{ localStorage: boolean, download: boolean }> {
  const localStorageSuccess = await saveBackupToLocalStorage();
  const downloadSuccess = await downloadBackupAsJSON();
  return { localStorage: localStorageSuccess, download: downloadSuccess };
}

export function loadBackupFromLocalStorage(): BackupData | null {
  try {
    const backupStr = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!backupStr) return null;
    return JSON.parse(backupStr);
  } catch (error) {
    console.error('Failed to load backup from localStorage:', error);
    return null;
  }
}

export async function restoreFromBackup(backup: BackupData): Promise<boolean> {
  try {
    const songs: Song[] = backup.songs.map(savedSong => ({
      ...savedSong,
      progressions: savedSong.progressions.map(p => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      })),
      pairings: savedSong.pairings?.map(pair => ({
        ...pair,
        createdAt: new Date(pair.createdAt),
        updatedAt: new Date(pair.updatedAt)
      })),
      createdAt: new Date(savedSong.createdAt),
      updatedAt: new Date(savedSong.updatedAt),
      lastOpened: savedSong.lastOpened ? new Date(savedSong.lastOpened) : undefined
    }));

    await saveSongsAsync(songs);
    return true;
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return false;
  }
}

export async function performAutoBackup(): Promise<void> {
  try {
    await saveBackupToLocalStorage();
  } catch (error) {
    console.error('Auto-backup failed:', error);
  }
}

export function getBackupInfo(): { exists: boolean, timestamp?: string, version?: string } {
  const backup = loadBackupFromLocalStorage();
  if (!backup) return { exists: false };
  return { exists: true, timestamp: backup.timestamp, version: backup.version };
}

export function importBackupFromJSON(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') throw new Error('Invalid file content');

        const backup: BackupData = JSON.parse(result);
        if (!backup.songs || !backup.timestamp || !backup.version) {
          throw new Error('Invalid backup file structure');
        }
        resolve(backup);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
