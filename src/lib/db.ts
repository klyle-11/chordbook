import Dexie, { type EntityTable } from 'dexie';
import type { Song } from '../types/song';

export interface DbAppState {
  key: string;
  value: string;
}

const db = new Dexie('ChordBookDB') as Dexie & {
  songs: EntityTable<Song, 'id'>;
  appState: EntityTable<DbAppState, 'key'>;
};

db.version(1).stores({
  songs: 'id, name, updatedAt, lastOpened',
  appState: 'key',
});

export { db };
