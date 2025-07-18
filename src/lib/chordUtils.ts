import { Chord } from "@tonaljs/tonal";
import { isCustomChord, getCustomChordNotes } from './customChordLibrary';

/**
 * Get the pitch classes for a chord name.
 * E.g. "Cmaj7" => ["C", "E", "G", "B"]
 * Also handles custom chords from user library
 */
export function getNotesForChord(chordName: string): string[] {
  // Check if it's a custom chord first
  if (isCustomChord(chordName)) {
    return getCustomChordNotes(chordName);
  }
  
  // Otherwise use Tonal library
  const chord = Chord.get(chordName);
  return chord.notes;
}

/**
 * Check if a chord name is valid (either in Tonal library or custom library)
 */
export function isValidChord(chordName: string): boolean {
  // Check custom chords first
  if (isCustomChord(chordName)) {
    return true;
  }
  
  // Check Tonal library
  const chord = Chord.get(chordName);
  return chord.notes.length > 0 && chord.name !== "";
}

/**
 * Get chord suggestions for invalid chord names
 */
export function getChordSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  
  // Common chord types to try
  const chordTypes = [
    "", "m", "7", "maj7", "m7", "dim", "aug", "sus4", "sus2", 
    "6", "m6", "9", "m9", "maj9", "11", "13", "add9"
  ];
  
  // Try to extract root note from input
  const rootMatch = input.match(/^[A-G][#b]?/i);
  if (rootMatch) {
    const root = rootMatch[0].toUpperCase();
    
    // Try different chord types with the extracted root
    for (const type of chordTypes) {
      const suggestion = root + type;
      if (isValidChord(suggestion) && suggestion !== input) {
        suggestions.push(suggestion);
      }
    }
  }
  
  // Try common roots if no root was extracted or if we need more suggestions
  if (suggestions.length < 3) {
    const commonRoots = ["C", "G", "Am", "F", "D", "Em", "Dm"];
    for (const chord of commonRoots) {
      if (isValidChord(chord) && !suggestions.includes(chord)) {
        suggestions.push(chord);
      }
    }
  }
  
  return suggestions.slice(0, 3); // Return up to 3 suggestions
}
