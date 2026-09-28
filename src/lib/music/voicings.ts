import { Chord, Interval } from '@tonaljs/tonal';
import { DEFAULT_TUNING, type Tuning } from './tunings';
import { pitchClass, CHROMATIC } from './notes';

/**
 * Default ("most people play it this way") voicings.
 *
 * Shapes are written like a chord chart: low string → high string, 'x' = muted.
 * Returned frets use the app's order (index 0 = highest string, same as Tuning.strings).
 *
 * 6-string tunings are handled by mapping onto standard tuning: the whole neck shift
 * transposes the chord, and per-string differences (drop D) add frets on that string.
 * Capo works the same way when passed a sounding tuning (see getSoundingTuning).
 */

type Frets = (number | null)[];

// Quality = sorted pitch-class set of the chord relative to its root
const Q = {
  major: '0,4,7', minor: '0,3,7', dom7: '0,4,7,10', maj7: '0,4,7,11', m7: '0,3,7,10',
  sus2: '0,2,7', sus4: '0,5,7', six: '0,4,7,9', m6: '0,3,7,9', add9: '0,2,4,7',
  dom9: '0,2,4,7,10', sus47: '0,5,7,10', dim: '0,3,6', m7b5: '0,3,6,10', dim7: '0,3,6,9',
  aug: '0,4,8', power: '0,7',
} as const;

function chart(s: string): Frets {
  return s.split('').map(c => (c === 'x' ? null : parseInt(c, 10)));
}

// Open-position shapes in standard tuning, keyed by `${root}|${quality}`.
// Only shapes within the first 3 frets — the ones found in every chord book.
const OPEN_SHAPES: Record<string, string> = {
  [`C|${Q.major}`]: 'x32010', [`D|${Q.major}`]: 'xx0232', [`E|${Q.major}`]: '022100',
  [`G|${Q.major}`]: '320003', [`A|${Q.major}`]: 'x02220',
  [`D|${Q.minor}`]: 'xx0231', [`E|${Q.minor}`]: '022000', [`A|${Q.minor}`]: 'x02210',
  [`C|${Q.dom7}`]: 'x32310', [`D|${Q.dom7}`]: 'xx0212', [`E|${Q.dom7}`]: '020100',
  [`G|${Q.dom7}`]: '320001', [`A|${Q.dom7}`]: 'x02020', [`B|${Q.dom7}`]: 'x21202',
  [`C|${Q.maj7}`]: 'x32000', [`D|${Q.maj7}`]: 'xx0222', [`E|${Q.maj7}`]: '021100',
  [`F|${Q.maj7}`]: 'xx3210', [`G|${Q.maj7}`]: '320002', [`A|${Q.maj7}`]: 'x02120',
  [`D|${Q.m7}`]: 'xx0211', [`E|${Q.m7}`]: '020000', [`A|${Q.m7}`]: 'x02010', [`B|${Q.m7}`]: 'x20202',
  [`D|${Q.sus2}`]: 'xx0230', [`A|${Q.sus2}`]: 'x02200',
  [`D|${Q.sus4}`]: 'xx0233', [`E|${Q.sus4}`]: '022200', [`A|${Q.sus4}`]: 'x02230',
  [`C|${Q.six}`]: 'x32210', [`D|${Q.six}`]: 'xx0202', [`E|${Q.six}`]: '022120',
  [`G|${Q.six}`]: '320000', [`A|${Q.six}`]: 'x02222',
  [`D|${Q.m6}`]: 'xx0201', [`E|${Q.m6}`]: '022020', [`A|${Q.m6}`]: 'x02212',
  [`C|${Q.add9}`]: 'x32030',
  [`E|${Q.dom9}`]: '020102',
  [`E|${Q.sus47}`]: '020200', [`A|${Q.sus47}`]: 'x02030', [`D|${Q.sus47}`]: 'xx0213',
  [`E|${Q.power}`]: '022xxx', [`A|${Q.power}`]: 'x022xx', [`D|${Q.power}`]: 'xx023x',
};

// Movable shapes: offsets from the root fret on the root string (low → high).
// E-shape: root on string 6, A-shape: root on string 5, D-shape: root on string 4.
type Offsets = (number | null)[];
const x = null;
const MOVABLE: Record<string, Offsets[]> = {
  [Q.major]: [[0, 2, 2, 1, 0, 0], [x, 0, 2, 2, 2, 0], [x, x, 0, 2, 3, 2]],
  [Q.minor]: [[0, 2, 2, 0, 0, 0], [x, 0, 2, 2, 1, 0], [x, x, 0, 2, 3, 1]],
  [Q.dom7]: [[0, 2, 0, 1, 0, 0], [x, 0, 2, 0, 2, 0], [x, x, 0, 2, 1, 2]],
  [Q.maj7]: [[0, x, 1, 1, 0, x], [x, 0, 2, 1, 2, 0], [x, x, 0, 2, 2, 2]],
  [Q.m7]: [[0, 2, 0, 0, 0, 0], [x, 0, 2, 0, 1, 0], [x, x, 0, 2, 1, 1]],
  [Q.sus2]: [[x, 0, 2, 2, 0, 0], [x, x, 0, 2, 3, 0]],
  [Q.sus4]: [[0, 2, 2, 2, 0, 0], [x, 0, 2, 2, 3, 0], [x, x, 0, 2, 3, 3]],
  [Q.six]: [[x, 0, 2, 2, 2, 2], [0, x, -1, 1, 0, x]],
  [Q.m6]: [[x, 0, 2, -1, 1, 0], [0, x, -1, 0, 0, x]],
  [Q.add9]: [[x, 0, -1, -3, 0, 0], [x, 0, 2, 4, 2, 0]],
  [Q.dom9]: [[x, 0, -1, 0, 0, 0], [0, 2, 0, 1, 0, 2]],
  [Q.sus47]: [[0, 2, 0, 2, 0, 0], [x, 0, 2, 0, 3, 0]],
  [Q.dim]: [[x, 0, 1, 2, 1, x], [0, 1, 2, 0, x, x]],
  [Q.m7b5]: [[x, 0, 1, 0, 1, x], [0, x, 0, 0, -1, x]],
  [Q.dim7]: [[x, x, 0, 1, 0, 1], [x, 0, 1, -1, 1, x]],
  [Q.aug]: [[x, 0, 3, 2, 2, 1], [0, x, 2, 1, 1, x]],
  [Q.power]: [[0, 2, 2, x, x, x], [x, 0, 2, 2, x, x]],
};

function midiOf(s: { note: string; octave: number }): number {
  return 12 * (s.octave + 1) + pitchClass(s.note);
}

const STANDARD_MIDI_LOW_TO_HIGH = [...DEFAULT_TUNING.strings].reverse().map(midiOf);
const STANDARD_PC_LOW_TO_HIGH = [...DEFAULT_TUNING.displayStrings].reverse().map(pitchClass);

interface ChordInfo {
  rootPc: number;
  quality: string;
  pcs: Set<number>;
}

function parseChord(name: string): ChordInfo | null {
  const chord = Chord.get(name);
  if (!chord.tonic || chord.intervals.length === 0) return null;
  const rootPc = pitchClass(chord.tonic);
  if (rootPc === -1) return null;
  const rel = [...new Set(chord.intervals.map(i => ((Interval.semitones(i) ?? 0) % 12 + 12) % 12))].sort((a, b) => a - b);
  return {
    rootPc,
    quality: rel.join(','),
    pcs: new Set(rel.map(r => (r + rootPc) % 12)),
  };
}

/** Standard-tuning candidates (low → high) for a chord root/quality, open shape first. */
function standardCandidates(rootPc: number, quality: string): { frets: Frets; open: boolean }[] {
  const out: { frets: Frets; open: boolean }[] = [];
  const open = OPEN_SHAPES[`${CHROMATIC[rootPc]}|${quality}`] ?? OPEN_SHAPES[`${flatName(rootPc)}|${quality}`];
  if (open) out.push({ frets: chart(open), open: true });

  for (const offsets of MOVABLE[quality] ?? []) {
    const rootString = offsets.findIndex(o => o === 0);
    let rootFret = (rootPc - STANDARD_PC_LOW_TO_HIGH[rootString] + 12) % 12;
    const minOffset = Math.min(...offsets.filter((o): o is number => o !== null));
    if (rootFret + minOffset < 0) rootFret += 12;
    out.push({ frets: offsets.map(o => (o === null ? null : rootFret + o)), open: false });
  }
  return out;
}

function flatName(pc: number): string {
  return ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][pc];
}

function isDrawable(frets: Frets): boolean {
  const played = frets.filter((f): f is number => f !== null);
  if (played.length < 2) return false;
  const fretted = played.filter(f => f > 0);
  if (fretted.length === 0) return true;
  const max = Math.max(...fretted);
  const min = Math.min(...fretted);
  if (max - min > 3) return false;
  // Chord diagrams show either an open-position box (frets 1-3 + open strings)
  // or a 4-fret window higher up; open strings above fret 3 can't be drawn.
  if (played.includes(0) && max > 3) return false;
  return max <= 15;
}

function soundsChord(frets: Frets, stringPcs: number[], info: ChordInfo): boolean {
  let hasRoot = false;
  const heard = new Set<number>();
  for (let i = 0; i < frets.length; i++) {
    const f = frets[i];
    if (f === null) continue;
    const pc = (stringPcs[i] + f) % 12;
    if (!info.pcs.has(pc)) return false;
    heard.add(pc);
    if (pc === info.rootPc) hasRoot = true;
  }
  // Require at least 3 distinct chord tones (or all of them for 2-note chords)
  return hasRoot && heard.size >= Math.min(3, info.pcs.size);
}

function sixStringVoicing(info: ChordInfo, tuning: Tuning): Frets | null {
  const lowToHigh = [...tuning.strings].reverse();
  const midi = lowToHigh.map(midiOf);
  const stringPcs = lowToHigh.map(s => pitchClass(s.note));
  // Shift of the top string vs standard; other strings may differ further (drop tunings)
  const shift = midi[5] - STANDARD_MIDI_LOW_TO_HIGH[5];
  const extra = midi.map((m, i) => m - STANDARD_MIDI_LOW_TO_HIGH[i] - shift);
  // Chord to look up in standard tuning so the result sounds `info` in this tuning
  const lookupRoot = ((info.rootPc - shift) % 12 + 12) % 12;

  const scored = standardCandidates(lookupRoot, info.quality)
    .map(c => ({ ...c, frets: c.frets.map((f, i) => (f === null ? null : f - extra[i])) }))
    .map(c => ({ ...c, frets: fixDropString(c.frets) }))
    .filter(c => c.frets.every(f => f === null || f >= 0))
    .filter(c => isDrawable(c.frets) && soundsChord(c.frets, stringPcs, info));

  if (scored.length === 0) return null;
  const openShape = scored.find(c => c.open);
  const best = openShape ?? scored.sort((a, b) => maxFret(a.frets) - maxFret(b.frets) || playedCount(b.frets) - playedCount(a.frets))[0];
  return [...addOpenBass(best.frets, stringPcs, info)].reverse();
}

/**
 * Open-position shapes often mute low strings that, in this tuning, ring a chord
 * tone with the root in the bass (drop D: D chord xx0232 → 000232). Let them ring.
 */
function addOpenBass(frets: Frets, stringPcs: number[], info: ChordInfo): Frets {
  if (frets[0] !== null || stringPcs[0] !== info.rootPc || maxFret(frets) > 3) return frets;
  const out = [...frets];
  for (let i = 0; i < out.length && out[i] === null; i++) {
    if (!info.pcs.has(stringPcs[i])) break;
    out[i] = 0;
  }
  return out;
}

/** In drop tunings the shifted low string can land outside the shape — mute it rather than lose the shape. */
function fixDropString(frets: Frets): Frets {
  const fretted = frets.slice(1).filter((f): f is number => f !== null && f > 0);
  if (frets[0] === null || fretted.length === 0) return frets;
  const low = frets[0];
  if (low < 0 || (low !== 0 && Math.abs(low - Math.min(...fretted)) > 3)) {
    return [null, ...frets.slice(1)];
  }
  return frets;
}

function maxFret(frets: Frets): number {
  return Math.max(0, ...frets.filter((f): f is number => f !== null));
}

function playedCount(frets: Frets): number {
  return frets.filter(f => f !== null).length;
}

/** Bass: root on the lowest string that has it within the first 4 frets, then 5th and octave. */
function bassVoicing(info: ChordInfo, tuning: Tuning): Frets | null {
  const lowToHigh = [...tuning.strings].reverse().map(s => pitchClass(s.note));
  const fifthPc = (info.rootPc + 7) % 12;
  const hasFifth = info.pcs.has(fifthPc);

  for (let s = 0; s < lowToHigh.length - 1; s++) {
    const rootFret = (info.rootPc - lowToHigh[s] + 12) % 12;
    if (rootFret > 4 && s < lowToHigh.length - 2) continue;
    const frets: Frets = lowToHigh.map(() => null);
    frets[s] = rootFret;
    if (hasFifth && s + 1 < lowToHigh.length) {
      frets[s + 1] = (fifthPc - lowToHigh[s + 1] + 12) % 12;
    }
    if (s + 2 < lowToHigh.length) {
      const octave = (info.rootPc - lowToHigh[s + 2] + 12) % 12;
      if (Math.abs(octave - rootFret) <= 3) frets[s + 2] = octave;
    }
    return frets.reverse();
  }
  return null;
}

/**
 * Most commonly played voicing for `chordName` in `tuning` (pass the capo-applied
 * tuning when a capo is on). Returns frets in tuning string order, or null when no
 * known shape fits — callers fall back to a generic search.
 */
export function getDefaultVoicing(chordName: string, tuning: Tuning): Frets | null {
  const info = parseChord(chordName);
  if (!info) return null;

  if (tuning.id.startsWith('bass')) return bassVoicing(info, tuning);
  if (tuning.strings.length === 6) return sixStringVoicing(info, tuning);
  return null;
}
