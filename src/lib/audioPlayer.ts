import { type Tuning } from './tunings';

// Audio frequencies for notes (in Hz) - 4th octave base frequencies
const noteFrequencies: { [key: string]: number } = {
  'C': 261.63,
  'C#': 277.18,
  'Db': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'Eb': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'Gb': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'Ab': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'Bb': 466.16,
  'B': 493.88,
};

class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private volume: number = 0.3; // Default volume (30%)

  constructor() {
    // Initialize AudioContext on first user interaction
    if (typeof window !== 'undefined') {
      this.initializeAudioContext();
    }
  }

  private initializeAudioContext() {
    try {
      // @ts-expect-error - WebKit audio context fallback
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
  }

  getVolume(): number {
    return this.volume;
  }

  private getFrequencyForNoteAndOctave(note: string, octave: number): number {
    const baseFreq = noteFrequencies[note];
    if (!baseFreq) return 440; // Fallback to A4
    
    // Calculate frequency for specific octave
    // Base frequencies are for 4th octave, so adjust accordingly
    const octaveDifference = octave - 4;
    return baseFreq * Math.pow(2, octaveDifference);
  }

  async playNote(note: string, duration: number = 0.5, guitarString?: string, fret?: number, stringIndex?: number, tuning?: Tuning) {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (!this.audioContext || this.volume === 0) {
      return;
    }

    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Calculate the correct frequency based on guitar string and fret
    let frequency: number;
    
    if (guitarString && fret !== undefined && stringIndex !== undefined && tuning) {
      // Use the tuning and string index to get the correct tuning
      const stringTuning = tuning.strings[stringIndex];
      if (stringTuning) {
        // Calculate frequency: open string frequency * (2^(fret/12))
        const openStringFreq = this.getFrequencyForNoteAndOctave(stringTuning.note, stringTuning.octave);
        frequency = openStringFreq * Math.pow(2, fret / 12);
      } else {
        // Fallback to base note frequency
        const normalizedNote = note.replace(/[0-9]/g, '');
        frequency = noteFrequencies[normalizedNote] || 440;
      }
    } else {
      // Fallback to base note frequency (4th octave)
      const normalizedNote = note.replace(/[0-9]/g, '');
      frequency = noteFrequencies[normalizedNote];
      
      if (!frequency) {
        console.warn(`Unknown note: ${note}`);
        return;
      }
    }

    try {
      // Create oscillator for the tone
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Create a filter for more guitar-like tone
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, this.audioContext.currentTime); // Cut off high frequencies
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);

      // Connect nodes: oscillator -> filter -> gain -> destination
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure oscillator for guitar-like sound
      oscillator.type = 'sawtooth'; // Sawtooth wave for more harmonics like a guitar
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      
      // Add slight vibrato for more realistic guitar sound
      const lfoGain = this.audioContext.createGain();
      const lfo = this.audioContext.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(4.5, this.audioContext.currentTime); // 4.5 Hz vibrato
      lfoGain.gain.setValueAtTime(8, this.audioContext.currentTime); // Vibrato depth
      
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);

      // Configure volume envelope (guitar-like attack and decay)
      const now = this.audioContext.currentTime;
      const attackTime = 0.1; // Slightly longer attack for smoother fade-in
      const decayTime = 0.3; // Gradual decay
      const sustainLevel = 0.6; // Sustain at 60% of peak volume
      const releaseTime = 0.2; // Quick release
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume, now + attackTime); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(this.volume * sustainLevel, now + attackTime + decayTime); // Decay to sustain
      gainNode.gain.exponentialRampToValueAtTime(this.volume * sustainLevel, now + duration - releaseTime); // Hold sustain
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release (use 0.001 instead of 0 for exponential ramp)

      // Start oscillators
      lfo.start(now);
      oscillator.start(now);
      
      // Stop oscillators
      lfo.stop(now + duration);
      oscillator.stop(now + duration);

    } catch (error) {
      console.error('Error playing note:', error);
    }
  }
}

// Export singleton instance
export const audioPlayer = new AudioPlayer();
