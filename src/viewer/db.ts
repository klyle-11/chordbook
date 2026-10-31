import type { db as realDb } from '../lib/db';

/**
 * Stand-in for lib/db in the exported song viewer (swapped in by vite.viewer.config.ts).
 * An exported file runs off the song embedded in it and must never open IndexedDB:
 * every file opened from disk would share one database. Any access is a bug, so it throws.
 */
export const db = new Proxy({}, {
  get(_target, table) {
    throw new Error(`The exported song viewer has no database (tried to use db.${String(table)})`);
  },
}) as typeof realDb;
