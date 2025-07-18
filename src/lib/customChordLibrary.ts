interface CustomChord {
  id: string;
  name: string; // The user's input like "[C, G, C, E]"
  notes: string[];
  createdAt: Date;
}

const CUSTOM_CHORDS_KEY = 'chordbook-custom-chords';

export function getCustomChords(): CustomChord[] {
  try {
    const stored = localStorage.getItem(CUSTOM_CHORDS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Array<Omit<CustomChord, 'createdAt'> & { createdAt: string }>;
      return parsed.map((chord) => ({
        ...chord,
        createdAt: new Date(chord.createdAt)
      }));
    }
  } catch (error) {
    console.error('Error loading custom chords:', error);
  }
  return [];
}

export function saveCustomChords(chords: CustomChord[]): void {
  try {
    localStorage.setItem(CUSTOM_CHORDS_KEY, JSON.stringify(chords));
  } catch (error) {
    console.error('Error saving custom chords:', error);
  }
}

export function addCustomChord(name: string, notes: string[]): boolean {
  const existing = getCustomChords();
  
  // Check if this exact note sequence already exists
  const notesString = notes.join(',').toLowerCase();
  const duplicate = existing.find(chord => 
    chord.notes.join(',').toLowerCase() === notesString
  );
  
  if (duplicate) {
    return false; // Chord already exists
  }
  
  const newChord: CustomChord = {
    id: Date.now().toString(),
    name,
    notes,
    createdAt: new Date()
  };
  
  const updated = [...existing, newChord];
  saveCustomChords(updated);
  return true;
}

export function isCustomChord(chordName: string): boolean {
  const customChords = getCustomChords();
  return customChords.some(chord => chord.name === chordName);
}

export function getCustomChordNotes(chordName: string): string[] {
  const customChords = getCustomChords();
  const chord = customChords.find(chord => chord.name === chordName);
  return chord ? chord.notes : [];
}

export function parseChordInput(input: string): { isCustomChord: boolean; notes: string[] } {
  // Check if input matches pattern [note, note, note, ...]
  const bracketMatch = input.match(/^\s*\[\s*([A-G][#b]?\s*(?:,\s*[A-G][#b]?\s*)*)\s*\]\s*$/i);
  
  if (bracketMatch) {
    const notesString = bracketMatch[1];
    const notes = notesString.split(',').map(note => {
      const trimmed = note.trim();
      // Normalize sharps and flats
      let normalized = trimmed.replace(/♯/g, '#').replace(/♭/g, '♭');
      
      // Handle case insensitivity: capitalize note letter, keep accidental
      if (normalized.length >= 1) {
        const noteLetter = normalized[0].toUpperCase();
        let accidental = normalized.slice(1).toLowerCase();
        
        // Handle double letters like "BB" -> "♭", "##" -> "#"
        if (accidental === 'bb' || accidental === 'BB'.toLowerCase()) {
          accidental = '♭';
        } else if (accidental === 'b') {
          accidental = '♭';
        } else if (accidental === '##') {
          accidental = '#';
        }
        
        normalized = noteLetter + accidental;
      }
      
      return normalized;
    });
    
    // Validate that all are valid note names
    const validNotes = ['C', 'C#', 'D♭', 'D', 'D#', 'E♭', 'E', 'F', 'F#', 'G♭', 'G', 'G#', 'A♭', 'A', 'A#', 'B♭', 'B'];
    const allValid = notes.every(note => validNotes.includes(note));
    
    if (allValid && notes.length > 0) {
      return { isCustomChord: true, notes };
    }
  }
  
  return { isCustomChord: false, notes: [] };
}

export function deleteCustomChord(chordName: string): void {
  const existing = getCustomChords();
  const filtered = existing.filter(chord => chord.name !== chordName);
  saveCustomChords(filtered);
}
