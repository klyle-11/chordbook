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

/**
 * Last persisted version of each song, by id. React state is updated immutably, so a
 * song whose object identity changed is exactly a song that was edited — saveSongs
 * writes only those (plus deletions) instead of rewriting the whole table.
 */
let persisted = new Map<string, Song>();

function rememberPersisted(songs: Song[]): void {
  persisted = new Map(songs.map(song => [song.id, song]));
}

export async function loadSongsAsync(): Promise<Song[]> {
  try {
    const songs = await db.songs.toArray();
    rememberPersisted(songs);
    return songs;
  } catch (error) {
    console.error('Error loading songs from DB:', error);
    return [];
  }
}

/** Persist the changed / removed songs relative to the last save. */
export async function saveSongsAsync(songs: Song[]): Promise<void> {
  const changed = songs.filter(song => persisted.get(song.id) !== song);
  const nextIds = new Set(songs.map(song => song.id));
  const removed = [...persisted.keys()].filter(id => !nextIds.has(id));
  if (changed.length === 0 && removed.length === 0) return;

  // Update the snapshot before the async write so back-to-back saves don't re-send the same songs
  rememberPersisted(songs);
  try {
    await db.transaction('rw', db.songs, async () => {
      if (changed.length > 0) await db.songs.bulkPut(changed);
      if (removed.length > 0) await db.songs.bulkDelete(removed);
    });
  } catch (error) {
    console.error('Error saving songs to DB:', error);
    // Forget the snapshot so the next save retries everything that may not have landed
    for (const song of changed) persisted.delete(song.id);
  }
}

/** Replace every stored song (backup restore). */
export async function replaceAllSongsAsync(songs: Song[]): Promise<void> {
  await db.transaction('rw', db.songs, async () => {
    await db.songs.clear();
    await db.songs.bulkPut(songs);
  });
  rememberPersisted(songs);
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
