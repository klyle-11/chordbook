import { db } from './db';
import type { Lead, LeadNote } from '../types/lead';

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
