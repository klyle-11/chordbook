import type { Tuning } from './tunings';

export const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Pitch class (0-11) of a note name, or -1 if it can't be parsed.
 * Handles any spelling tonal or the user may produce: "Db", "D♭", "C#", "C♯",
 * "E#", "Cb", "F##", "Bbb", "Fx". Octave digits are ignored ("C#4" → 1).
 */
export function pitchClass(note: string): number {
    const match = note.trim().match(/^([A-Ga-g])([#♯b♭x]*)/);
    if (!match) return -1;
    let pc = LETTER_SEMITONES[match[1].toUpperCase()];
    for (const acc of match[2]) {
        if (acc === '#' || acc === '♯') pc += 1;
        else if (acc === 'x') pc += 2;
        else pc -= 1;
    }
    return ((pc % 12) + 12) % 12;
}

/** Canonical sharp spelling used for all comparisons ("Eb" → "D#", "F##" → "G"). */
export function normalizeNote(n: string): string {
    const pc = pitchClass(n);
    return pc === -1 ? n : CHROMATIC[pc];
}

/** Enharmonic-aware equality: "Db" === "C#". */
export function sameNote(a: string, b: string): boolean {
    const pa = pitchClass(a);
    return pa !== -1 && pa === pitchClass(b);
}

/** Sorted, de-duplicated pitch-class key for comparing note sets ("E,C,G" vs "G,C,E,C"). */
export function pitchClassKey(notes: string[]): string {
    return [...new Set(notes.map(pitchClass).filter(pc => pc !== -1))].sort((a, b) => a - b).join(',');
}

/** Note sounding at `fret` on a string whose open note is `openNote`. */
export function getNoteAtFret(openNote: string, fret: number): string {
    const pc = pitchClass(openNote);
    if (pc === -1) return '?';
    return CHROMATIC[(pc + fret) % 12];
}

/**
 * Given a tuning and a fret-per-string array, return the sounding note names.
 * Frets are relative to the tuning's open strings — pass a capo-applied tuning
 * (see getSoundingTuning) when a capo is on. Skips null (muted) strings.
 */
export function getNotesFromVoicing(tuning: Tuning, frets: (number | null)[]): string[] {
    const notes: string[] = [];

    for (let i = 0; i < frets.length && i < tuning.displayStrings.length; i++) {
        const fret = frets[i];
        if (fret === null || fret === undefined) continue;
        const note = getNoteAtFret(tuning.displayStrings[i], fret);
        if (note !== '?') notes.push(note);
    }

    return notes;
}

/**
 * Given a string's open note and a target note, find all frets where that note appears
 * from 0 to maxFret. E.g. E string, target G => frets 3, 15.
 */
export function getFretsForNoteOnString(stringRoot: string, targetNote: string, maxFret = 24): number[] {
    const rootPc = pitchClass(stringRoot);
    const targetPc = pitchClass(targetNote);
    if (rootPc === -1 || targetPc === -1) return [];

    const frets: number[] = [];
    for (let fret = (targetPc - rootPc + 12) % 12; fret <= maxFret; fret += 12) {
        frets.push(fret);
    }
    return frets;
}
