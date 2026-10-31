import { db, type CustomChord } from './db';

export type { CustomChord };

/**
 * User-defined chords ("[C, G, C, E]"), stored in IndexedDB.
 *
 * Chord lookups (getNotesForChord → isCustomChord) are synchronous and run on every
 * render, so reads come from an in-memory cache filled once by loadCustomChords()
 * at startup; writes update the cache immediately and persist in the background.
 */
let cache: CustomChord[] = [];
let byName = new Map<string, CustomChord>();

function setCache(chords: CustomChord[]): void {
  cache = chords;
  byName = new Map(chords.map(chord => [chord.name, chord]));
}

const LEGACY_STORAGE_KEY = 'chordbook-custom-chords';

/** Load custom chords into memory, migrating the old localStorage copy once. */
export async function loadCustomChords(): Promise<void> {
  try {
    let chords = await db.customChords.toArray();
    const legacy = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_STORAGE_KEY) : null;
    if (legacy) {
      const parsed = JSON.parse(legacy) as Array<Omit<CustomChord, 'createdAt'> & { createdAt: string }>;
      const known = new Set(chords.map(c => c.name));
      const migrated = parsed
        .filter(c => !known.has(c.name))
        .map(c => ({ ...c, createdAt: new Date(c.createdAt) }));
      if (migrated.length > 0) await db.customChords.bulkPut(migrated);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      chords = [...chords, ...migrated];
    }
    setCache(chords);
  } catch (error) {
    console.error('Error loading custom chords:', error);
  }
}

/** Fill the cache without touching the DB (the exported song viewer has none). */
export function setCustomChords(chords: CustomChord[]): void {
  setCache(chords);
}

export function getCustomChords(): CustomChord[] {
  return cache;
}

/** Replace the whole library (backup restore). */
export async function replaceCustomChords(chords: CustomChord[]): Promise<void> {
  await db.transaction('rw', db.customChords, async () => {
    await db.customChords.clear();
    await db.customChords.bulkPut(chords);
  });
  setCache(chords);
}

export function addCustomChord(name: string, notes: string[]): boolean {
  // Reject an exact duplicate note sequence
  const notesKey = notes.join(',').toLowerCase();
  if (cache.some(chord => chord.notes.join(',').toLowerCase() === notesKey)) {
    return false;
  }

  const chord: CustomChord = {
    id: Date.now().toString(),
    name,
    notes,
    createdAt: new Date(),
  };
  setCache([...cache, chord]);
  db.customChords.put(chord).catch(error => console.error('Error saving custom chord:', error));
  return true;
}

export function isCustomChord(chordName: string): boolean {
  return byName.has(chordName);
}

export function getCustomChordNotes(chordName: string): string[] {
  return byName.get(chordName)?.notes ?? [];
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
  const chord = byName.get(chordName);
  if (!chord) return;
  setCache(cache.filter(c => c.name !== chordName));
  db.customChords.delete(chord.id).catch(error => console.error('Error deleting custom chord:', error));
}
