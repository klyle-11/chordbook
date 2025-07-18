import { Chord } from "@tonaljs/tonal";

/**
 * Get the pitch classes for a chord name.
 * E.g. "Cmaj7" => ["C", "E", "G", "B"]
 */
export function getNotesForChord(chordName: string): string[] {
  const chord = Chord.get(chordName);
  return chord.notes;
}
