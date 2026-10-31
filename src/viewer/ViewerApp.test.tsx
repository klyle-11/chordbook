import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { SongFile } from '../lib/songFile';
import { TUNINGS } from '../lib/music/tunings';

// Same swaps as vite.viewer.config.ts: the viewer has no database and its own synth
vi.mock('../lib/db', () => import('./db'));
vi.mock('../lib/audioPlayer', () => import('./audioPlayer'));

const { default: ViewerApp } = await import('./ViewerApp');

const at = new Date('2026-03-01T10:00:00.000Z');
const file: SongFile = {
  format: 'chordbook-song', version: 1, exportedAt: at,
  song: {
    id: 'song-1', name: 'Autumn Leaves', bpm: 96,
    tuning: TUNINGS[0], capoSettings: { fret: 0, enabled: false },
    progressions: [
      { id: 'prog-a', name: 'A section', createdAt: at, updatedAt: at, chords: [
        { name: 'Am7', notes: ['A', 'C', 'E', 'G'], voicing: { frets: [0, 1, 0, 2, 0, null], tuningId: 'standard' } },
        { name: 'D7', notes: ['D', 'F#', 'A', 'C'] },
      ] },
      { id: 'prog-b', name: 'B section', createdAt: at, updatedAt: at, chords: [{ name: 'Em', notes: ['E', 'G', 'B'] }] },
    ],
    pairings: [{ id: 'pair-1', name: 'Whole form', progressionIds: ['prog-a', 'prog-b'], createdAt: at, updatedAt: at }],
    leadIds: ['lead-1'],
    links: [{ id: 'l1', url: 'https://example.com/tab' }],
    createdAt: at, updatedAt: at,
  },
  leads: [{ id: 'lead-1', name: 'Head', tuningId: 'standard', notes: [{ note: 'E', stringIndex: 0, fret: 0 }], createdAt: at, updatedAt: at }],
  customChords: [],
  savedVoicings: [],
};

describe('exported song viewer', () => {
  // The db stand-in throws on any access, so rendering at all shows the DB is never touched
  const html = renderToString(<ViewerApp file={file} />);

  it('shows the song', () => {
    for (const text of ['Autumn Leaves', 'A section', 'B section', 'Am7', 'Whole form', 'Head', 'Nylon Guitar']) {
      expect(html).toContain(text);
    }
  });

  it('has a resizable fretboard', () => {
    expect(html).toContain('aria-label="Resize fretboard"');
  });

  it('has no editing controls', () => {
    for (const control of ['Add Chord', 'Delete progression', 'Drag to reorder', 'Remove chord', 'Remove pairing', 'Remove from song', '+ Lead', 'Edit tab', '>Pair<']) {
      expect(html).not.toContain(control);
    }
  });
});
