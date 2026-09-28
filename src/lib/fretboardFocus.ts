import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

/**
 * What the song-wide fretboard (in the song header) is showing.
 * A progression grid publishes its selected / playing chord here; when nothing
 * is focused the header fretboard falls back to all notes in the song.
 */
export interface FretboardFocus {
  ownerId: string;                 // progression id that owns the focus
  chordName: string;
  chordNotes: string[];
  voicingFrets?: (number | null)[]; // capo-relative
  previewName?: string;
  previewNotes?: string[];
  /** Set while the full voicing editor is open: fretboard clicks fill the tab */
  onFretClick?: (stringIndex: number, fret: number, note: string) => void;
}

interface FretboardFocusValue {
  focus: FretboardFocus | null;
  setFocus: Dispatch<SetStateAction<FretboardFocus | null>>;
}

export const FretboardFocusContext = createContext<FretboardFocusValue>({
  focus: null,
  setFocus: () => {},
});

export function useFretboardFocus(): FretboardFocusValue {
  return useContext(FretboardFocusContext);
}
