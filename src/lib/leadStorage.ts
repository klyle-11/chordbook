import { db } from './db';
import type { Lead, LeadNote } from '../types/lead';
import type { Song } from '../types/song';
import { applyCapo, getCapoFret, getTuningById, type Tuning } from './music/tunings';
import { getNoteAtFret, sameNote } from './music/notes';

export function generateLeadId(): string {
  return 'lead-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function getAllLeads(): Promise<Lead[]> {
  try {
    return await db.leads.toArray();
  } catch (error) {
    console.error('Error loading leads:', error);
    return [];
  }
}

export async function getLeadsByTuning(tuningId: string): Promise<Lead[]> {
  try {
    return await db.leads.where('tuningId').equals(tuningId).toArray();
  } catch (error) {
    console.error('Error loading leads by tuning:', error);
    return [];
  }
}

export async function getLead(id: string): Promise<Lead | undefined> {
  try {
    return await db.leads.get(id);
  } catch (error) {
    console.error('Error loading lead:', error);
    return undefined;
  }
}

export async function saveLead(lead: { name: string; notes: LeadNote[]; tuningId: string }): Promise<string> {
  const id = generateLeadId();
  const now = new Date();
  const entry: Lead = {
    ...lead,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await db.leads.put(entry);
  return id;
}

export async function updateLead(id: string, updates: Partial<Pick<Lead, 'name' | 'notes'>>): Promise<void> {
  await db.leads.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteLead(id: string): Promise<void> {
  await db.leads.delete(id);
}

export async function getLeadsForSong(leadIds: string[]): Promise<Lead[]> {
  if (leadIds.length === 0) return [];
  try {
    const leads = await db.leads.where('id').anyOf(leadIds).toArray();
    // Preserve order from leadIds
    return leadIds.map(id => leads.find(l => l.id === id)).filter((l): l is Lead => l !== undefined);
  } catch (error) {
    console.error('Error loading leads for song:', error);
    return [];
  }
}

/**
 * Leads used to store absolute frets (from the nut) while chord voicings store
 * capo-relative frets (tab convention). Convert a lead's notes to capo-relative.
 *
 * The stored note name decides the frame per note: Guitar Pro imports were already
 * capo-relative, and older leads could be either, so only notes whose name matches the
 * absolute reading (and not the relative one) are shifted.
 */
export function toCapoRelativeNotes(notes: LeadNote[], tuning: Tuning, capo: number): LeadNote[] {
  if (capo <= 0) return notes;
  const sounding = applyCapo(tuning, capo);
  return notes.map(n => {
    const open = tuning.displayStrings[n.stringIndex];
    if (!open) return n;
    const absoluteMatch = sameNote(n.note, getNoteAtFret(open, n.fret));
    const relativeMatch = sameNote(n.note, getNoteAtFret(sounding.displayStrings[n.stringIndex], n.fret));
    if (absoluteMatch && !relativeMatch && n.fret >= capo) {
      return { ...n, fret: n.fret - capo };
    }
    return n;
  });
}

const LEAD_FRET_MIGRATION_KEY = 'leadFretsCapoRelative';

/** One-time: convert stored leads to capo-relative frets, using the capo of a song that uses each lead. */
export async function migrateLeadFretsToCapoRelative(songs: Song[]): Promise<boolean> {
  try {
    if (await db.appState.get(LEAD_FRET_MIGRATION_KEY)) return false;
    const leads = await db.leads.toArray();
    const updated: Lead[] = [];
    for (const lead of leads) {
      const song = songs.find(s => s.leadIds?.includes(lead.id));
      const capo = getCapoFret(song?.capoSettings);
      const notes = toCapoRelativeNotes(lead.notes, getTuningById(lead.tuningId), capo);
      if (notes.some((n, i) => n !== lead.notes[i])) updated.push({ ...lead, notes });
    }
    await db.transaction('rw', db.leads, db.appState, async () => {
      if (updated.length > 0) await db.leads.bulkPut(updated);
      await db.appState.put({ key: LEAD_FRET_MIGRATION_KEY, value: 'true' });
    });
    return updated.length > 0;
  } catch (error) {
    console.error('Lead fret migration failed:', error);
    return false;
  }
}
