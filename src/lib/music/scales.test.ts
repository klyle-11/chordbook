import { describe, expect, it } from 'vitest';
import { BEBOP_SCALE_LIBRARY, getBebopScale, suggestChordScale } from './scales';
import { CHROMATIC, pitchClass } from './notes';
import type { HarmonicContext } from '../harmonicAnalysis';

const cMajor: HarmonicContext = {
  detectedKey: 'C major',
  keyTonic: 'C',
  keyType: 'major',
  scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  diatonicChords: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
  chordsHarmonicFunction: ['T', 'SD', 'T', 'SD', 'D', 'T', 'D'],
  grades: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
};

describe('bebop scale library', () => {
  it('owns all six supported bebop families', () => {
    expect(BEBOP_SCALE_LIBRARY.map(scale => scale.id)).toEqual([
      'major', 'dominant', 'dorian', 'minor', 'locrian', 'melodic-minor',
    ]);
  });

  it.each([
    ['major', ['C', 'D', 'E', 'F', 'G', 'G#', 'A', 'B']],
    ['dominant', ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'B']],
    ['dorian', ['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb']],
    ['minor', ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb', 'B']],
    ['locrian', ['C', 'Db', 'Eb', 'F', 'Gb', 'G', 'Ab', 'Bb']],
    ['melodic-minor', ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'A', 'B']],
  ] as const)('builds C %s', (id, expected) => {
    expect(getBebopScale('C', id)?.notes).toEqual(expected);
  });

  it('produces eight distinct pitch classes in every key', () => {
    for (const root of CHROMATIC) {
      for (const definition of BEBOP_SCALE_LIBRARY) {
        const scale = getBebopScale(root, definition.id);
        expect(scale?.notes).toHaveLength(8);
        expect(new Set(scale?.notes.map(pitchClass))).toHaveLength(8);
      }
    }
  });
});

describe('contextual chord-scale suggestions', () => {
  it.each([
    ['Cmaj7', ['C', 'E', 'G', 'B'], 'C Major Bebop'],
    ['Dm7', ['D', 'F', 'A', 'C'], 'D Dorian Bebop'],
    ['Em7', ['E', 'G', 'B', 'D'], 'E Phrygian'],
    ['Fmaj7', ['F', 'A', 'C', 'E'], 'F Lydian'],
    ['G7', ['G', 'B', 'D', 'F'], 'G Dominant Bebop'],
    ['Am7', ['A', 'C', 'E', 'G'], 'A Minor Bebop'],
    ['Bm7b5', ['B', 'D', 'F', 'A'], 'B Locrian Bebop'],
  ])('maps %s to %s', (name, notes, expected) => {
    expect(suggestChordScale(name, notes, cMajor)?.name).toBe(expected);
  });

  it('uses the harmony before a slash bass note', () => {
    expect(suggestChordScale('C/E', ['C', 'E', 'G'], cMajor)?.name).toBe('C Major Bebop');
  });

  it('uses strict chord-quality fallbacks without a key context', () => {
    expect(suggestChordScale('C7', ['C', 'E', 'G', 'Bb'])?.name).toBe('C Dominant Bebop');
    expect(suggestChordScale('Cm7', ['C', 'Eb', 'G', 'Bb'])?.name).toBe('C Dorian Bebop');
    expect(suggestChordScale('Cm6', ['C', 'Eb', 'G', 'A'])?.name).toBe('C Melodic Minor Bebop');
    expect(suggestChordScale('Cmaj7', ['C', 'E', 'G', 'B'])?.name).toBe('C Major Bebop');
    expect(suggestChordScale('C', ['C', 'E', 'G'])).toBeNull();
  });

  it.each([
    ['C7b9', ['C', 'E', 'G', 'Bb', 'Db']],
    ['C7alt', ['C', 'E', 'G#', 'Bb', 'D#']],
    ['Cmaj7#11', ['C', 'E', 'G', 'B', 'F#']],
    ['Cdim7', ['C', 'Eb', 'Gb', 'A']],
  ])('does not force an incompatible bebop scale onto %s', (name, notes) => {
    expect(suggestChordScale(name, notes, cMajor)).toBeNull();
  });

  it('returns null for an unparseable chord without a usable root', () => {
    expect(suggestChordScale('mystery', ['C', 'E', 'G'], cMajor)).toBeNull();
  });
});
