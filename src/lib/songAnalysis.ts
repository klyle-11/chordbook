import type { Song } from '../types/song';

/**
 * Get all unique notes from all chords in all progressions of a song
 */
export function getUniqueNotesFromSong(song: Song): string[] {
  if (!song || !song.progressions) {
    return [];
  }
  
  const allNotes = new Set<string>();
  
  // Iterate through all progressions in the song
  song.progressions.forEach(progression => {
    // Iterate through all chords in each progression
    progression.chords.forEach(chord => {
      // Add all notes from each chord
      chord.notes.forEach(note => {
        allNotes.add(note);
      });
    });
  });
  
  // Convert set to array and sort for consistent display
  return Array.from(allNotes).sort();
}

/**
 * Describe the scale/notes collection of a song
 */
export function describeSongScale(song: Song): string {
  const uniqueNotes = getUniqueNotesFromSong(song);
  
  if (uniqueNotes.length === 0) {
    return 'No chords added yet';
  }
  
  if (uniqueNotes.length === 1) {
    return `Single note: ${uniqueNotes[0]}`;
  }
  
  // Basic scale analysis - could be enhanced with more music theory
  const noteCount = uniqueNotes.length;
  const notesString = uniqueNotes.join(', ');
  
  return `${noteCount} unique notes: ${notesString}`;
}

/**
 * Get statistics about the song's chord content
 */
export function getSongStats(song: Song): {
  totalProgressions: number;
  totalChords: number;
  uniqueNotes: string[];
  averageChordsPerProgression: number;
} {
  const uniqueNotes = getUniqueNotesFromSong(song);
  const totalProgressions = song.progressions.length;
  const totalChords = song.progressions.reduce((sum, prog) => sum + prog.chords.length, 0);
  
  return {
    totalProgressions,
    totalChords,
    uniqueNotes,
    averageChordsPerProgression: totalProgressions > 0 ? Math.round((totalChords / totalProgressions) * 10) / 10 : 0
  };
}
