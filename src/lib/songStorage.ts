import type { Song, NamedProgression } from '../types/song';
import type { Tuning, CapoSettings } from './tunings';
import { DEFAULT_TUNING } from './tunings';
import { db } from './db';

const CURRENT_SONG_KEY = 'currentSongId';

export function generateSongId(): string {
  return 'song-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateProgressionId(): string {
  return 'prog-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Async DB-backed functions ---

export async function loadSongsAsync(): Promise<Song[]> {
  try {
    return await db.songs.toArray();
  } catch (error) {
    console.error('Error loading songs from DB:', error);
    return [];
  }
}

export async function saveSongsAsync(songs: Song[]): Promise<void> {
  try {
    await db.transaction('rw', db.songs, async () => {
      await db.songs.clear();
      await db.songs.bulkPut(songs);
    });
  } catch (error) {
    console.error('Error saving songs to DB:', error);
  }
}

export async function saveSongAsync(song: Song): Promise<void> {
  try {
    await db.songs.put(song);
  } catch (error) {
    console.error('Error saving song to DB:', error);
  }
}

export async function deleteSongAsync(songId: string): Promise<void> {
  try {
    await db.songs.delete(songId);
  } catch (error) {
    console.error('Error deleting song from DB:', error);
  }
}

export async function saveCurrentSongAsync(songId: string | null): Promise<void> {
  try {
    if (songId) {
      await db.appState.put({ key: CURRENT_SONG_KEY, value: songId });
    } else {
      await db.appState.delete(CURRENT_SONG_KEY);
    }
  } catch (error) {
    console.error('Error saving current song ID:', error);
  }
}

export async function loadCurrentSongAsync(): Promise<string | null> {
  try {
    const entry = await db.appState.get(CURRENT_SONG_KEY);
    return entry?.value ?? null;
  } catch (error) {
    console.error('Error loading current song ID:', error);
    return null;
  }
}

// --- Sync wrappers (fire-and-forget saves for React state handlers) ---

export function saveSongs(songs: Song[]): void {
  saveSongsAsync(songs);
}

export function saveCurrentSong(songId: string | null): void {
  saveCurrentSongAsync(songId);
}

// These now return empty — callers must use async versions for initial load
export function loadSongs(): Song[] {
  console.warn('loadSongs() is synchronous and returns []. Use loadSongsAsync() instead.');
  return [];
}

export function loadCurrentSong(): string | null {
  console.warn('loadCurrentSong() is synchronous and returns null. Use loadCurrentSongAsync() instead.');
  return null;
}

// --- Migration: localStorage → IndexedDB ---

const MIGRATION_DONE_KEY = 'chordbook-db-migrated';

export async function migrateLocalStorageToDB(): Promise<boolean> {
  try {
    // Check if already migrated via appState
    const migrated = await db.appState.get(MIGRATION_DONE_KEY);
    if (migrated) return false;

    const oldData = localStorage.getItem('chordbook-songs');
    if (oldData) {
      const parsed = JSON.parse(oldData);
      const songs: Song[] = parsed.map((s: Record<string, unknown>) => ({
        ...s,
        createdAt: new Date(s.createdAt as string),
        updatedAt: new Date(s.updatedAt as string),
        lastOpened: s.lastOpened ? new Date(s.lastOpened as string) : undefined,
        progressions: (s.progressions as Record<string, unknown>[]).map((p: Record<string, unknown>) => ({
          ...p,
          createdAt: new Date(p.createdAt as string),
          updatedAt: new Date(p.updatedAt as string),
        })),
      }));

      await db.songs.bulkPut(songs);
      console.log(`Migrated ${songs.length} songs from localStorage to IndexedDB`);
    }

    // Migrate current song ID
    const currentId = localStorage.getItem('chordbook-current-song');
    if (currentId) {
      await db.appState.put({ key: CURRENT_SONG_KEY, value: currentId });
    }

    // Mark migration complete
    await db.appState.put({ key: MIGRATION_DONE_KEY, value: 'true' });
    return true;
  } catch (error) {
    console.error('Migration from localStorage failed:', error);
    return false;
  }
}

// --- Helper functions (unchanged) ---

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
  return { ...song, tuning, updatedAt: now };
}

export function updateSongCapoSettings(song: Song, capoSettings: CapoSettings): Song {
  const now = new Date();
  return { ...song, capoSettings, updatedAt: now };
}

export function updateSongBpm(song: Song, bpm: number): Song {
  const now = new Date();
  return { ...song, bpm, updatedAt: now };
}

export function getEffectiveBpm(progression: NamedProgression, song: Song): number {
  return progression.bpm || song.bpm || 120;
}

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
