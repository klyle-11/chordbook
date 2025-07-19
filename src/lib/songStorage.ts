import type { Song, SavedSong, NamedProgression } from '../types/song';
import type { Progression } from '../types/progression';
import { DEFAULT_TUNING, type Tuning, type CapoSettings } from './tunings';
import { saveSongsToFiles } from './fileStorage';

const SONGS_STORAGE_KEY = 'chordbook-songs';
const CURRENT_SONG_KEY = 'chordbook-current-song';
const MIGRATION_FLAG_KEY = 'chordbook-songs-migrated';
const BACKUP_STORAGE_KEY = 'chordbook-songs-backup';
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

// Auto-save timer and failure tracking
let autoSaveTimer: NodeJS.Timeout | null = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
let autoSaveDisabled = false;

export function generateSongId(): string {
  return 'song-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateProgressionId(): string {
  return 'prog-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function serializeSong(song: Song): SavedSong {
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

  return {
    ...song,
    progressions: song.progressions.map(p => ({
      ...p,
      createdAt: safeToISOString(p.createdAt),
      updatedAt: safeToISOString(p.updatedAt)
    })),
    createdAt: safeToISOString(song.createdAt),
    updatedAt: safeToISOString(song.updatedAt)
  };
}

function deserializeSong(savedSong: SavedSong): Song {
  return {
    ...savedSong,
    progressions: savedSong.progressions.map(p => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    })),
    bpm: savedSong.bpm || 120, // Default to 120 BPM for existing songs
    createdAt: new Date(savedSong.createdAt),
    updatedAt: new Date(savedSong.updatedAt)
  };
}

export function loadSongs(): Song[] {
  try {
    const saved = localStorage.getItem(SONGS_STORAGE_KEY);
    
    if (saved) {
      const parsedData = JSON.parse(saved);
      
      // Check if it's the new consolidated format
      if (parsedData.version === '2.0' && parsedData.songs) {
        const deserializedSongs = parsedData.songs.map(deserializeSong);
        return deserializedSongs;
      } 
      // Legacy format - direct array
      else if (Array.isArray(parsedData)) {
        const deserializedSongs = parsedData.map(deserializeSong);
        return deserializedSongs;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Failed to load songs:', error);
    return [];
  }
}

export function saveSongs(songs: Song[]): void {
  // Check if auto-save is disabled due to previous failures
  if (autoSaveDisabled) {
    console.warn('🚫 Auto-save disabled due to repeated failures. Use reenableAutoSave() to re-enable.');
    return;
  }
  
  // Don't fail if there are no songs to save
  if (songs.length === 0) {
    return;
  }

  try {
    // Create backup before saving
    const currentData = localStorage.getItem(SONGS_STORAGE_KEY);
    if (currentData) {
      try {
        localStorage.setItem(BACKUP_STORAGE_KEY, currentData);
      } catch (backupError) {
        console.warn('🔧 Failed to create backup - storage might be full:', backupError);
        // Continue without backup if storage is full
      }
    }
    
    const serializedSongs = songs.map(serializeSong);
    
    // Create consolidated data structure
    const consolidatedData = {
      version: '2.0',
      saveType: 'localStorage-consolidated',
      savedAt: new Date().toISOString(),
      songCount: serializedSongs.length,
      totalProgressions: serializedSongs.reduce((total: number, song) => total + (song.progressions?.length || 0), 0),
      songs: serializedSongs
    };
    
    try {
      localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(consolidatedData));
      console.log('🔧 Saved to localStorage with consolidated format');
    } catch (storageError) {
      // Handle storage quota errors specifically
      if (storageError instanceof DOMException && storageError.code === 22) {
        console.error('🔧 Storage quota exceeded - attempting cleanup');
        // Clean up old individual song files and other old data
        const keys = Object.keys(localStorage);
        const oldKeys = keys.filter(key => 
          key.startsWith('chordbook-song-') || 
          key.startsWith('chordbook-file-') ||
          key.startsWith('chordbook-old-')
        );
        
        oldKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch {
            // Ignore cleanup errors
          }
        });
        
        // Try saving again after cleanup
        localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(consolidatedData));
      } else {
        throw storageError; // Re-throw non-quota errors
      }
    }
    
    // The data is already saved above, so we're done with the main save operation
    // Clean up old individual song files from localStorage to save space
    const oldSongKeys = Object.keys(localStorage).filter(key => key.startsWith('chordbook-song-'));
    oldSongKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore cleanup errors
      }
    });
    
    // Only save to files if we haven't had too many failures AND we're in Electron environment
    const isElectronEnv = typeof window !== 'undefined' && window.electronAPI;
    if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES && isElectronEnv) {
      // Save to individual JSON files (async, don't block)
      saveSongsToFiles(songs).catch(error => {
        // Only increment if not already at max (prevent unbounded growth)
        if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
          consecutiveFailures++;
          console.warn(`Failed to save songs to files (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);
          
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error('🚫 Disabling file saves due to repeated failures');
            autoSaveDisabled = true;
          }
        } else {
          console.warn('File save failed but already at max failure count');
        }
      });
    } else if (!isElectronEnv) {
      console.log('🌐 Browser environment detected - skipping file save (localStorage only)');
    } else {
      console.log('🚫 Skipping file save due to previous failures');
    }
    
    // Reset failure counter on successful localStorage save
    consecutiveFailures = 0;
    console.log(`🔧 Successfully saved ${songs.length} songs`);
  } catch (error) {
    // Only increment if not already at max (prevent unbounded growth)
    if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      consecutiveFailures++;
      console.error(`🔧 Critical error saving songs (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);
      
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error('🚫 Disabling auto-save due to repeated failures');
        autoSaveDisabled = true;
      }
    } else {
      console.error('🔧 Critical error saving songs (already at max failures):', error);
    }
    
    // Try to recover from backup if available
    try {
      const backup = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (backup) {
        localStorage.setItem(SONGS_STORAGE_KEY, backup);
        console.log('🔧 Restored from backup after save failure');
      }
    } catch (backupError) {
      console.error('🔧 Failed to restore from backup:', backupError);
    }
  }
}

// Enhanced auto-save function with debouncing
export function scheduleAutoSave(songs: Song[], callback?: () => void): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  autoSaveTimer = setTimeout(() => {
    saveSongs(songs);
    callback?.();
  }, AUTO_SAVE_INTERVAL);
}

// Immediate save for critical operations
export function forceSave(songs: Song[]): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  saveSongs(songs);
}

// Re-enable auto-save after failures
export function reenableAutoSave(): void {
  console.log('🔄 Re-enabling auto-save and resetting failure counters');
  autoSaveDisabled = false;
  consecutiveFailures = 0;
  
  // Clear any pending auto-save timer to start fresh
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// Get auto-save status
export function getAutoSaveStatus(): { disabled: boolean; failures: number; maxFailures: number } {
  return {
    disabled: autoSaveDisabled,
    failures: consecutiveFailures,
    maxFailures: MAX_CONSECUTIVE_FAILURES
  };
}

export function createNewSong(name: string = 'New Song'): Song {
  const now = new Date();
  return {
    id: generateSongId(),
    name,
    progressions: [],
    tuning: DEFAULT_TUNING,
    capoSettings: { fret: 0, enabled: false },
    bpm: 120,
    createdAt: now,
    updatedAt: now
  };
}

export function addProgressionToSong(song: Song, progression: NamedProgression): Song {
  const now = new Date();
  return {
    ...song,
    progressions: [...song.progressions, progression],
    updatedAt: now
  };
}

export function updateProgressionInSong(song: Song, progressionId: string, updatedProgression: Partial<NamedProgression>): Song {
  const now = new Date();
  return {
    ...song,
    progressions: song.progressions.map(p => 
      p.id === progressionId 
        ? { ...p, ...updatedProgression, updatedAt: now }
        : p
    ),
    updatedAt: now
  };
}

export function removeProgressionFromSong(song: Song, progressionId: string): Song {
  const now = new Date();
  return {
    ...song,
    progressions: song.progressions.filter(p => p.id !== progressionId),
    updatedAt: now
  };
}

export function reorderProgressionsInSong(song: Song, oldIndex: number, newIndex: number): Song {
  const now = new Date();
  const newProgressions = [...song.progressions];
  const [reorderedItem] = newProgressions.splice(oldIndex, 1);
  newProgressions.splice(newIndex, 0, reorderedItem);
  
  return {
    ...song,
    progressions: newProgressions,
    updatedAt: now
  };
}

export function updateSongTuning(song: Song, tuning: Tuning): Song {
  const now = new Date();
  return {
    ...song,
    tuning,
    updatedAt: now
  };
}

export function updateSongCapoSettings(song: Song, capoSettings: CapoSettings): Song {
  const now = new Date();
  return {
    ...song,
    capoSettings,
    updatedAt: now
  };
}

export function updateSongBpm(song: Song, bpm: number): Song {
  const now = new Date();
  return {
    ...song,
    bpm,
    updatedAt: now
  };
}

export function saveCurrentSong(songId: string | null): void {
  if (songId) {
    localStorage.setItem(CURRENT_SONG_KEY, songId);
    // Update last opened timestamp for the song
    const lastOpenedKey = `chordbook-song-last-opened-${songId}`;
    localStorage.setItem(lastOpenedKey, new Date().toISOString());
  } else {
    localStorage.removeItem(CURRENT_SONG_KEY);
  }
}

export function loadCurrentSong(): string | null {
  return localStorage.getItem(CURRENT_SONG_KEY);
}

// Get songs sorted by last opened (most recent first)
export function getSongsByLastOpened(songs: Song[]): Song[] {
  return songs.sort((a, b) => {
    const aLastOpened = localStorage.getItem(`chordbook-song-last-opened-${a.id}`);
    const bLastOpened = localStorage.getItem(`chordbook-song-last-opened-${b.id}`);
    
    // If neither has been opened, sort by creation date (newest first)
    if (!aLastOpened && !bLastOpened) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    
    // If only one has been opened, prioritize the opened one
    if (!aLastOpened) return 1;
    if (!bLastOpened) return -1;
    
    // Both have been opened, sort by last opened timestamp (newest first)
    return new Date(bLastOpened).getTime() - new Date(aLastOpened).getTime();
  });
}

// Get the N most recently opened songs
export function getRecentlyOpenedSongs(songs: Song[], limit: number = 4): Song[] {
  const sortedSongs = getSongsByLastOpened(songs);
  return sortedSongs.slice(0, limit);
}

// Migration function to convert old progressions to songs
export function migrateProgressionsToSongs(): void {
  try {
    // Check if migration already done
    if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
      return;
    }

    const oldProgressionsStr = localStorage.getItem('chordbook-progressions');
    if (!oldProgressionsStr) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }

    const oldProgressions: Progression[] = JSON.parse(oldProgressionsStr);
    if (oldProgressions.length === 0) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }

    // Create a default song for migrated progressions
    const migrationSong = createNewSong('Imported Chord Progressions');
    
    // Convert progressions to named progressions
    migrationSong.progressions = oldProgressions.map(prog => ({
      id: prog.id,
      name: prog.name,
      chords: prog.chords,
      createdAt: new Date(prog.createdAt),
      updatedAt: new Date(prog.updatedAt)
    }));

    // Save the migration song alongside existing songs
    const existingSongs = loadSongs();
    saveSongs([...existingSongs, migrationSong]);

    // Clear old progression data to prevent future confusion
    localStorage.removeItem('chordbook-progressions');
    localStorage.removeItem('chordbook-current-progression');

    // Mark migration as complete
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    
    console.log(`Migrated ${oldProgressions.length} progressions to song: ${migrationSong.name}`);
  } catch (error) {
    console.error('Error during progression migration:', error);
  }
}

// Helper function to get the effective BPM for a progression
export function getEffectiveBpm(progression: NamedProgression, song: Song): number {
  return progression.bpm || song.bpm || 120;
}

// Helper function to update progression BPM
export function updateProgressionBpm(song: Song, progressionId: string, bpm: number): Song {
  const updatedProgressions = song.progressions.map(p => 
    p.id === progressionId 
      ? { ...p, bpm, updatedAt: new Date() }
      : p
  );
  
  return {
    ...song,
    progressions: updatedProgressions,
    updatedAt: new Date()
  };
}

// Data recovery functions
export function recoverSongsFromIndividualFiles(): Song[] {
  const recoveredSongs: Song[] = [];
  
  try {
    // Scan localStorage for individual song files
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chordbook-song-')) {
        try {
          const songData = localStorage.getItem(key);
          if (songData) {
            const savedSong: SavedSong = JSON.parse(songData);
            recoveredSongs.push(deserializeSong(savedSong));
          }
        } catch (error) {
          console.warn(`Failed to recover song from ${key}:`, error);
        }
      }
    }
    
    console.log(`Recovered ${recoveredSongs.length} songs from individual files`);
  } catch (error) {
    console.error('Error during song recovery:', error);
  }
  
  return recoveredSongs;
}

export function restoreFromBackup(): Song[] {
  try {
    const backup = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (backup) {
      const savedSongs: SavedSong[] = JSON.parse(backup);
      console.log('Restored songs from backup');
      return savedSongs.map(deserializeSong);
    }
  } catch (error) {
    console.error('Error restoring from backup:', error);
  }
  return [];
}

// Enhanced load with recovery capabilities
export function loadSongsWithRecovery(): Song[] {
  console.log('🔧 loadSongsWithRecovery called');
  try {
    // Try normal load first
    console.log('🔧 Attempting normal load...');
    const songs = loadSongs();
    console.log('🔧 Normal load returned:', songs.length, 'songs');
    if (songs.length > 0) {
      return songs;
    }
    
    // Try individual file recovery
    console.log('🔧 Attempting individual file recovery...');
    const recoveredSongs = recoverSongsFromIndividualFiles();
    console.log('🔧 Individual file recovery returned:', recoveredSongs.length, 'songs');
    if (recoveredSongs.length > 0) {
      console.log('🔧 Recovered songs from individual files, saving to main storage');
      saveSongs(recoveredSongs);
      return recoveredSongs;
    }
    
    // Try backup recovery
    console.log('🔧 Attempting backup recovery...');
    const backupSongs = restoreFromBackup();
    console.log('🔧 Backup recovery returned:', backupSongs.length, 'songs');
    if (backupSongs.length > 0) {
      console.log('🔧 Recovered songs from backup, saving to main storage');
      saveSongs(backupSongs);
      return backupSongs;
    }
    
  } catch (error) {
    console.error('🔧 Error during song loading with recovery:', error);
  }
  
  console.log('🔧 No songs found or recovered, returning empty array');
  return [];
}

// Clean up old individual song files (call periodically)
export function cleanupOldSongFiles(currentSongs: Song[]): void {
  try {
    const currentSongIds = new Set(currentSongs.map(s => s.id));
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chordbook-song-')) {
        const songId = key.replace('chordbook-song-', '');
        if (!currentSongIds.has(songId)) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} orphaned song files`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}
