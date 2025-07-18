// Guitar tuning configurations
export interface Tuning {
  id: string;
  name: string;
  strings: Array<{ note: string; octave: number }>;
  displayStrings: string[];
}

export interface CapoSettings {
  fret: number; // 0 means no capo
  enabled: boolean;
}

export const TUNINGS: Tuning[] = [
  {
    id: 'standard',
    name: 'Standard (E A D G B E)',
    strings: [
      { note: 'E', octave: 4 }, // 1st string - High E
      { note: 'B', octave: 3 }, // 2nd string - B
      { note: 'G', octave: 3 }, // 3rd string - G
      { note: 'D', octave: 3 }, // 4th string - D  
      { note: 'A', octave: 2 }, // 5th string - A
      { note: 'E', octave: 2 }, // 6th string - Low E
    ],
    displayStrings: ['E', 'B', 'G', 'D', 'A', 'E']
  },
  {
    id: 'half-step-down',
    name: 'Half Step Down (D# G# C# F# A# D#)',
    strings: [
      { note: 'D#', octave: 4 }, // 1st string - High D#
      { note: 'A#', octave: 3 }, // 2nd string - A#
      { note: 'F#', octave: 3 }, // 3rd string - F#
      { note: 'C#', octave: 3 }, // 4th string - C#  
      { note: 'G#', octave: 2 }, // 5th string - G#
      { note: 'D#', octave: 2 }, // 6th string - Low D#
    ],
    displayStrings: ['D#', 'A#', 'F#', 'C#', 'G#', 'D#']
  },
  {
    id: 'drop-d',
    name: 'Drop D (D A D G B E)',
    strings: [
      { note: 'E', octave: 4 }, // 1st string - High E
      { note: 'B', octave: 3 }, // 2nd string - B
      { note: 'G', octave: 3 }, // 3rd string - G
      { note: 'D', octave: 3 }, // 4th string - D  
      { note: 'A', octave: 2 }, // 5th string - A
      { note: 'D', octave: 2 }, // 6th string - Low D (dropped)
    ],
    displayStrings: ['E', 'B', 'G', 'D', 'A', 'D']
  },
  {
    id: 'd-standard',
    name: 'D Standard (D G C F A D)',
    strings: [
      { note: 'D', octave: 4 }, // 1st string - High D
      { note: 'A', octave: 3 }, // 2nd string - A
      { note: 'F', octave: 3 }, // 3rd string - F
      { note: 'C', octave: 3 }, // 4th string - C  
      { note: 'G', octave: 2 }, // 5th string - G
      { note: 'D', octave: 2 }, // 6th string - Low D
    ],
    displayStrings: ['D', 'A', 'F', 'C', 'G', 'D']
  },
  {
    id: 'drop-c',
    name: 'Drop C (C G C F A D)',
    strings: [
      { note: 'D', octave: 4 }, // 1st string - High D
      { note: 'A', octave: 3 }, // 2nd string - A
      { note: 'F', octave: 3 }, // 3rd string - F
      { note: 'C', octave: 3 }, // 4th string - C  
      { note: 'G', octave: 2 }, // 5th string - G
      { note: 'C', octave: 2 }, // 6th string - Low C (dropped)
    ],
    displayStrings: ['D', 'A', 'F', 'C', 'G', 'C']
  },
  {
    id: 'bass-standard',
    name: 'Bass Standard (E A D G)',
    strings: [
      { note: 'G', octave: 2 }, // 1st string - High G
      { note: 'D', octave: 2 }, // 2nd string - D
      { note: 'A', octave: 1 }, // 3rd string - A
      { note: 'E', octave: 1 }, // 4th string - Low E
    ],
    displayStrings: ['G', 'D', 'A', 'E']
  },
  {
    id: 'bass-5-string',
    name: 'Bass 5-String (B E A D G)',
    strings: [
      { note: 'G', octave: 2 }, // 1st string - High G
      { note: 'D', octave: 2 }, // 2nd string - D
      { note: 'A', octave: 1 }, // 3rd string - A
      { note: 'E', octave: 1 }, // 4th string - E
      { note: 'B', octave: 0 }, // 5th string - Low B
    ],
    displayStrings: ['G', 'D', 'A', 'E', 'B']
  }
];

export const DEFAULT_TUNING = TUNINGS[0]; // Standard tuning

export function getTuningById(id: string): Tuning {
  return TUNINGS.find(tuning => tuning.id === id) || DEFAULT_TUNING;
}

export function getTuningStrings(tuning: Tuning): string[] {
  return tuning.displayStrings;
}

export function getTuningData(tuning: Tuning): Array<{ note: string; octave: number }> {
  return tuning.strings;
}

// Capo utility functions
export function applyCapo(tuning: Tuning, capoFret: number): Tuning {
  if (capoFret === 0) return tuning;
  
  const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const newStrings = tuning.strings.map(string => {
    const currentNoteIndex = noteOrder.indexOf(string.note);
    const newNoteIndex = (currentNoteIndex + capoFret) % 12;
    const octaveIncrease = Math.floor((currentNoteIndex + capoFret) / 12);
    
    return {
      note: noteOrder[newNoteIndex],
      octave: string.octave + octaveIncrease
    };
  });
  
  const newDisplayStrings = newStrings.map(string => string.note);
  
  return {
    ...tuning,
    name: `${tuning.name} (Capo ${capoFret})`,
    strings: newStrings,
    displayStrings: newDisplayStrings
  };
}

export function isFretAvailable(fret: number, capoFret: number): boolean {
  return capoFret === 0 || fret >= capoFret;
}

export function getEffectiveFret(fret: number, capoFret: number): number {
  if (capoFret === 0) return fret;
  return fret - capoFret;
}
