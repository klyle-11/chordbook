import type { Chord } from './chord';
import type { Tuning, CapoSettings } from '../lib/tunings';

export interface TimeSignature {
  beatsPerMeasure: number; // numerator, e.g. 4
  beatUnit: number;        // denominator, e.g. 4
}

export interface ChordPairing {
  id: string;
  name: string;
  progressionIds: string[]; // ordered list of NamedProgression ids (2+)
  createdAt: Date;
  updatedAt: Date;
}

export interface NamedProgression {
  id: string;
  name: string;
  chords: Chord[];
  bpm?: number; // Optional BPM that inherits from song if not set
  createdAt: Date;
  updatedAt: Date;
}

export interface Song {
  id: string;
  name: string;
  progressions: NamedProgression[];
  tuning: Tuning;
  capoSettings: CapoSettings;
  bpm: number;
  timeSignature?: TimeSignature;
  pairings?: ChordPairing[];
  leadIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastOpened?: Date; // Track when song was last opened
}

export interface SavedSong extends Omit<Song, 'createdAt' | 'updatedAt' | 'lastOpened' | 'progressions' | 'tuning' | 'capoSettings' | 'pairings'> {
  progressions: Array<Omit<NamedProgression, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }>;
  pairings?: Array<Omit<ChordPairing, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }>;
  leadIds?: string[];
  tuning: Tuning;
  capoSettings: CapoSettings;
  createdAt: string;
  updatedAt: string;
  lastOpened?: string; // String representation of lastOpened date
}
