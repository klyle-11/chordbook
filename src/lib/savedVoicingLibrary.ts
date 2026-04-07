import { db } from './db';
import type { SavedVoicing } from '../types/chord';

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
