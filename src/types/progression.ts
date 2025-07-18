import type { Chord } from './chord';

export interface Progression {
  id: string;
  name: string;
  chords: Chord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedProgression {
  id: string;
  name: string;
  chords: Chord[];
  createdAt: string;
  updatedAt: string;
}
