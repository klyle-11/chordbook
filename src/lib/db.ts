import Dexie, { type EntityTable } from 'dexie';
import type { Song } from '../types/song';
import type { SavedVoicing } from '../types/chord';
import type { Lead } from '../types/lead';

export interface DbAppState {
  key: string;
  value: string;
}

const db = new Dexie('ChordBookDB') as Dexie & {
  songs: EntityTable<Song, 'id'>;
  appState: EntityTable<DbAppState, 'key'>;
  savedVoicings: EntityTable<SavedVoicing, 'id'>;
  leads: EntityTable<Lead, 'id'>;
};

db.version(1).stores({
  songs: 'id, name, updatedAt, lastOpened',
  appState: 'key',
});

db.version(2).stores({
  songs: 'id, name, updatedAt, lastOpened',
  appState: 'key',
  savedVoicings: 'id, name, tuningId',
});

db.version(3).stores({
  songs: 'id, name, updatedAt, lastOpened',
  appState: 'key',
  savedVoicings: 'id, name, tuningId',
});

db.version(4).stores({
  songs: 'id, name, updatedAt, lastOpened',
  appState: 'key',
  savedVoicings: 'id, name, tuningId',
  leads: 'id, name, tuningId, updatedAt',
});

export { db };
