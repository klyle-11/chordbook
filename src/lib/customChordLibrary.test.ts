import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomChord } from './db';

const table = new Map<string, CustomChord>();
vi.mock('./db', () => ({
  db: {
    customChords: {
      toArray: async () => [...table.values()],
      bulkPut: async (rows: CustomChord[]) => { rows.forEach(r => table.set(r.id, r)); },
      put: async (row: CustomChord) => { table.set(row.id, row); },
      delete: async (id: string) => { table.delete(id); },
      clear: async () => table.clear(),
    },
    transaction: async (_m: string, _t: unknown, fn: () => Promise<void>) => fn(),
  },
}));

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
});

const lib = await import('./customChordLibrary');
const { getNotesForChord } = await import('./music/chords');

describe('custom chord library', () => {
  beforeEach(async () => {
    table.clear();
    storage.clear();
    await lib.replaceCustomChords([]);
  });

  it('migrates the old localStorage copy once, then removes it', async () => {
    storage.set('chordbook-custom-chords', JSON.stringify([
      { id: '1', name: '[C, G, D]', notes: ['C', 'G', 'D'], createdAt: '2025-01-01T00:00:00.000Z' },
    ]));
    await lib.loadCustomChords();
    expect(table.get('1')?.createdAt).toBeInstanceOf(Date);
    expect(storage.has('chordbook-custom-chords')).toBe(false);
    expect(getNotesForChord('[C, G, D]')).toEqual(['C', 'G', 'D']);
  });

  it('serves lookups from memory right after adding, and persists', async () => {
    expect(lib.addCustomChord('[A, E, B]', ['A', 'E', 'B'])).toBe(true);
    expect(lib.isCustomChord('[A, E, B]')).toBe(true);
    expect(getNotesForChord('[A, E, B]')).toEqual(['A', 'E', 'B']);
    await Promise.resolve();
    expect([...table.values()].map(c => c.name)).toEqual(['[A, E, B]']);
  });

  it('rejects duplicate note sequences', () => {
    lib.addCustomChord('[A, E, B]', ['A', 'E', 'B']);
    expect(lib.addCustomChord('[a, e, b]', ['a', 'e', 'b'])).toBe(false);
  });

  it('deletes from memory and the table', async () => {
    lib.addCustomChord('[A, E, B]', ['A', 'E', 'B']);
    lib.deleteCustomChord('[A, E, B]');
    await Promise.resolve();
    expect(lib.isCustomChord('[A, E, B]')).toBe(false);
    expect(table.size).toBe(0);
  });
});
