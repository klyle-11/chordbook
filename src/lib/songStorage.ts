import type { Song } from '../types/song';
import { db } from './db';

const CURRENT_SONG_KEY = 'currentSongId';

export function generateSongId(): string {
  return 'song-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateProgressionId(): string {
  return 'prog-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generatePairingId(): string {
  return 'pair-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
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

// --- Migration: localStorage → IndexedDB ---

const MIGRATION_DONE_KEY = 'chordbook-db-migrated';

export async function migrateLocalStorageToDB(): Promise<boolean> {
  try {
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

    const currentId = localStorage.getItem('chordbook-current-song');
    if (currentId) {
      await db.appState.put({ key: CURRENT_SONG_KEY, value: currentId });
    }

    await db.appState.put({ key: MIGRATION_DONE_KEY, value: 'true' });
    return true;
  } catch (error) {
    console.error('Migration from localStorage failed:', error);
    return false;
  }
}

// --- Song update helpers ---

export function updateProgressionBpm(song: Song, progressionId: string, bpm: number): Song {
  return {
    ...song,
    progressions: song.progressions.map(p =>
      p.id === progressionId
        ? { ...p, bpm, updatedAt: new Date() }
        : p
    ),
    updatedAt: new Date()
  };
}
