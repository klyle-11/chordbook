import { describe, expect, it } from 'vitest';
import { TUNINGS, applyCapo, getCapoFret, getSoundingTuning, getTuningById, isFretAvailable } from './tunings';
import { getNoteAtFret, pitchClass } from './notes';

const midi = (s: { note: string; octave: number }) => 12 * (s.octave + 1) + pitchClass(s.note);

describe('capo', () => {
  it('reads the capo fret only when enabled', () => {
    expect(getCapoFret({ fret: 3, enabled: true })).toBe(3);
    expect(getCapoFret({ fret: 3, enabled: false })).toBe(0);
    expect(getCapoFret(undefined)).toBe(0);
  });

  it('returns the same tuning object with no capo', () => {
    const std = getTuningById('standard');
    expect(getSoundingTuning(std, { fret: 0, enabled: false })).toBe(std);
  });

  it('keeps the tuning id so voicings still match', () => {
    expect(applyCapo(getTuningById('drop-d'), 2).id).toBe('drop-d');
  });

  it('carries octaves across B → C', () => {
    const capo12 = applyCapo(getTuningById('standard'), 12);
    expect(capo12.strings[0]).toEqual({ note: 'E', octave: 5 });
  });

  // Round trip: capo-relative fret f on the sounding tuning is the same pitch as
  // absolute fret f + capo on the raw tuning — for every tuning, capo and string.
  it.each(TUNINGS.map(t => [t.id]))('%s: capo-relative frets sound like absolute fret + capo', (id) => {
    const raw = getTuningById(id);
    for (let capo = 0; capo <= 12; capo++) {
      const sounding = getSoundingTuning(raw, { fret: capo, enabled: capo > 0 });
      raw.strings.forEach((s, i) => {
        expect(midi(sounding.strings[i])).toBe(midi(s) + capo);
        for (let fret = 0; fret + capo <= 24; fret++) {
          expect(getNoteAtFret(sounding.displayStrings[i], fret))
            .toBe(getNoteAtFret(raw.displayStrings[i], fret + capo));
        }
      });
    }
  });

  it('blocks frets behind the capo (absolute frame)', () => {
    expect(isFretAvailable(1, 2)).toBe(false);
    expect(isFretAvailable(2, 2)).toBe(true);
    expect(isFretAvailable(0, 0)).toBe(true);
  });
});
