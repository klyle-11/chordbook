import type { Song } from '../types/song';
import type { Lead } from '../types/lead';
import type { SavedVoicing } from '../types/chord';
import type { CustomChord } from './db';

/**
 * One song and everything it needs, as carried inside an exported HTML file.
 * Pure (no DB access): the exported viewer reads it, the app writes and re-imports it.
 */
export interface SongFile {
  format: 'chordbook-song';
  version: number;
  exportedAt: Date;
  themeId?: string;
  song: Song;
  leads: Lead[];
  customChords: CustomChord[];
  savedVoicings: SavedVoicing[];
}

export const SONG_FILE_VERSION = 1;

/** id of the <script type="application/json"> element holding the song in an exported file */
export const SONG_FILE_ELEMENT_ID = 'chordbook-song';

const SLOT_OPEN = `<script type="application/json" id="${SONG_FILE_ELEMENT_ID}">`;
const SLOT_CLOSE = '</script>';

/** JSON that is safe inside a <script> element: no "<" (so no "</script>") and no raw line separators. */
export function serializeSongFile(file: SongFile): string {
  return JSON.stringify(file)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

type Json = Record<string, unknown>;
const toDate = (value: unknown) => new Date(value as string);
const list = (value: unknown): Json[] => (Array.isArray(value) ? value : []);

/** Parse and validate a serialized song file, turning date strings back into Dates. */
export function parseSongFile(json: string): SongFile {
  const data = JSON.parse(json) as Json;
  const song = data?.song as Json | undefined;
  if (data?.format !== 'chordbook-song' || !song || typeof song.id !== 'string' || typeof song.name !== 'string' || !Array.isArray(song.progressions)) {
    throw new Error('Not a Chordbook song file');
  }
  if (typeof data.version !== 'number' || data.version > SONG_FILE_VERSION) {
    throw new Error('This song was exported by a newer version of Chordbook');
  }

  return {
    format: 'chordbook-song',
    version: data.version,
    exportedAt: toDate(data.exportedAt),
    themeId: typeof data.themeId === 'string' ? data.themeId : undefined,
    song: {
      ...song,
      progressions: list(song.progressions).map(p => ({
        ...p,
        chords: list(p.chords),
        createdAt: toDate(p.createdAt),
        updatedAt: toDate(p.updatedAt),
      })),
      pairings: list(song.pairings).map(p => ({
        ...p,
        createdAt: toDate(p.createdAt),
        updatedAt: toDate(p.updatedAt),
      })),
      // The file may come from anyone: links are rendered as <a href>, so keep http(s) only
      links: list(song.links).filter(link => isHttpUrl(link.url)),
      createdAt: toDate(song.createdAt),
      updatedAt: toDate(song.updatedAt),
      lastOpened: song.lastOpened ? toDate(song.lastOpened) : undefined,
    } as unknown as Song,
    leads: list(data.leads).map(l => ({
      ...l,
      createdAt: toDate(l.createdAt),
      updatedAt: toDate(l.updatedAt),
    })) as unknown as Lead[],
    customChords: list(data.customChords).map(c => ({ ...c, createdAt: toDate(c.createdAt) })) as unknown as CustomChord[],
    savedVoicings: list(data.savedVoicings).map(v => ({ ...v, createdAt: toDate(v.createdAt) })) as unknown as SavedVoicing[],
  };
}

/** Put a song into the viewer shell (the built single-file viewer page). */
export function embedSongFile(shell: string, file: SongFile): string {
  const slot = SLOT_OPEN + SLOT_CLOSE;
  const at = shell.lastIndexOf(slot);
  if (at === -1) throw new Error('Viewer shell has no song slot');
  return shell.slice(0, at) + SLOT_OPEN + serializeSongFile(file) + SLOT_CLOSE + shell.slice(at + slot.length);
}

/** Read the song back out of an exported HTML file. */
export function extractSongFile(html: string): SongFile {
  const start = html.lastIndexOf(SLOT_OPEN);
  const end = start === -1 ? -1 : html.indexOf(SLOT_CLOSE, start);
  if (end === -1) throw new Error('Not a Chordbook song file');
  return parseSongFile(html.slice(start + SLOT_OPEN.length, end));
}
