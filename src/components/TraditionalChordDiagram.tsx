import { Chord } from '@tonaljs/tonal';
import type { Tuning } from '../lib/tunings';
import { getTuningStrings, getTuningData } from '../lib/tunings';

interface TraditionalChordDiagramProps {
  chordName: string;
  tuning: Tuning;
}

interface ChordPosition {
  fret: number | 'x';
  finger?: number;
}

// Helper function to get known chord patterns for common chords
function getKnownChordPattern(chordName: string): { positions: ChordPosition[]; startFret: number; capo?: number } | null {
  const knownPatterns: { [key: string]: { positions: ChordPosition[]; startFret: number; capo?: number } } = {
    'C6': {
      positions: [
        { fret: 0 },          // High E - open (E)
        { fret: 1, finger: 1 }, // B string - 1st fret (C)
        { fret: 2, finger: 2 }, // G string - 2nd fret (A)
        { fret: 2, finger: 3 }, // D string - 2nd fret (E) 
        { fret: 3, finger: 4 }, // A string - 3rd fret (C)
        { fret: 'x' }         // Low E - muted
      ],
      startFret: 0
    },
    'Cmaj7': {
      positions: [
        { fret: 0 },          // High E - open (E)
        { fret: 0 },          // B string - open (B)
        { fret: 0 },          // G string - open (G)
        { fret: 2, finger: 2 }, // D string - 2nd fret (E)
        { fret: 3, finger: 3 }, // A string - 3rd fret (C)
        { fret: 'x' }         // Low E - muted
      ],
      startFret: 0
    },
    'Amaj7': {
      positions: [
        { fret: 0 },          // High E - open (E)
        { fret: 2, finger: 2 }, // B string - 2nd fret (C#)
        { fret: 1, finger: 1 }, // G string - 1st fret (G#)
        { fret: 2, finger: 3 }, // D string - 2nd fret (E)
        { fret: 0 },          // A string - open (A)
        { fret: 'x' }         // Low E - muted
      ],
      startFret: 0
    },
    'Dmaj7': {
      positions: [
        { fret: 2, finger: 1 }, // High E - 2nd fret (F#)
        { fret: 2, finger: 2 }, // B string - 2nd fret (C#)
        { fret: 2, finger: 3 }, // G string - 2nd fret (A)
        { fret: 0 },          // D string - open (D)
        { fret: 'x' },        // A string - muted
        { fret: 'x' }         // Low E - muted
      ],
      startFret: 0
    },
    'Emaj7': {
      positions: [
        { fret: 0 },          // High E - open (E)
        { fret: 0 },          // B string - open (B)
        { fret: 1, finger: 1 }, // G string - 1st fret (G#)
        { fret: 1, finger: 2 }, // D string - 1st fret (D#)
        { fret: 2, finger: 3 }, // A string - 2nd fret (B)
        { fret: 0 }           // Low E - open (E)
      ],
      startFret: 0
    },
    'Gmaj7': {
      positions: [
        { fret: 2, finger: 1 }, // High E - 2nd fret (F#)
        { fret: 0 },          // B string - open (B)
        { fret: 0 },          // G string - open (G)
        { fret: 0 },          // D string - open (D)
        { fret: 'x' },        // A string - muted
        { fret: 3, finger: 2 } // Low E - 3rd fret (G)
      ],
      startFret: 0
    },
    'Am6': {
      positions: [
        { fret: 0 },          // High E - open (E)
        { fret: 1, finger: 1 }, // B string - 1st fret (C)
        { fret: 2, finger: 3 }, // G string - 2nd fret (A)
        { fret: 2, finger: 2 }, // D string - 2nd fret (E)
        { fret: 0 },          // A string - open (A)
        { fret: 'x' }         // Low E - muted
      ],
      startFret: 0
    },
    'Dm6': {
      positions: [
        { fret: 1, finger: 1 }, // High E - 1st fret (F)
        { fret: 0 },          // B string - open (B)
        { fret: 2, finger: 2 }, // G string - 2nd fret (A)
        { fret: 0 },          // D string - open (D)
        { fret: 'x' },        // A string - muted
        { fret: 'x' }         // Low E - muted
      ],
      startFret: 0
    }
  };
  
  return knownPatterns[chordName] || null;
}

// Helper function to assign finger numbers to chord positions
function assignFingerNumbers(positions: ChordPosition[]): ChordPosition[] {
  const result = [...positions];
  
  // Get all fretted positions (excluding open and muted strings)
  const frettedPositions = result
    .map((pos, index) => ({ ...pos, stringIndex: index }))
    .filter(pos => typeof pos.fret === 'number' && pos.fret > 0);
  
  // Sort by fret number to assign fingers from lowest to highest fret
  frettedPositions.sort((a, b) => (a.fret as number) - (b.fret as number));
  
  // Group positions by fret to handle barre chords
  const fretGroups = new Map<number, typeof frettedPositions>();
  frettedPositions.forEach(pos => {
    const fret = pos.fret as number;
    if (!fretGroups.has(fret)) {
      fretGroups.set(fret, []);
    }
    fretGroups.get(fret)!.push(pos);
  });
  
  let fingerNumber = 1;
  
  // Assign fingers to each fret group
  for (const [, group] of Array.from(fretGroups.entries()).sort((a, b) => a[0] - b[0])) {
    if (group.length >= 3) {
      // Barre chord - assign same finger to all strings at this fret
      group.forEach(pos => {
        result[pos.stringIndex].finger = fingerNumber;
      });
    } else {
      // Regular fingering - assign individual fingers
      group.forEach(pos => {
        result[pos.stringIndex].finger = fingerNumber;
        fingerNumber = Math.min(fingerNumber + 1, 4); // Max 4 fingers
      });
      continue; // Don't increment fingerNumber at the end for individual notes
    }
    fingerNumber = Math.min(fingerNumber + 1, 4); // Max 4 fingers
  }
  
  return result;
}

export function TraditionalChordDiagram({ chordName, tuning }: TraditionalChordDiagramProps) {
  // Get chord data from Tonal
  const chord = Chord.get(chordName);
  
  if (!chord.notes || chord.notes.length === 0) {
    return (
      <div className="text-xs text-gray-500 p-2">
        No chord diagram available
      </div>
    );
  }

  // Calculate chord fingering based on tuning and chord notes
  const calculateChordFingering = (): { positions: ChordPosition[]; startFret: number; capo?: number } | null => {
    const tuningData = getTuningData(tuning);
    const chordNotes = chord.notes;
    
    // Check for known chord patterns first (for standard tuning)
    if (tuning.id === 'standard') {
      const knownChords = getKnownChordPattern(chordName);
      if (knownChords) {
        return knownChords;
      }
    }
    
    // Helper function to get all semitones for a note name (accounting for octaves)
    const getNoteSemitones = (noteName: string): number[] => {
      const noteToSemitone: { [key: string]: number } = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
      };
      const baseSemitone = noteToSemitone[noteName];
      if (baseSemitone === undefined) return [];
      
      // Return semitone values for multiple octaves (within guitar range)
      return [baseSemitone, baseSemitone + 12, baseSemitone + 24, baseSemitone + 36];
    };

    // Calculate semitone value for each string's open note
    const stringBaseSemitones = tuningData.map(stringData => {
      const noteToSemitone: { [key: string]: number } = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
      };
      const baseSemitone = noteToSemitone[stringData.note];
      return baseSemitone + (stringData.octave * 12);
    });

    // Try to find a chord shape starting from different frets
    // Prioritize open position (startFret = 0) for better common chord shapes
    const fretRanges = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    for (const startFret of fretRanges) {
      const positions: ChordPosition[] = [];
      let hasChordTones = false;
      let chordTonesCount = 0;

      for (let stringIndex = 0; stringIndex < stringBaseSemitones.length; stringIndex++) {
        const stringBaseSemitone = stringBaseSemitones[stringIndex];
        let bestFret: number | 'x' = 'x';
        let foundChordTone = false;

        // Check frets within the 4-fret span from startFret
        for (let fret = startFret; fret <= startFret + 3; fret++) {
          const noteSemitone = stringBaseSemitone + fret;
          
          // Check if this fret produces any of the chord notes
          for (const chordNote of chordNotes) {
            const chordNoteSemitones = getNoteSemitones(chordNote);
            if (chordNoteSemitones.some(semitone => semitone % 12 === noteSemitone % 12)) {
              bestFret = fret;
              foundChordTone = true;
              hasChordTones = true;
              chordTonesCount++;
              break;
            }
          }
          if (foundChordTone) break;
        }

        // If no chord tone found in the span, check if open string works
        if (!foundChordTone && startFret === 0) {
          const openNoteSemitone = stringBaseSemitone;
          for (const chordNote of chordNotes) {
            const chordNoteSemitones = getNoteSemitones(chordNote);
            if (chordNoteSemitones.some(semitone => semitone % 12 === openNoteSemitone % 12)) {
              bestFret = 0;
              hasChordTones = true;
              chordTonesCount++;
              break;
            }
          }
        }

        positions.push({ fret: bestFret });
      }

      // Improved chord shape validation
      // Prefer shapes that:
      // 1. Have at least 3 chord tones
      // 2. Have better coverage of chord notes
      // 3. Are playable (not too many stretches)
      const activeStrings = positions.filter(p => p.fret !== 'x').length;
      const hasGoodCoverage = chordTonesCount >= Math.min(3, chordNotes.length);
      
      if (hasChordTones && activeStrings >= 3 && hasGoodCoverage) {
        // Assign finger numbers to the positions
        const positionsWithFingers = assignFingerNumbers(positions);
        
        // Check for capo (if all strings that aren't muted are at the same fret)
        const frettedPositions = positionsWithFingers.filter((p: ChordPosition) => typeof p.fret === 'number' && p.fret > 0);
        const uniqueFrets = [...new Set(frettedPositions.map((p: ChordPosition) => p.fret))];
        const capo = uniqueFrets.length === 1 && uniqueFrets[0] === startFret && frettedPositions.length >= 4 
          ? startFret : undefined;
        
        return { positions: positionsWithFingers, startFret, capo };
      }
    }

    return null;
  };

  const chordShape = calculateChordFingering();
  
  if (!chordShape) {
    return (
      <div className="text-xs text-gray-500 p-2">
        Chord shape not found for this tuning
      </div>
    );
  }

  const { positions, startFret, capo } = chordShape;
  const strings = getTuningStrings(tuning);

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
      <div className="text-center font-semibold text-sm mb-2">{chordName}</div>
      
      {/* Fret position indicator */}
      {startFret > 0 && (
        <div className="text-center text-xs text-gray-600 mb-1">
          {startFret === 1 ? '1st fret' : `${startFret}${getOrdinalSuffix(startFret)} fret`}
        </div>
      )}
      
      {/* Capo indicator */}
      {capo && (
        <div className="text-center text-xs text-orange-600 font-semibold mb-1">
          Capo {capo}
        </div>
      )}
      
      {/* Rotated chord diagram */}
      <div className="relative flex">
        {/* String labels (on the left side) */}
        <div className="flex flex-col justify-between text-xs text-gray-600 mr-2 h-24">
          {strings.map((string, index) => (
            <span key={index} className="h-6 flex items-center">{string}</span>
          ))}
        </div>
        
        {/* Chord diagram (rotated 90 degrees counterclockwise) */}
        <div className="relative flex">
          {/* Frets (now vertical columns) */}
          {[0, 1, 2, 3].map((fretOffset) => {
            const actualFret = startFret + fretOffset;
            
            // Check for barre at this fret
            const barrePositions = positions
              .map((pos, idx) => ({ ...pos, stringIndex: idx }))
              .filter(pos => 
                typeof pos.fret === 'number' && 
                pos.fret === actualFret && 
                pos.fret > 0 && 
                pos.finger
              );
            
            // Group by finger number to find barres
            const fingerGroups = new Map<number, typeof barrePositions>();
            barrePositions.forEach(pos => {
              if (pos.finger) {
                if (!fingerGroups.has(pos.finger)) {
                  fingerGroups.set(pos.finger, []);
                }
                fingerGroups.get(pos.finger)!.push(pos);
              }
            });
            
            // Find barre chords (3 or more strings with same finger)
            const barres = Array.from(fingerGroups.entries())
              .filter(([, group]) => group.length >= 3)
              .map(([finger, group]) => ({
                finger,
                startString: Math.min(...group.map(p => p.stringIndex)),
                endString: Math.max(...group.map(p => p.stringIndex))
              }));
            
            return (
              <div key={fretOffset} className="flex flex-col justify-between w-6 border-r border-gray-400 h-24">
                {/* Barre indicators */}
                {barres.map((barre, barreIndex) => (
                  <div 
                    key={`barre-${barreIndex}`}
                    className="absolute w-1 bg-gray-600 rounded-full z-5"
                    style={{
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: `${(barre.startString / (positions.length - 1)) * 100}%`,
                      height: `${((barre.endString - barre.startString) / (positions.length - 1)) * 100}%`
                    }}
                  />
                ))}
                
                {positions.map((position, stringIndex) => (
                  <div key={stringIndex} className="relative h-6 flex items-center justify-center">
                    {/* String line (horizontal) - only show if not an open string on fret 0 */}
                    {!(position.fret === 0 && actualFret === 0) && (
                      <div className="absolute left-1/2 h-px w-6 bg-gray-400 transform -translate-x-1/2"></div>
                    )}
                    
                    {/* Finger position */}
                    {typeof position.fret === 'number' && position.fret === actualFret && position.fret > 0 && (
                      <div className="relative z-10 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center">
                        {position.finger && (
                          <span className="text-white text-xs font-bold">{position.finger}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Muted string (X) */}
                    {position.fret === 'x' && actualFret === startFret && (
                      <div className="relative z-10 text-red-600 text-sm font-bold">×</div>
                    )}
                    
                    {/* Open string (O) */}
                    {position.fret === 0 && actualFret === 0 && (
                      <div className="relative z-10 w-4 h-4 border-2 border-gray-800 rounded-full bg-white"></div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        
        {/* Fret numbers (at the bottom) */}
        <div className="absolute bottom-0 left-10 flex text-xs text-gray-500 mt-1">
          {[1, 2, 3].map((offset) => (
            <span key={offset} className="w-6 text-center">{startFret + offset}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
