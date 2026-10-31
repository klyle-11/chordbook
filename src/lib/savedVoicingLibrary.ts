import { db } from './db';
import type { SavedVoicing } from '../types/chord';

import { pitchClassKey } from './music/notes';

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

/** True if an identical fret pattern is already saved for this tuning. */
export async function hasVoicing(frets: (number | null)[], tuningId: string): Promise<boolean> {
  const key = frets.join(',');
  const voicings = await db.savedVoicings.where('tuningId').equals(tuningId).toArray();
  return voicings.some(v => v.frets.join(',') === key);
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
  const target = pitchClassKey(notes);
  return voicings.filter(v => pitchClassKey(v.notes) === target);
}
