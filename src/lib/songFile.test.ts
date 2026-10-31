import { describe, expect, it } from 'vitest';
import type { Song } from '../types/song';
import { embedSongFile, extractSongFile, parseSongFile, serializeSongFile, SONG_FILE_VERSION, type SongFile } from './songFile';

const at = new Date('2026-03-01T10:00:00.000Z');

const song: Song = {
  id: 'song-1',
  name: 'Blue </script><b>Bossa',
  bpm: 132,
  tuning: { id: 'standard', name: 'Standard', strings: [], displayStrings: [] },
  capoSettings: { fret: 2, enabled: true },
  progressions: [{
    id: 'prog-1', name: 'A', createdAt: at, updatedAt: at,
    chords: [{ name: 'Cm7', notes: ['C', 'Eb', 'G', 'Bb'], voicing: { frets: [null, 3, 1, 3, 4, 3], tuningId: 'standard' }, beats: 8 }],
  }],
  pairings: [{ id: 'pair-1', name: 'AB', progressionIds: ['prog-1', 'prog-2'], createdAt: at, updatedAt: at }],
  leadIds: ['lead-1'],
  links: [
    { id: 'l1', url: 'https://example.com/tab', label: 'Tab' },
    { id: 'l2', url: 'javascript:alert(1)' },
  ],
  createdAt: at,
  updatedAt: at,
  lastOpened: at,
};

const file: SongFile = {
  format: 'chordbook-song',
  version: SONG_FILE_VERSION,
  exportedAt: at,
  themeId: 'sky',
  song,
  leads: [{ id: 'lead-1', name: 'Head', tuningId: 'standard', notes: [{ note: 'G', stringIndex: 0, fret: 3 }], createdAt: at, updatedAt: at }],
  customChords: [{ id: 'c1', name: '[C, G]', notes: ['C', 'G'], createdAt: at }],
  savedVoicings: [{ id: 'v1', name: 'Cm7 1', tuningId: 'standard', frets: [null, 3, 1, 3, 4, 3], notes: ['C', 'Eb', 'G', 'Bb'], createdAt: at }],
};

const shell = '<html><body><div id="root"></div><script type="application/json" id="chordbook-song"></script></body></html>';

describe('song file', () => {
  it('round-trips a song through an HTML file, dates included', () => {
    const restored = extractSongFile(embedSongFile(shell, file));
    expect(restored).toEqual({ ...file, song: { ...song, links: [song.links![0]] } });
    expect(restored.song.progressions[0].createdAt).toBeInstanceOf(Date);
    expect(restored.leads[0].updatedAt).toBeInstanceOf(Date);
  });

  it('cannot break out of its <script> element', () => {
    expect(serializeSongFile(file)).not.toContain('<');
    const html = embedSongFile(shell, file);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });

  it('drops links that are not http(s)', () => {
    expect(parseSongFile(serializeSongFile(file)).song.links).toEqual([song.links![0]]);
  });

  it('rejects files that are not a Chordbook song', () => {
    expect(() => extractSongFile('<html><body>hello</body></html>')).toThrow('Not a Chordbook song file');
    expect(() => extractSongFile(shell)).toThrow();
    expect(() => parseSongFile(JSON.stringify({ songs: [], version: '3.1' }))).toThrow('Not a Chordbook song file');
    expect(() => embedSongFile('<html></html>', file)).toThrow('no song slot');
  });

  it('rejects files from a newer format version', () => {
    expect(() => parseSongFile(JSON.stringify({ ...file, version: SONG_FILE_VERSION + 1 }))).toThrow('newer version');
  });
});
