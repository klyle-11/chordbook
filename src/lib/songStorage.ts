import type { Song, SavedSong, NamedProgression } from '../types/song';
import type { Progression } from '../types/progression';
import { DEFAULT_TUNING, type Tuning, type CapoSettings } from './tunings';
import { saveSongsToFiles } from './fileStorage';

const SONGS_STORAGE_KEY = 'chordbook-songs';
const CURRENT_SONG_KEY = 'chordbook-current-song';
const MIGRATION_FLAG_KEY = 'chordbook-songs-migrated';
const BACKUP_STORAGE_KEY = 'chordbook-songs-backup';
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

// Auto-save timer
let autoSaveTimer: NodeJS.Timeout | null = null;

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
  console.log('🔧 loadSongs called');
  try {
    const saved = localStorage.getItem(SONGS_STORAGE_KEY);
    console.log('🔧 Retrieved from localStorage:', saved ? 'data found' : 'no data');
    if (saved) {
      const savedSongs: SavedSong[] = JSON.parse(saved);
      console.log('🔧 Parsed saved songs:', savedSongs.length, 'songs');
      const deserializedSongs = savedSongs.map(deserializeSong);
      console.log('🔧 Deserialized songs:', deserializedSongs.map(s => s.name));
      return deserializedSongs;
    }
  } catch (error) {
    console.error('🔧 Error loading songs:', error);
  }
  return [];
}

export function saveSongs(songs: Song[]): void {
  console.log('🔧 saveSongs called with:', songs.length, 'songs');
  try {
    // Create backup before saving
    const currentData = localStorage.getItem(SONGS_STORAGE_KEY);
    if (currentData) {
      console.log('🔧 Creating backup of current data');
      localStorage.setItem(BACKUP_STORAGE_KEY, currentData);
    }
    
    const serializedSongs = songs.map(serializeSong);
    console.log('🔧 Serialized songs for storage:', serializedSongs.map(s => s.name));
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(serializedSongs));
    console.log('🔧 Saved to localStorage with key:', SONGS_STORAGE_KEY);
    
    // Save individual song files for better data recovery
    songs.forEach(song => {
      try {
        const songKey = `chordbook-song-${song.id}`;
        localStorage.setItem(songKey, JSON.stringify(serializeSong(song)));
        console.log('🔧 Saved individual song:', song.name, 'with key:', songKey);
      } catch (error) {
        console.warn(`Failed to save individual song ${song.id}:`, error);
      }
    });
    
    // Also save to individual JSON files (async, don't block)
    saveSongsToFiles(songs).catch(error => {
      console.warn('Failed to save songs to files:', error);
    });
    
    console.log(`🔧 Successfully saved ${songs.length} songs`);
  } catch (error) {
    console.error('🔧 Critical error saving songs:', error);
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
