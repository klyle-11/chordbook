import type { Tuning, CapoSettings } from './tunings';

export function formatTuningDisplay(tuning: Tuning): string {
  // For standard tuning, just show "Standard", for others show the name
  if (tuning.id === 'standard') {
    return 'Standard';
  }
  return tuning.name.split('(')[0].trim(); // Take just the name part, not the notes in parentheses
}

export function formatCapoDisplay(capoSettings: CapoSettings): string {
  if (!capoSettings.enabled || capoSettings.fret === 0) {
    return 'No capo';
  }
  return `Capo ${capoSettings.fret}`;
}

export function formatBpmDisplay(bpm: number): string {
  return `${bpm} BPM`;
}

export function formatSongInfo(tuning: Tuning, capoSettings: CapoSettings, bpm: number): string {
  const tuningStr = formatTuningDisplay(tuning);
  const capoStr = formatCapoDisplay(capoSettings);
  const bpmStr = formatBpmDisplay(bpm);
  
  return `${tuningStr} • ${capoStr} • ${bpmStr}`;
}
