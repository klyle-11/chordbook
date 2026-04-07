import type { Tuning } from './tunings';

/**
 * Given a tuning and a fret-per-string array, return the sounding note names.
 * Skips null (muted) strings.
 */
export function getNotesFromVoicing(tuning: Tuning, frets: (number | null)[]): string[] {
    const chromatic = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const notes: string[] = [];

    for (let i = 0; i < frets.length && i < tuning.displayStrings.length; i++) {
        const fret = frets[i];
        if (fret === null || fret === undefined) continue;
        const openNote = tuning.displayStrings[i];
        const rootIndex = chromatic.indexOf(openNote);
        if (rootIndex === -1) continue;
        notes.push(chromatic[(rootIndex + fret) % 12]);
    }

    return notes;
}

/**
 * Given a string's open note and a target note, find all frets where that note appears within 24 frets.
 * E.g. E string, target G => frets 3, 15, etc.
 */
export function getFretsForNoteOnString(stringRoot: string, targetNote: string): number[] {
    const chromatic = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const rootIndex = chromatic.indexOf(stringRoot);
    const targetIndex = chromatic.indexOf(targetNote);
    const frets: number[] = [];

    if (rootIndex === -1 || targetIndex === -1) {
        return frets; // Invalid note
    }

    for (let i = 0; i <= 24; i++) {
        const currentNote = chromatic[(rootIndex + i) % 12];
        if (currentNote === targetNote) {
            frets.push(i);
        }
    }

    return frets;
}