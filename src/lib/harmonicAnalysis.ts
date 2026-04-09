import { Key, Scale, Progression, Chord, Note } from '@tonaljs/tonal';
import type { Chord as AppChord } from '../types/chord';

// ── Data Structures ──

export interface HarmonicContext {
  detectedKey: string;
  keyTonic: string;
  keyType: 'major' | 'minor';
  scale: string[];
  diatonicChords: string[];
  chordsHarmonicFunction: string[];
  grades: string[];
  alternateKeys?: string[];
}

export interface NoteClassification {
  note: string;
  role: 'root' | '3rd' | '5th' | '7th' | '9th' | '11th' | '13th' | 'scale' | 'chromatic';
  tension: 'stable' | 'color' | 'tense' | 'leading';
}

export interface ChordAnalysis {
  chordName: string;
  romanNumeral: string;
  harmonicFunction: string;
  functionAbbrev: string;
  scaleDegree: number;
  isDiatonic: boolean;
  coreTones: NoteClassification[];
  colorTones: NoteClassification[];
  contextNotes: NoteClassification[];
  extensions: string[];
  susVariants: string[];
  substitutions: string[];
  alteredOptions: string[];
  fifthNeighbors: {
    clockwise: string;
    counterclockwise: string;
  };
}

export interface ProgressionAnalysis {
  context: HarmonicContext;
  chords: ChordAnalysis[];
}

// ── Circle of Fifths ──

const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

export function getCircleOfFifths(): string[] {
  return [...CIRCLE_OF_FIFTHS];
}

// ── Enharmonic helpers ──

const ENHARMONIC_MAP: Record<string, string> = {
  'Cb': 'B', 'B#': 'C', 'Fb': 'E', 'E#': 'F',
  'Gb': 'F#', 'Db': 'C#', 'Ab': 'G#', 'Eb': 'D#', 'Bb': 'A#',
};

function normalizeNote(note: string): string {
  return ENHARMONIC_MAP[note] || note;
}

function notesContain(arr: string[], note: string): boolean {
  const n = normalizeNote(note);
  return arr.some(a => normalizeNote(a) === n);
}

// ── Key Detection ──

export function detectKey(chords: AppChord[]): HarmonicContext {
  if (chords.length === 0) {
    return buildContext('C', 'major');
  }

  const allNotes = collectUniqueNotes(chords);
  if (allNotes.length === 0) {
    return buildContext('C', 'major');
  }

  const candidates = Scale.detect(allNotes);
  const chordRoots = chords.map(c => extractRoot(c.name)).filter(Boolean) as string[];
  const firstRoot = chordRoots[0] || allNotes[0];
  const lastRoot = chordRoots[chordRoots.length - 1] || allNotes[0];

  // Score candidates
  let bestScore = -Infinity;
  let bestKey = 'C';
  let bestType: 'major' | 'minor' = 'major';
  const altKeys: string[] = [];

  for (const candidate of candidates.slice(0, 10)) {
    const parts = candidate.split(' ');
    const tonic = parts[0];
    const modeName = parts.slice(1).join(' ').toLowerCase();

    let type: 'major' | 'minor';
    if (modeName.includes('minor') || modeName === 'aeolian' || modeName === 'dorian' || modeName === 'phrygian') {
      type = 'minor';
    } else {
      type = 'major';
    }

    let score = 0;

    // Prefer major and natural minor over exotic modes
    if (modeName === 'major' || modeName === 'ionian') score += 3;
    else if (modeName === 'minor' || modeName === 'aeolian') score += 2;
    else if (modeName === 'dorian' || modeName === 'mixolydian') score += 1;

    // First chord root bias
    if (normalizeNote(tonic) === normalizeNote(firstRoot)) score += 4;
    // Last chord root bias
    if (normalizeNote(tonic) === normalizeNote(lastRoot)) score += 2;

    // Frequency of I, IV, V roots
    const keyInfo = type === 'major' ? Key.majorKey(tonic) : Key.minorKey(tonic);
    const keyScale = type === 'major'
      ? (keyInfo as ReturnType<typeof Key.majorKey>).scale
      : (keyInfo as ReturnType<typeof Key.minorKey>).natural.scale;

    for (const root of chordRoots) {
      if (keyScale[0] && normalizeNote(root) === normalizeNote(keyScale[0])) score += 2; // I
      if (keyScale[3] && normalizeNote(root) === normalizeNote(keyScale[3])) score += 1; // IV
      if (keyScale[4] && normalizeNote(root) === normalizeNote(keyScale[4])) score += 1.5; // V
    }

    if (score > bestScore) {
      if (bestScore > -Infinity) altKeys.push(`${bestKey} ${bestType}`);
      bestScore = score;
      bestKey = tonic;
      bestType = type;
    } else {
      altKeys.push(`${tonic} ${type}`);
    }
  }

  const ctx = buildContext(bestKey, bestType);
  ctx.alternateKeys = altKeys.slice(0, 3);
  return ctx;
}

function buildContext(tonic: string, type: 'major' | 'minor'): HarmonicContext {
  if (type === 'major') {
    const key = Key.majorKey(tonic);
    return {
      detectedKey: `${tonic} major`,
      keyTonic: tonic,
      keyType: 'major',
      scale: key.scale,
      diatonicChords: key.chords,
      chordsHarmonicFunction: key.chordsHarmonicFunction,
      grades: key.grades,
    };
  } else {
    const key = Key.minorKey(tonic);
    return {
      detectedKey: `${tonic} minor`,
      keyTonic: tonic,
      keyType: 'minor',
      scale: key.natural.scale,
      diatonicChords: key.natural.chords,
      chordsHarmonicFunction: ['T', 'SD', 'T', 'SD', 'D', 'SD', 'D'],
      grades: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
    };
  }
}

// ── Chord Analysis ──

export function analyzeChord(chordName: string, context: HarmonicContext): ChordAnalysis {
  const root = extractRoot(chordName) || chordName;

  // Roman numeral
  let romanNumeral: string;
  try {
    const result = Progression.toRomanNumerals(context.keyTonic, [chordName]);
    romanNumeral = result[0] || '?';
  } catch {
    romanNumeral = '?';
  }

  // Scale degree & diatonic check
  const scaleDegree = findScaleDegree(root, context.scale);
  const isDiatonic = scaleDegree > 0 && isDiatonicChord(chordName, context);

  // Harmonic function
  const { fn, abbrev } = getHarmonicFunction(scaleDegree, isDiatonic, chordName, context);

  // Note classification
  const chordInfo = Chord.get(chordName);
  const chordNotes = chordInfo.notes || [];
  const coreTones = classifyCoreTones(chordNotes, root);
  const colorTones = findColorTones(root, chordNotes, context.scale);
  const contextNotes = findContextNotes(chordNotes, context.scale);

  // Extensions
  const extensions = findExtensions(root, chordName);
  const susVariants = findSusVariants(root);
  const substitutions = findSubstitutions(chordName, root, context);
  const alteredOptions = findAlteredOptions(chordName, root);

  // Circle of fifths neighbors
  const clockwise = Note.transpose(root, '5P') || root;
  const counterclockwise = Note.transpose(root, '-5P') || root;

  return {
    chordName,
    romanNumeral,
    harmonicFunction: fn,
    functionAbbrev: abbrev,
    scaleDegree,
    isDiatonic,
    coreTones,
    colorTones,
    contextNotes,
    extensions,
    susVariants,
    substitutions,
    alteredOptions,
    fifthNeighbors: { clockwise, counterclockwise },
  };
}

// ── Progression Analysis ──

export function analyzeProgression(chords: AppChord[]): ProgressionAnalysis {
  const context = detectKey(chords);
  const analyzed = chords.map(c => analyzeChord(c.name, context));
  return { context, chords: analyzed };
}

// ── Helpers ──

function collectUniqueNotes(chords: AppChord[]): string[] {
  const notes = new Set<string>();
  for (const chord of chords) {
    for (const note of chord.notes) {
      notes.add(note);
    }
  }
  return Array.from(notes);
}

function extractRoot(chordName: string): string | null {
  const match = chordName.match(/^([A-G][#b]?)/);
  return match ? match[1] : null;
}

function findScaleDegree(root: string, scale: string[]): number {
  for (let i = 0; i < scale.length; i++) {
    if (normalizeNote(scale[i]) === normalizeNote(root)) return i + 1;
  }
  return 0;
}

function isDiatonicChord(chordName: string, context: HarmonicContext): boolean {
  const chordInfo = Chord.get(chordName);
  if (!chordInfo.notes || chordInfo.notes.length === 0) return false;
  return chordInfo.notes.every(n => notesContain(context.scale, n));
}

function getHarmonicFunction(
  degree: number,
  isDiatonic: boolean,
  chordName: string,
  context: HarmonicContext
): { fn: string; abbrev: string } {
  if (!isDiatonic || degree === 0) {
    // Check for secondary dominant
    const root = extractRoot(chordName);
    if (root && chordName.includes('7') && !chordName.includes('maj7')) {
      return { fn: 'Secondary', abbrev: 'Sec' };
    }
    return { fn: 'Borrowed', abbrev: 'Bor' };
  }

  const fnCode = context.chordsHarmonicFunction[degree - 1];
  switch (fnCode) {
    case 'T': return { fn: 'Tonic', abbrev: 'T' };
    case 'SD': return { fn: 'Subdominant', abbrev: 'SD' };
    case 'D': return { fn: 'Dominant', abbrev: 'D' };
    default: return { fn: 'Tonic', abbrev: 'T' };
  }
}

function classifyCoreTones(chordNotes: string[], root: string): NoteClassification[] {
  const roles: Array<'root' | '3rd' | '5th' | '7th'> = ['root', '3rd', '5th', '7th'];
  return chordNotes.slice(0, 4).map((note, i) => ({
    note,
    role: roles[i] || 'root',
    tension: i <= 1 ? 'stable' : i === 2 ? 'stable' : 'color',
  }));
}

function findColorTones(root: string, chordNotes: string[], scale: string[]): NoteClassification[] {
  const tones: NoteClassification[] = [];
  const intervals = ['9M', '11P', '13M'];
  const roleNames: Array<'9th' | '11th' | '13th'> = ['9th', '11th', '13th'];

  for (let i = 0; i < intervals.length; i++) {
    try {
      const note = Note.transpose(root, intervals[i]);
      if (note && !notesContain(chordNotes, note) && notesContain(scale, note)) {
        tones.push({
          note,
          role: roleNames[i],
          tension: 'color',
        });
      }
    } catch { /* skip */ }
  }
  return tones;
}

function findContextNotes(chordNotes: string[], scale: string[]): NoteClassification[] {
  return scale
    .filter(n => !notesContain(chordNotes, n))
    .map(note => ({ note, role: 'scale' as const, tension: 'stable' as const }));
}

function findExtensions(root: string, baseName: string): string[] {
  const suffixes = ['9', '11', '13'];
  const baseType = baseName.replace(/^[A-G][#b]?/, '');
  const isMinor = baseType.startsWith('m') && !baseType.startsWith('maj');

  return suffixes
    .map(s => root + (isMinor ? 'm' : 'maj') + s)
    .filter(name => {
      const info = Chord.get(name);
      return info.notes && info.notes.length > 0;
    });
}

function findSusVariants(root: string): string[] {
  return ['sus4', 'sus2']
    .map(s => root + s)
    .filter(name => {
      const info = Chord.get(name);
      return info.notes && info.notes.length > 0;
    });
}

function findSubstitutions(chordName: string, root: string, context: HarmonicContext): string[] {
  const subs: string[] = [];
  const chordInfo = Chord.get(chordName);
  if (!chordInfo.notes || chordInfo.notes.length === 0) return subs;

  // Relative major/minor
  const baseType = chordName.replace(/^[A-G][#b]?/, '');
  if (baseType.startsWith('m') && !baseType.startsWith('maj')) {
    // Minor chord → relative major (up a minor third)
    const rel = Note.transpose(root, '3m');
    if (rel) {
      const relChord = Chord.get(rel);
      if (relChord.notes && relChord.notes.length > 0) subs.push(rel);
    }
  } else {
    // Major chord → relative minor (down a minor third)
    const rel = Note.transpose(root, '-3m');
    if (rel) {
      const relMinor = rel + 'm';
      const relChord = Chord.get(relMinor);
      if (relChord.notes && relChord.notes.length > 0) subs.push(relMinor);
    }
  }

  // Tritone sub for dominant 7ths
  if (baseType.includes('7') && !baseType.includes('maj7')) {
    const tritone = Note.transpose(root, '4A');
    if (tritone) {
      const tritoneSub = tritone + '7';
      const triChord = Chord.get(tritoneSub);
      if (triChord.notes && triChord.notes.length > 0) subs.push(tritoneSub);
    }
  }

  return subs;
}

function findAlteredOptions(_chordName: string, root: string): string[] {
  const alts = ['7b9', '7#9', '7#11', '7b13'];
  return alts
    .map(s => root + s)
    .filter(name => {
      const info = Chord.get(name);
      return info.notes && info.notes.length > 0;
    });
}
