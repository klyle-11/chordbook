import type { Tuning } from './tunings';
import { pitchClass } from './notes';
import { getDefaultVoicing } from './voicings';
import { getNotesForChord } from './chords';

/**
 * Chord-diagram fingering: which fret each string plays and which finger holds it.
 * Pure (no React) so diagrams, playback and tests share it.
 */

export interface ChordPosition {
  fret: number | 'x';
  finger?: number;
}

function assignFingerNumbers(positions: ChordPosition[]): ChordPosition[] {
  const result = [...positions];
  const fretted = result
    .map((pos, index) => ({ ...pos, stringIndex: index }))
    .filter(pos => typeof pos.fret === 'number' && pos.fret > 0);
  fretted.sort((a, b) => (a.fret as number) - (b.fret as number));

  const fretGroups = new Map<number, typeof fretted>();
  fretted.forEach(pos => {
    const f = pos.fret as number;
    if (!fretGroups.has(f)) fretGroups.set(f, []);
    fretGroups.get(f)!.push(pos);
  });

  let finger = 1;
  for (const [, group] of Array.from(fretGroups.entries()).sort((a, b) => a[0] - b[0])) {
    if (group.length >= 3) {
      group.forEach(pos => { result[pos.stringIndex].finger = finger; });
    } else {
      group.forEach(pos => { result[pos.stringIndex].finger = finger; finger = Math.min(finger + 1, 4); });
      continue;
    }
    finger = Math.min(finger + 1, 4);
  }
  return result;
}

export type Fingering = { positions: ChordPosition[]; startFret: number; capo?: number };

// Fingering is recomputed on every card render; cache per chord + tuning.
const fingeringCache = new Map<string, Fingering | null>();

/**
 * Diagram shape for a chord: the common default voicing when one is known
 * (lib/defaultVoicings), otherwise a generic 4-fret-window search.
 * Pass the capo-applied (sounding) tuning; frets are relative to the capo.
 */
export function calculateChordFingering(chordName: string, tuning: Tuning): Fingering | null {
  const notes = getNotesForChord(chordName);
  if (notes.length === 0) return null;

  const cacheKey = `${chordName}|${notes.join(',')}|${tuning.strings.map(s => s.note + s.octave).join(',')}`;
  if (fingeringCache.has(cacheKey)) return fingeringCache.get(cacheKey)!;
  const result = defaultFingering(chordName, tuning) ?? searchFingering(notes, tuning);
  fingeringCache.set(cacheKey, result);
  return result;
}

function defaultFingering(chordName: string, tuning: Tuning): Fingering | null {
  const frets = getDefaultVoicing(chordName, tuning);
  if (!frets) return null;
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const startFret = fretted.length === 0 || Math.max(...fretted) <= 3 ? 0 : Math.min(...fretted);
  return {
    positions: assignFingerNumbers(frets.map(f => ({ fret: f === null ? 'x' : f }))),
    startFret,
  };
}

function searchFingering(notes: string[], tuning: Tuning): Fingering | null {
  // Pitch classes, so tonal spellings like E#, B#, F## still match
  const chordPcs = new Set(notes.map(pitchClass));
  const stringPcs = tuning.displayStrings.map(pitchClass);

  for (const startFret of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const positions: ChordPosition[] = [];
    let toneCount = 0;

    for (let si = 0; si < stringPcs.length; si++) {
      let bestFret: number | 'x' = 'x';
      let found = false;

      for (let f = startFret; f <= startFret + 3; f++) {
        if (chordPcs.has((stringPcs[si] + f) % 12)) {
          bestFret = f; found = true; toneCount++; break;
        }
      }

      if (!found && startFret === 0 && chordPcs.has(stringPcs[si])) {
        bestFret = 0; toneCount++;
      }
      positions.push({ fret: bestFret });
    }

    const active = positions.filter(p => p.fret !== 'x').length;
    if (toneCount >= Math.min(3, chordPcs.size) && active >= 3) {
      const withFingers = assignFingerNumbers(positions);
      const fretted = withFingers.filter(p => typeof p.fret === 'number' && (p.fret as number) > 0);
      const uniqueFrets = [...new Set(fretted.map(p => p.fret))];
      const capo = uniqueFrets.length === 1 && uniqueFrets[0] === startFret && fretted.length >= 4 ? startFret : undefined;
      return { positions: withFingers, startFret, capo };
    }
  }
  return null;
}
