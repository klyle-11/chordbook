// Normalized ChordShape model
export interface ChordShape {
  // Left-to-right strings: low E .. high E (E A D G B E)
  frets: (number | null)[]; // null = muted, 0 = open, >0 = fret number
  fingers?: (number | null)[]; // optional finger numbers per string (1-4)
  barres?: { fromString: number; toString: number; fret: number }[]; // 1-based string indexes (1=low E)
  baseFret?: number; // starting fret label (defaults to min fretted > 0 or 1)
}

// Canonical shapes for common chords in standard tuning
// Strings are indexed left->right low E..high E
export const CHORD_SHAPES: Record<string, ChordShape[]> = {
  // G major (open): 3 2 0 0 0 3
  G: [
    {
      frets: [3, 2, 0, 0, 0, 3],
      fingers: [3, 2, null, null, null, 4],
      baseFret: 1,
    },
  ],
  // F major (barre): 1 3 3 2 1 1 with full barre on 1st fret
  F: [
    {
      frets: [1, 3, 3, 2, 1, 1],
      fingers: [1, 3, 4, 2, 1, 1],
      barres: [{ fromString: 1, toString: 6, fret: 1 }],
      baseFret: 1,
    },
  ],
  // Dm7 requested: x 5 7 5 6 x
  Dm7: [
    {
      frets: [null, 5, 7, 5, 6, null],
      fingers: [null, 1, 3, 1, 2, null],
      baseFret: 5,
    },
  ],
  // Am7 (open): x 0 2 0 1 0
  Am7: [
    {
      frets: [null, 0, 2, 0, 1, 0],
      fingers: [null, null, 2, null, 1, null],
      baseFret: 1,
    },
  ],
  // Emaj7 (open): 0 2 1 1 0 0
  Emaj7: [
    {
      frets: [0, 2, 1, 1, 0, 0],
      fingers: [null, 3, 1, 2, null, null],
      baseFret: 1,
    },
  ],
};

export function getChordShapes(name: string): ChordShape[] {
  return CHORD_SHAPES[name] ?? [];
}
