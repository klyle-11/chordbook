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