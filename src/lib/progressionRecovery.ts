import type { Progression } from '../types/progression';

// Common chord progressions that might help identify the "Love progression"
const COMMON_LOVE_PROGRESSIONS = [
  // Classic "Love Me Tender" type progressions
  { name: "Love Me Tender", chords: ["C", "Am", "F", "G"] },
  { name: "Can't Help Myself", chords: ["C", "Am", "F", "G", "C"] },
  { name: "All You Need Is Love", chords: ["G", "D", "Em", "C"] },
  { name: "Love Story", chords: ["G", "D", "Am", "C"] },
  { name: "I Will Always Love You", chords: ["C", "G", "Am", "F"] },
  { name: "Endless Love", chords: ["C", "F", "G", "Am"] },
  { name: "My Girl", chords: ["C", "F", "G", "C"] },
  { name: "Stand By Me", chords: ["C", "Am", "F", "G", "C"] },
  { name: "Unchained Melody", chords: ["C", "Am", "F", "G"] },
  { name: "The Way You Look Tonight", chords: ["C", "A7", "Dm", "G7"] }
];

export function suggestLoveProgressions(): Array<{name: string, chords: string[]}> {
  return COMMON_LOVE_PROGRESSIONS;
}

export function createLoveProgression(name: string, chords: string[]): Progression {
  const now = new Date();
  return {
    id: `recovered-love-${Date.now()}`,
    name: `Recovered: ${name}`,
    chords: chords.map(chordSymbol => ({
      name: chordSymbol,
      notes: [] // Will be populated when displayed
    })),
    createdAt: now,
    updatedAt: now
  };
}

// Search for Love-related progressions in localStorage
export function searchForLoveProgressions(): string[] {
  const results: string[] = [];
  
  // Check all localStorage keys for any chord-related data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('chord')) {
      try {
        const value = localStorage.getItem(key);
        if (value && value.toLowerCase().includes('love')) {
          results.push(`Found in ${key}: ${value.substring(0, 200)}...`);
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }
  
  return results;
}
