import { db } from './db';
import type { SavedVoicing } from '../types/chord';

const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B',
};

function normalizeNote(n: string): string {
  return FLAT_TO_SHARP[n] || n;
}

function normalizeAndSort(notes: string[]): string {
  return notes.map(normalizeNote).sort().join(',');
}

export async function getSavedVoicings(tuningId?: string): Promise<SavedVoicing[]> {
  try {
    if (tuningId) {
      return await db.savedVoicings.where('tuningId').equals(tuningId).toArray();
    }
    return await db.savedVoicings.toArray();
  } catch (error) {
    console.error('Error loading saved voicings:', error);
    return [];
  }
}

export async function saveVoicing(voicing: Omit<SavedVoicing, 'id' | 'createdAt'>): Promise<string> {
  const id = 'voicing-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  const entry: SavedVoicing = {
    ...voicing,
    id,
    createdAt: new Date(),
  };
  await db.savedVoicings.put(entry);
  return id;
}

export async function deleteVoicing(id: string): Promise<void> {
  await db.savedVoicings.delete(id);
}

export async function getVoicingsByName(name: string): Promise<SavedVoicing[]> {
  return await db.savedVoicings.where('name').equals(name).toArray();
}

/** Find all saved voicings matching chord notes + tuning (enharmonic-aware). */
export async function findVoicingsForNotes(notes: string[], tuningId: string): Promise<SavedVoicing[]> {
  const voicings = await db.savedVoicings.where('tuningId').equals(tuningId).toArray();
  const target = normalizeAndSort(notes);
  return voicings.filter(v => normalizeAndSort(v.notes) === target);
}
