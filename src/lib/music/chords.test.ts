import { describe, expect, it } from 'vitest';
import { findChordByNotes, getNotesForChord, isValidChord, suggestRenameForTab } from './chords';

describe('findChordByNotes', () => {
  it.each([
    [['C', 'E', 'G'], 'C'],
    [['A', 'C', 'E'], 'Am'],
    [['E', 'G', 'C'], 'C'],                   // order doesn't matter
    [['C', 'E', 'G', 'C', 'E'], 'C'],         // doublings don't matter
    [['D#', 'G', 'A#'], 'Eb'],                // sharps from a tab → conventional flat name
    [['G#', 'C', 'D#', 'G'], 'Abmaj7'],
    [['A#', 'D', 'F'], 'Bb'],
    [['F#', 'A#', 'C#'], 'F#'],
    [['C', 'D', 'E', 'G'], 'Cadd9'],
  ])('%j → %s', (notes, name) => {
    expect(findChordByNotes(notes)).toBe(name);
  });

  it('returns null when nothing matches', () => {
    expect(findChordByNotes(['C', 'C#', 'D'])).toBeNull();
    expect(findChordByNotes([])).toBeNull();
  });
});

describe('getNotesForChord / isValidChord', () => {
  it('uses tonal spellings', () => {
    expect(getNotesForChord('Cmaj7')).toEqual(['C', 'E', 'G', 'B']);
    expect(getNotesForChord('D#')).toEqual(['D#', 'F##', 'A#']);
  });

  it('validates names', () => {
    expect(isValidChord('F#m7b5')).toBe(true);
    expect(isValidChord('Hmaj')).toBe(false);
  });
});

describe('suggestRenameForTab', () => {
  it('suggests the chord the tab spells when it adds notes', () => {
    expect(suggestRenameForTab(['C', 'E', 'G'], ['C', 'E', 'G', 'D'])).toEqual({
      outsideNotes: ['D'],
      suggestedName: 'Cadd9',
    });
  });

  it('falls back to a bracket name when no chord matches', () => {
    expect(suggestRenameForTab(['C', 'E', 'G'], ['C', 'C#', 'D'])?.suggestedName).toBe('[C, C#, D]');
  });

  it('is null when the tab only uses chord tones (shell voicings included)', () => {
    expect(suggestRenameForTab(['C', 'E', 'G', 'B'], ['C', 'E', 'B'])).toBeNull();
    expect(suggestRenameForTab(['Eb', 'G', 'Bb'], ['D#', 'G', 'A#'])).toBeNull();
  });

  it('is null with nothing to compare', () => {
    expect(suggestRenameForTab([], ['C'])).toBeNull();
    expect(suggestRenameForTab(['C'], [])).toBeNull();
  });
});
