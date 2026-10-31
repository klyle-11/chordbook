import { describe, expect, it } from 'vitest';
import {
  pitchClass, normalizeNote, sameNote, pitchClassKey,
  getNoteAtFret, getFretsForNoteOnString, getNotesFromVoicing,
} from './notes';
import { getTuningById } from './tunings';

describe('pitchClass', () => {
  it.each([
    ['C', 0], ['C#', 1], ['Db', 1], ['D♭', 1], ['C♯', 1],
    ['E#', 5], ['Fb', 4], ['B#', 0], ['Cb', 11],
    ['F##', 7], ['Fx', 7], ['Bbb', 9], ['D##', 4],
    ['c', 0], ['eb', 3], ['G#4', 8],
  ])('%s → %i', (note, pc) => {
    expect(pitchClass(note)).toBe(pc);
  });

  it('returns -1 for garbage', () => {
    expect(pitchClass('')).toBe(-1);
    expect(pitchClass('H')).toBe(-1);
    expect(pitchClass('?')).toBe(-1);
  });
});

describe('normalizeNote / sameNote / pitchClassKey', () => {
  it('normalizes any spelling to sharps', () => {
    expect(normalizeNote('Eb')).toBe('D#');
    expect(normalizeNote('B♭')).toBe('A#');
    expect(normalizeNote('F##')).toBe('G');
    expect(normalizeNote('E#')).toBe('F');
  });

  it('compares enharmonically', () => {
    expect(sameNote('Db', 'C#')).toBe(true);
    expect(sameNote('E#', 'F')).toBe(true);
    expect(sameNote('E', 'F')).toBe(false);
    expect(sameNote('?', '?')).toBe(false);
  });

  it('builds an order- and spelling-independent key', () => {
    expect(pitchClassKey(['G', 'E', 'C', 'C'])).toBe(pitchClassKey(['C', 'E', 'G']));
    expect(pitchClassKey(['D#', 'F##', 'A#'])).toBe(pitchClassKey(['Eb', 'G', 'Bb']));
    expect(pitchClassKey([])).toBe('');
  });
});

describe('fret ↔ note', () => {
  it('names the note at a fret', () => {
    expect(getNoteAtFret('E', 3)).toBe('G');
    expect(getNoteAtFret('A', 12)).toBe('A');
    expect(getNoteAtFret('D#', 1)).toBe('E');
  });

  it('finds every fret for a note up to maxFret', () => {
    expect(getFretsForNoteOnString('E', 'G')).toEqual([3, 15]);
    expect(getFretsForNoteOnString('E', 'E')).toEqual([0, 12, 24]);
    expect(getFretsForNoteOnString('E', 'G', 12)).toEqual([3]);
    // spellings tonal produces for D# major / A#m
    expect(getFretsForNoteOnString('B', 'F##')).toEqual([8, 20]);
    expect(getFretsForNoteOnString('B', 'E#', 12)).toEqual([6]);
  });

  it('derives the notes of a voicing (index 0 = high string, null = muted)', () => {
    const std = getTuningById('standard');
    // C major x32010 written low→high
    expect(getNotesFromVoicing(std, [0, 1, 0, 2, 3, null])).toEqual(['E', 'C', 'G', 'E', 'C']);
  });
});
