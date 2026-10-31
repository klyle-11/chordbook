import { Chord } from "@tonaljs/tonal";
import { isCustomChord, getCustomChordNotes } from '../customChordLibrary';
import { pitchClass, pitchClassKey } from './notes';

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
  const target = pitchClassKey(notes);
  if (!target) return null;

  // Common chord types to check
  const chordTypes = [
    "", "m", "7", "maj7", "m7", "dim", "aug", "sus4", "sus2",
    "6", "m6", "9", "m9", "maj9", "11", "13", "add9", "7sus4", "maj7#11"
  ];

  // Compare by pitch class, so spelling doesn't matter (D#,G,A# from a tab matches Eb).
  // Flat roots are listed where they're the conventional name (Eb, Ab, Bb).
  const rootNotes = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  for (const root of rootNotes) {
    for (const type of chordTypes) {
      const chordName = root + type;
      const chord = Chord.get(chordName);
      if (chord.notes.length > 0 && pitchClassKey(chord.notes) === target) {
        return chordName;
      }
    }
  }

  return null;
}

/**
 * When a tab plays notes outside its chord, suggest the name the tab actually spells
 * (e.g. C chord + D on top → "Cadd9"). Returns null when the tab fits the chord.
 */
export function suggestRenameForTab(
  chordNotes: string[],
  tabNotes: string[],
): { outsideNotes: string[]; suggestedName: string } | null {
  if (chordNotes.length === 0 || tabNotes.length === 0) return null;
  const chordPcs = new Set(chordNotes.map(pitchClass));
  const unique = [...new Set(tabNotes)];
  const outsideNotes = unique.filter(n => !chordPcs.has(pitchClass(n)));
  if (outsideNotes.length === 0) return null;
  return { outsideNotes, suggestedName: findChordByNotes(unique) ?? `[${unique.join(', ')}]` };
}
