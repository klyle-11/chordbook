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

/**
 * Find an existing chord name that matches the given notes
 * Returns the chord name if found, null otherwise
 */
export function findChordByNotes(notes: string[]): string | null {
  // Normalize the input notes (remove duplicates, sort for comparison)
  const normalizedInput = [...new Set(notes)].sort();
  
  // Common chord types to check
  const chordTypes = [
    "", "m", "7", "maj7", "m7", "dim", "aug", "sus4", "sus2", 
    "6", "m6", "9", "m9", "maj9", "11", "13", "add9", "7sus4", "maj7#11"
  ];
  
  // Try all root notes
  const rootNotes = ['C', 'C#', 'D♭', 'D', 'D#', 'E♭', 'E', 'F', 'F#', 'G♭', 'G', 'G#', 'A♭', 'A', 'A#', 'B♭', 'B'];
  
  for (const root of rootNotes) {
    for (const type of chordTypes) {
      const chordName = root + type;
      try {
        const chord = Chord.get(chordName);
        if (chord.notes && chord.notes.length > 0) {
          // Normalize the chord notes for comparison
          const normalizedChord = [...new Set(chord.notes)].sort();
          
          // Check if the notes match (allowing for enharmonic equivalents)
          if (notesMatch(normalizedInput, normalizedChord)) {
            return chordName;
          }
        }
      } catch {
        // Skip invalid chord names
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Helper function to check if two sets of notes match (considering enharmonic equivalents)
 */
function notesMatch(notes1: string[], notes2: string[]): boolean {
  if (notes1.length !== notes2.length) return false;
  
  const set1 = new Set(notes1);
  const set2 = new Set(notes2);
  
  // Check if all notes in set1 are in set2 and vice versa
  // This handles basic note matching - could be enhanced for enharmonic equivalents
  return notes1.every(note => set2.has(note)) &&
         notes2.every(note => set1.has(note));
}
