import { Chord, Note } from '@tonaljs/tonal';
import type { HarmonicContext } from '../harmonicAnalysis';
import { pitchClass } from './notes';

export type BebopScaleId =
  | 'major'
  | 'dominant'
  | 'dorian'
  | 'minor'
  | 'locrian'
  | 'melodic-minor';

export interface BebopScaleDefinition {
  id: BebopScaleId;
  name: string;
  baseMode: ModeId | 'melodic-minor';
  intervals: readonly string[];
}

export interface ChordScaleSuggestion {
  name: string;
  root: string;
  notes: string[];
  source: 'bebop' | 'mode';
  mode: string;
  bebopScaleId?: BebopScaleId;
}

type ModeId = 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian';

interface ModeDefinition {
  id: ModeId;
  name: string;
  semitones: readonly number[];
  bebopScaleId?: BebopScaleId;
}

/**
 * Chordbook's owned bebop-scale catalog. Keeping the formulas here avoids
 * depending on third-party aliases, which vary especially for minor scales.
 */
export const BEBOP_SCALE_LIBRARY: readonly BebopScaleDefinition[] = [
  {
    id: 'major',
    name: 'Major Bebop',
    baseMode: 'ionian',
    intervals: ['1P', '2M', '3M', '4P', '5P', '5A', '6M', '7M'],
  },
  {
    id: 'dominant',
    name: 'Dominant Bebop',
    baseMode: 'mixolydian',
    intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7m', '7M'],
  },
  {
    id: 'dorian',
    name: 'Dorian Bebop',
    baseMode: 'dorian',
    intervals: ['1P', '2M', '3m', '3M', '4P', '5P', '6M', '7m'],
  },
  {
    id: 'minor',
    name: 'Minor Bebop',
    baseMode: 'aeolian',
    intervals: ['1P', '2M', '3m', '4P', '5P', '6m', '7m', '7M'],
  },
  {
    id: 'locrian',
    name: 'Locrian Bebop',
    baseMode: 'locrian',
    intervals: ['1P', '2m', '3m', '4P', '5d', '5P', '6m', '7m'],
  },
  {
    id: 'melodic-minor',
    name: 'Melodic Minor Bebop',
    baseMode: 'melodic-minor',
    intervals: ['1P', '2M', '3m', '4P', '5P', '6m', '6M', '7M'],
  },
] as const;

const MODES: readonly ModeDefinition[] = [
  { id: 'ionian', name: 'Ionian', semitones: [0, 2, 4, 5, 7, 9, 11], bebopScaleId: 'major' },
  { id: 'dorian', name: 'Dorian', semitones: [0, 2, 3, 5, 7, 9, 10], bebopScaleId: 'dorian' },
  { id: 'phrygian', name: 'Phrygian', semitones: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: 'Lydian', semitones: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: 'Mixolydian', semitones: [0, 2, 4, 5, 7, 9, 10], bebopScaleId: 'dominant' },
  { id: 'aeolian', name: 'Aeolian', semitones: [0, 2, 3, 5, 7, 8, 10], bebopScaleId: 'minor' },
  { id: 'locrian', name: 'Locrian', semitones: [0, 1, 3, 5, 6, 8, 10], bebopScaleId: 'locrian' },
] as const;

function getDefinition(id: BebopScaleId): BebopScaleDefinition {
  return BEBOP_SCALE_LIBRARY.find(scale => scale.id === id)!;
}

/** Build one of the catalog scales with root-aware note spelling. */
export function getBebopScale(root: string, id: BebopScaleId): ChordScaleSuggestion | null {
  const definition = getDefinition(id);
  const notes = definition.intervals
    .map(interval => Note.transpose(root, interval))
    .filter((note): note is string => Boolean(note));

  if (notes.length !== 8 || new Set(notes.map(pitchClass)).size !== 8) return null;

  return {
    name: `${root} ${definition.name}`,
    root,
    notes,
    source: 'bebop',
    mode: definition.baseMode,
    bebopScaleId: id,
  };
}

function samePitchClassSet(values: readonly number[], expected: readonly number[]): boolean {
  return values.length === expected.length && values.every((value, index) => value === expected[index]);
}

function containsChordTones(scaleNotes: string[], chordNotes: string[]): boolean {
  const scalePcs = new Set(scaleNotes.map(pitchClass));
  return chordNotes.length > 0 && chordNotes.every(note => scalePcs.has(pitchClass(note)));
}

function contextualMode(
  root: string,
  chordNotes: string[],
  context: HarmonicContext,
): ChordScaleSuggestion | null {
  const rootPc = pitchClass(root);
  const rootIndex = context.scale.findIndex(note => pitchClass(note) === rootPc);
  if (rootPc < 0 || rootIndex < 0) return null;

  const notes = [...context.scale.slice(rootIndex), ...context.scale.slice(0, rootIndex)];
  if (!containsChordTones(notes, chordNotes)) return null;

  const semitones = notes.map(note => (pitchClass(note) - rootPc + 12) % 12);
  const mode = MODES.find(candidate => samePitchClassSet(semitones, candidate.semitones));
  if (!mode) return null;

  // Prefer the established bebop extension of this exact contextual mode.
  if (mode.bebopScaleId) {
    const bebop = getBebopScale(root, mode.bebopScaleId);
    if (bebop && containsChordTones(bebop.notes, chordNotes)) return bebop;
  }

  return {
    name: `${root} ${mode.name}`,
    root,
    notes,
    source: 'mode',
    mode: mode.id,
  };
}

function fallbackBebopIds(chordName: string): BebopScaleId[] {
  // Tonal does not parse slash chords; their harmony is the part before the bass note.
  const baseName = chordName.split('/')[0].trim();
  const chord = Chord.get(baseName);
  if (chord.empty) return [];

  const type = chord.type.toLowerCase();
  const intervals = new Set(chord.intervals);

  if (type.includes('half-diminished')) return ['locrian'];
  if (type.includes('minor/major') || type.includes('minor sixth')) {
    return ['melodic-minor', 'minor'];
  }
  if (type.includes('dominant') || (intervals.has('7m') && !intervals.has('3m') && !intervals.has('5d'))) {
    return ['dominant'];
  }
  if (chord.quality === 'Minor' && intervals.has('7m')) return ['dorian', 'minor'];
  if (chord.quality === 'Major' && (intervals.has('7M') || intervals.has('6M'))) return ['major'];

  // A bare triad does not establish a unique chord-scale without tonal context.
  return [];
}

/**
 * Suggest a contextual scale for a chord. The detected song key wins; a
 * quality-based bebop fallback is only used where the chord itself is specific
 * enough, and every returned scale is required to contain every chord tone.
 */
export function suggestChordScale(
  chordName: string,
  suppliedChordNotes: string[],
  context?: HarmonicContext,
): ChordScaleSuggestion | null {
  const baseName = chordName.split('/')[0].trim();
  const parsed = Chord.get(baseName);
  const root = parsed.tonic || baseName.match(/^([A-G][#b]?)/)?.[1];
  if (!root) return null;

  const chordNotes = suppliedChordNotes.length > 0 ? suppliedChordNotes : parsed.notes;
  if (chordNotes.length === 0 || chordNotes.some(note => pitchClass(note) < 0)) return null;

  if (context) {
    const contextual = contextualMode(root, chordNotes, context);
    if (contextual) return contextual;
  }

  for (const id of fallbackBebopIds(baseName)) {
    const suggestion = getBebopScale(root, id);
    if (suggestion && containsChordTones(suggestion.notes, chordNotes)) return suggestion;
  }

  return null;
}
