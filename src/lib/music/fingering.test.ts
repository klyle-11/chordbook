import { describe, expect, it } from 'vitest';
import { calculateChordFingering } from './fingering';
import { getTuningById } from './tunings';

const std = getTuningById('standard');
const frets = (name: string) =>
  calculateChordFingering(name, std)?.positions.map(p => p.fret);

describe('calculateChordFingering', () => {
  it('uses the default voicing (index 0 = high E)', () => {
    expect(frets('C')).toEqual([0, 1, 0, 2, 3, 'x']);
  });

  it('starts open-position shapes at fret 0 and higher shapes at their lowest fret', () => {
    expect(calculateChordFingering('G', std)?.startFret).toBe(0);
    expect(calculateChordFingering('Bm', std)?.startFret).toBe(2);
  });

  it('assigns one finger to a full barre', () => {
    const f = calculateChordFingering('F', std)!;
    const barreFingers = f.positions.filter(p => p.fret === 1).map(p => p.finger);
    expect(new Set(barreFingers)).toEqual(new Set([1]));
  });

  it('returns null for unknown chords', () => {
    expect(calculateChordFingering('nonsense', std)).toBeNull();
  });
});
