// Audio frequencies for notes (in Hz)
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

  async playNote(note: string, duration: number = 0.5) {
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

    // Normalize note name (remove numbers, handle flats/sharps)
    const normalizedNote = note.replace(/[0-9]/g, '');
    const frequency = noteFrequencies[normalizedNote];

    if (!frequency) {
      console.warn(`Unknown note: ${note}`);
      return;
    }

    try {
      // Create oscillator for the tone
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure oscillator
      oscillator.type = 'sine'; // Smooth sine wave tone
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      // Configure volume envelope (smooth fade in/out to avoid clicks)
      const now = this.audioContext.currentTime;
      const fadeInTime = 0.05; // 50ms fade in
      const fadeOutTime = 0.1; // 100ms fade out
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume, now + fadeInTime); // Smooth fade in
      gainNode.gain.linearRampToValueAtTime(this.volume, now + duration - fadeOutTime); // Hold
      gainNode.gain.linearRampToValueAtTime(0, now + duration); // Fade out

      // Start and stop the tone
      oscillator.start(now);
      oscillator.stop(now + duration);

    } catch (error) {
      console.error('Error playing note:', error);
    }
  }
}

// Export singleton instance
export const audioPlayer = new AudioPlayer();
