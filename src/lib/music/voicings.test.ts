import { describe, expect, it } from 'vitest';
import { Chord } from '@tonaljs/tonal';
import { getDefaultVoicing } from './voicings';
import { TUNINGS, applyCapo, getTuningById } from './tunings';
import { pitchClass } from './notes';

/** Chart notation (low → high, 'x' muted, (n) for two-digit frets) like chord books use. */
function chart(frets: (number | null)[] | null): string {
  if (!frets) return 'none';
  return [...frets].reverse().map(f => (f === null ? 'x' : f > 9 ? `(${f})` : String(f))).join('');
}

const std = getTuningById('standard');

describe('getDefaultVoicing — standard tuning shapes people actually play', () => {
  it.each([
    ['C', 'x32010'], ['G', '320003'], ['D', 'xx0232'], ['A', 'x02220'], ['E', '022100'],
    ['Am', 'x02210'], ['Em', '022000'], ['Dm', 'xx0231'],
    ['F', '133211'], ['F#', '244322'], ['Bb', 'x13331'], ['B', 'x24442'],
    ['Bm', 'x24432'], ['Cm', 'x35543'], ['G#m', '466444'],
    ['B7', 'x21202'], ['Dm7', 'xx0211'], ['Cmaj7', 'x32000'], ['Fmaj7', 'xx3210'],
    ['Cadd9', 'x32030'], ['Bdim', 'x2343x'], ['Asus4', 'x02230'], ['E5', '022xxx'],
  ])('%s → %s', (name, expected) => {
    expect(chart(getDefaultVoicing(name, std))).toBe(expected);
  });
});

describe('getDefaultVoicing — other tunings and capo', () => {
  it('capo 2: E uses the open D shape', () => {
    expect(chart(getDefaultVoicing('E', applyCapo(std, 2)))).toBe('xx0232');
  });

  it('D standard: D uses the open E shape', () => {
    expect(chart(getDefaultVoicing('D', getTuningById('d-standard')))).toBe('022100');
  });

  it('half-step down: Eb uses the open E shape', () => {
    expect(chart(getDefaultVoicing('Eb', getTuningById('half-step-down')))).toBe('022100');
  });

  it('drop D: D lets the low strings ring, F adds 2 on the dropped string', () => {
    const dropD = getTuningById('drop-d');
    expect(chart(getDefaultVoicing('D', dropD))).toBe('000232');
    expect(chart(getDefaultVoicing('F', dropD))).toBe('333211');
  });

  it('bass: root–5th–octave on the lowest strings that fit', () => {
    expect(chart(getDefaultVoicing('G', getTuningById('bass-standard')))).toBe('355x');
    expect(chart(getDefaultVoicing('C', getTuningById('bass-5-string')))).toBe('133xx');
  });

  it('returns null for names tonal cannot parse', () => {
    expect(getDefaultVoicing('[C, E, G]', std)).toBeNull();
    expect(getDefaultVoicing('nonsense', std)).toBeNull();
  });
});

describe('getDefaultVoicing — every root × quality × tuning (+ capo)', () => {
  const roots = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
  const qualities = ['', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', '6', 'm6', 'add9', '9', '7sus4', 'dim', 'm7b5', 'dim7', 'aug', '5'];
  const tunings = [...TUNINGS, ...[1, 2, 3, 5, 7].map(c => applyCapo(std, c)), applyCapo(getTuningById('drop-d'), 2)];

  it.each(tunings.map(t => [t.name, t] as const))('%s', (_name, tuning) => {
    for (const root of roots) {
      for (const q of qualities) {
        const name = root + q;
        const frets = getDefaultVoicing(name, tuning);
        expect(frets, name).not.toBeNull();
        expect(frets!.length, name).toBe(tuning.strings.length);

        const chordPcs = new Set(Chord.get(name).notes.map(pitchClass));
        const rootPc = pitchClass(root);
        const heard = frets!
          .map((f, i) => (f === null ? null : (pitchClass(tuning.displayStrings[i]) + f) % 12))
          .filter((pc): pc is number => pc !== null);

        expect(heard.every(pc => chordPcs.has(pc)), `${name}: only chord tones`).toBe(true);
        expect(heard.includes(rootPc), `${name}: has root`).toBe(true);

        // Playable in one hand position
        const fretted = frets!.filter((f): f is number => f !== null && f > 0);
        if (fretted.length > 0) {
          expect(Math.max(...fretted) - Math.min(...fretted), `${name}: span`).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});
