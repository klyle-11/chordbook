import type { Chord } from './chord';
import type { Tuning, CapoSettings } from '../lib/tunings';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedSong extends Omit<Song, 'createdAt' | 'updatedAt' | 'progressions' | 'tuning' | 'capoSettings'> {
  progressions: Array<Omit<NamedProgression, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }>;
  tuning: Tuning;
  capoSettings: CapoSettings;
  createdAt: string;
  updatedAt: string;
}
