import type { Song, SavedSong, NamedProgression } from '../types/song';
import type { Progression } from '../types/progression';
import { DEFAULT_TUNING, type Tuning, type CapoSettings } from './tunings';

const SONGS_STORAGE_KEY = 'chordbook-songs';
const CURRENT_SONG_KEY = 'chordbook-current-song';
const MIGRATION_FLAG_KEY = 'chordbook-songs-migrated';

export function generateSongId(): string {
  return 'song-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateProgressionId(): string {
  return 'prog-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function serializeSong(song: Song): SavedSong {
  return {
    ...song,
    progressions: song.progressions.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    })),
    createdAt: song.createdAt.toISOString(),
    updatedAt: song.updatedAt.toISOString(),
    lastOpened: song.lastOpened?.toISOString()
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
    createdAt: new Date(savedSong.createdAt),
    updatedAt: new Date(savedSong.updatedAt),
    lastOpened: savedSong.lastOpened ? new Date(savedSong.lastOpened) : undefined
  };
}

export function loadSongs(): Song[] {
  try {
    const saved = localStorage.getItem(SONGS_STORAGE_KEY);
    if (saved) {
      const savedSongs: SavedSong[] = JSON.parse(saved);
      return savedSongs.map(deserializeSong);
    }
  } catch (error) {
    console.error('Error loading songs:', error);
  }
  return [];
}

export function saveSongs(songs: Song[]): void {
  try {
    const serializedSongs = songs.map(serializeSong);
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(serializedSongs));
  } catch (error) {
    console.error('Error saving songs:', error);
  }
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
  } else {
    localStorage.removeItem(CURRENT_SONG_KEY);
  }
}

export function loadCurrentSong(): string | null {
  return localStorage.getItem(CURRENT_SONG_KEY);
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
