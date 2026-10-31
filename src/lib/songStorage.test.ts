import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Song } from '../types/song';

// In-memory stand-in for the Dexie `songs` table
const table = new Map<string, Song>();
const bulkPut = vi.fn(async (songs: Song[]) => { songs.forEach(s => table.set(s.id, s)); });
const bulkDelete = vi.fn(async (ids: string[]) => { ids.forEach(id => table.delete(id)); });

vi.mock('./db', () => ({
  db: {
    songs: {
      toArray: async () => [...table.values()],
      bulkPut: (songs: Song[]) => bulkPut(songs),
      bulkDelete: (ids: string[]) => bulkDelete(ids),
      clear: async () => table.clear(),
    },
    transaction: async (_mode: string, _table: unknown, fn: () => Promise<void>) => fn(),
  },
}));

const { loadSongsAsync, saveSongsAsync, replaceAllSongsAsync } = await import('./songStorage');

const song = (id: string, name = id): Song => ({
  id, name, progressions: [], bpm: 120,
  tuning: { id: 'standard', name: 'Standard', strings: [], displayStrings: [] },
  capoSettings: { fret: 0, enabled: false },
  createdAt: new Date(0), updatedAt: new Date(0),
});

describe('saveSongsAsync writes only what changed', () => {
  let a: Song, b: Song, c: Song;

  beforeEach(async () => {
    table.clear();
    a = song('a'); b = song('b'); c = song('c');
    await replaceAllSongsAsync([a, b, c]);
    await loadSongsAsync();
    bulkPut.mockClear();
    bulkDelete.mockClear();
  });

  it('puts only songs whose object changed', async () => {
    const b2 = { ...b, name: 'renamed' };
    await saveSongsAsync([a, b2, c]);
    expect(bulkPut).toHaveBeenCalledTimes(1);
    expect(bulkPut.mock.calls[0][0]).toEqual([b2]);
    expect(bulkDelete).not.toHaveBeenCalled();
    expect(table.get('b')?.name).toBe('renamed');
  });

  it('deletes removed songs and adds new ones', async () => {
    const d = song('d');
    await saveSongsAsync([a, c, d]);
    expect(bulkPut.mock.calls[0][0]).toEqual([d]);
    expect(bulkDelete.mock.calls[0][0]).toEqual(['b']);
    expect([...table.keys()].sort()).toEqual(['a', 'c', 'd']);
  });

  it('does nothing when nothing changed', async () => {
    await saveSongsAsync([a, b, c]);
    expect(bulkPut).not.toHaveBeenCalled();
    expect(bulkDelete).not.toHaveBeenCalled();
  });

  it('does not re-send a song already saved in a previous call', async () => {
    const a2 = { ...a, name: 'x' };
    await saveSongsAsync([a2, b, c]);
    await saveSongsAsync([a2, b, c]);
    expect(bulkPut).toHaveBeenCalledTimes(1);
  });

  it('retries a song whose write failed', async () => {
    const a2 = { ...a, name: 'x' };
    bulkPut.mockRejectedValueOnce(new Error('disk full'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await saveSongsAsync([a2, b, c]);
    await saveSongsAsync([a2, b, c]);
    spy.mockRestore();
    expect(bulkPut).toHaveBeenCalledTimes(2);
    expect(table.get('a')?.name).toBe('x');
  });
});
