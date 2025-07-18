/**
 * Calculate the raw cumulative position for a fret on a 24-fret guitar
 * with progressively smaller fret spacing to simulate real guitar geometry
 */
function calculateRawFretPosition(fret: number): number {
  if (fret === 0) return 0;
  
  // Base fret spacing - each fret gets smaller by this factor
  const spacingFactor = 0.944; // Approximately 5.6% reduction per fret (like real guitars)
  
  let position = 0;
  let currentSpacing = 4.17; // Starting spacing percentage for first fret
  
  for (let i = 1; i <= fret; i++) {
    position += currentSpacing;
    currentSpacing *= spacingFactor;
  }
  
  return position;
}

// Calculate the scaling factor once
const maxRawPosition = calculateRawFretPosition(24);

/**
 * Calculate the scaled position percentage for a fret on a 24-fret guitar
 * that uses the full width of the fretboard diagram
 */
export function calculateFretPosition(fret: number): number {
  const rawPosition = calculateRawFretPosition(fret);
  return (rawPosition / maxRawPosition) * 100;
}

/**
 * Generate an array of fret positions for 0-24 frets, scaled to use full width
 */
export function getFretPositions(): number[] {
  return Array.from({ length: 25 }, (_, fret) => calculateFretPosition(fret));
}

/**
 * Calculate the center position of a fret space for displaying fret numbers
 */
export function getFretCenterPosition(fret: number): number {
  if (fret === 0) {
    // For open string (fret 0), position at the very beginning
    return 0;
  }
  
  const prevFretPos = calculateFretPosition(fret - 1);
  const currentFretPos = calculateFretPosition(fret);
  
  // Return the center between the previous fret line and current fret line
  return (prevFretPos + currentFretPos) / 2;
}
