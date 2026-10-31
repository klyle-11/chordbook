import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ db: {} }));

const { toCapoRelativeNotes } = await import('./leadStorage');
const { getTuningById } = await import('./music/tunings');

const std = getTuningById('standard');
// stringIndex 5 = low E, 0 = high E

describe('toCapoRelativeNotes', () => {
  it('leaves notes alone without a capo', () => {
    const notes = [{ note: 'G', stringIndex: 5, fret: 3 }];
    expect(toCapoRelativeNotes(notes, std, 0)).toBe(notes);
  });

  it('shifts notes saved at absolute frets', () => {
    // G at absolute fret 3 on low E, capo 2 → relative fret 1
    expect(toCapoRelativeNotes([{ note: 'G', stringIndex: 5, fret: 3 }], std, 2))
      .toEqual([{ note: 'G', stringIndex: 5, fret: 1 }]);
  });

  it('keeps notes that are already capo-relative (Guitar Pro imports)', () => {
    // capo 2: relative fret 1 on low E sounds G
    const notes = [{ note: 'G', stringIndex: 5, fret: 1 }];
    expect(toCapoRelativeNotes(notes, std, 2)).toEqual(notes);
  });

  it('matches enharmonic spellings', () => {
    // Bb at absolute fret 6 on low E, capo 3 → relative 3
    expect(toCapoRelativeNotes([{ note: 'Bb', stringIndex: 5, fret: 6 }], std, 3)[0].fret).toBe(3);
  });

  it('keeps ambiguous notes (capo 12 reads the same both ways)', () => {
    const notes = [{ note: 'E', stringIndex: 5, fret: 12 }];
    expect(toCapoRelativeNotes(notes, std, 12)).toEqual(notes);
  });

  it('never produces a negative fret', () => {
    // absolute fret 1 is behind a capo on 2; leave it rather than go to -1
    const notes = [{ note: 'F', stringIndex: 5, fret: 1 }];
    expect(toCapoRelativeNotes(notes, std, 2)).toEqual(notes);
  });
});
