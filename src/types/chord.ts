export interface ChordVoicing {
  frets: (number | null)[];  // one entry per string; null = muted, 0 = open
  tuningId: string;          // ties voicing to a specific tuning
}

export interface Chord {
  name: string;
  notes: string[];
  voicing?: ChordVoicing;
  beats?: number; // duration in beats; defaults to beatsPerMeasure when absent
}

export interface SavedVoicing {
  id: string;
  name: string;
  tuningId: string;
  frets: (number | null)[];
  notes: string[];
  createdAt: Date;
}
