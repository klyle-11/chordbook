import type { Progression, SavedProgression } from '../types/progression';

const STORAGE_KEY = 'chordbook-progressions';
const CURRENT_PROGRESSION_KEY = 'chordbook-current-progression';

export function saveProgressions(progressions: Progression[]): void {
  const serialized = progressions.map(prog => ({
    ...prog,
    createdAt: prog.createdAt.toISOString(),
    updatedAt: prog.updatedAt.toISOString()
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
}

export function loadProgressions(): Progression[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed: SavedProgression[] = JSON.parse(stored);
    return parsed.map(prog => ({
      ...prog,
      createdAt: new Date(prog.createdAt),
      updatedAt: new Date(prog.updatedAt)
    }));
  } catch (error) {
    console.error('Failed to load progressions:', error);
    return [];
  }
}

export function saveCurrentProgression(progressionId: string): void {
  localStorage.setItem(CURRENT_PROGRESSION_KEY, progressionId);
}

export function loadCurrentProgression(): string | null {
  return localStorage.getItem(CURRENT_PROGRESSION_KEY);
}

export function generateProgressionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatProgressionDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}
