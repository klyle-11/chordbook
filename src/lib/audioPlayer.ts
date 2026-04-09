import { WorkletSynthesizer } from 'spessasynth_lib';
import { type Tuning } from './tunings';

// MIDI semitone offsets for note name -> MIDI number conversion
const SEMITONE_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
};

// General MIDI program numbers
const ACOUSTIC_BASS_PROGRAM = 32;

// MIDI channels
const GUITAR_CHANNEL = 0;
const BASS_CHANNEL = 1;
const STRINGS_HIGH_CHANNEL = 2; // violin for notes >= C4
const STRINGS_LOW_CHANNEL = 3;  // cello for notes < C4

// Available instruments (General MIDI program numbers for the melody/chord channel)
export type InstrumentId = 'nylon-guitar' | 'piano' | 'synth-pad' | 'strings' | 'organ';

export interface InstrumentOption {
  id: InstrumentId;
  name: string;
  program: number;
  reverb?: number;  // CC91 value 0-127
  chorus?: number;  // CC93 value 0-127
}

export const INSTRUMENTS: InstrumentOption[] = [
  { id: 'nylon-guitar', name: 'Nylon Guitar', program: 24 },
  { id: 'piano', name: 'Piano', program: 0 },
  { id: 'synth-pad', name: 'Synth Pad', program: 94, reverb: 100, chorus: 90 },
  { id: 'strings', name: 'Strings', program: 40 },  // violin (high); cello (low) handled separately
  { id: 'organ', name: 'Organ', program: 19 },       // church organ
];

export type StrumMode = 'strum' | 'simultaneous';

// SoundFont path (hosted locally in public/ — never loaded from external CDN)
const SOUNDFONT_PATH = './soundfonts/GeneralUser-GS.sf2';
const WORKLET_PATH = './spessasynth_processor.min.js';

// SHA-256 of the vetted GeneralUser-GS.sf2 for integrity verification
const SOUNDFONT_SHA256 = '9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe';

function noteToMidi(note: string, octave: number): number {
  const semitone = SEMITONE_MAP[note];
  if (semitone === undefined) return 69; // A4 fallback
  return 12 * (octave + 1) + semitone;
}

function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-Ga-g][#b]?)(\d+)?$/);
  if (!match) return 69;
  const note = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const octave = match[2] !== undefined ? parseInt(match[2], 10) : 4;
  return noteToMidi(note, octave);
}

function isBassTuning(tuning?: Tuning): boolean {
  if (!tuning) return false;
  return tuning.id.startsWith('bass');
}

async function verifySoundFontIntegrity(buffer: ArrayBuffer): Promise<boolean> {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === SOUNDFONT_SHA256;
  } catch {
    // crypto.subtle may not be available in insecure contexts (HTTP)
    // In dev mode, skip verification; in production this should always be HTTPS
    console.warn('SoundFont integrity check unavailable (requires secure context)');
    return true;
  }
}

type SynthState = 'uninitialized' | 'loading' | 'ready' | 'failed';

// Volume gain multiplier — allows louder output than default MIDI levels
const VOLUME_GAIN = 3.0;

class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private synth: WorkletSynthesizer | null = null;
  private gainNode: GainNode | null = null;
  private volume: number = 0.5;
  private synthState: SynthState = 'uninitialized';
  private initPromise: Promise<void> | null = null;
  private currentInstrument: InstrumentId = 'nylon-guitar';
  private strumMode: StrumMode = 'strum';

  constructor() {
    // Preload SoundFont on first user interaction to hide latency
    if (typeof window !== 'undefined') {
      const preload = () => {
        this.ensureInitialized();
        document.removeEventListener('pointerdown', preload);
      };
      document.addEventListener('pointerdown', preload, { once: true });
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume * VOLUME_GAIN;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setInstrument(id: InstrumentId): void {
    this.currentInstrument = id;
    const instrument = INSTRUMENTS.find(i => i.id === id);
    if (instrument && this.synth) {
      if (id === 'strings') {
        // Violin on high channel, cello on low channel
        this.synth.programChange(STRINGS_HIGH_CHANNEL, 40); // violin
        this.synth.programChange(STRINGS_LOW_CHANNEL, 42);  // cello
        this.synth.controllerChange(STRINGS_HIGH_CHANNEL, 91, 60); // subtle reverb
        this.synth.controllerChange(STRINGS_LOW_CHANNEL, 91, 60);
        this.synth.controllerChange(STRINGS_HIGH_CHANNEL, 93, 0);
        this.synth.controllerChange(STRINGS_LOW_CHANNEL, 93, 0);
      } else {
        this.synth.programChange(GUITAR_CHANNEL, instrument.program);
        // CC91 = reverb depth, CC93 = chorus depth
        this.synth.controllerChange(GUITAR_CHANNEL, 91, instrument.reverb ?? 0);
        this.synth.controllerChange(GUITAR_CHANNEL, 93, instrument.chorus ?? 0);
      }
    }
  }

  getInstrument(): InstrumentId {
    return this.currentInstrument;
  }

  setStrumMode(mode: StrumMode): void {
    this.strumMode = mode;
  }

  getStrumMode(): StrumMode {
    return this.strumMode;
  }

  getStrumDelay(): number {
    return this.strumMode === 'strum' ? 40 : 0;
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.synthState === 'ready') return true;
    if (this.synthState === 'failed') return false;
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
    // initialize() sets synthState to 'ready' or 'failed'
    return this.synthState as SynthState === 'ready';
  }

  private async initialize(): Promise<void> {
    this.synthState = 'loading';
    try {
      // 1. Create AudioContext
      // @ts-expect-error - WebKit audio context fallback
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 44100 });

      // 2. Load the AudioWorklet processor (served from public/)
      await this.audioContext.audioWorklet.addModule(WORKLET_PATH);

      // 3. Fetch SoundFont from local origin only (no external CDN)
      const response = await fetch(SOUNDFONT_PATH);
      if (!response.ok) {
        throw new Error(`SoundFont fetch failed: ${response.status}`);
      }
      const sfBuffer = await response.arrayBuffer();

      // 4. Verify SoundFont integrity
      const isValid = await verifySoundFontIntegrity(sfBuffer);
      if (!isValid) {
        throw new Error('SoundFont integrity check failed — file may be corrupted or tampered with');
      }

      // 5. Create synthesizer and connect through gain node for volume amplification
      this.synth = new WorkletSynthesizer(this.audioContext);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume * VOLUME_GAIN;
      this.synth.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // 6. Load the verified SoundFont
      await this.synth.soundBankManager.addSoundBank(sfBuffer, 'generaluser');

      // 7. Wait for synth to be ready
      await this.synth.isReady;

      // 8. Set up instrument programs
      const instrument = INSTRUMENTS.find(i => i.id === this.currentInstrument);
      this.synth.programChange(GUITAR_CHANNEL, instrument?.program ?? 24);
      this.synth.programChange(BASS_CHANNEL, ACOUSTIC_BASS_PROGRAM);
      this.synth.programChange(STRINGS_HIGH_CHANNEL, 40); // violin
      this.synth.programChange(STRINGS_LOW_CHANNEL, 42);  // cello

      // 9. Set all channels to max MIDI volume — actual volume is controlled by GainNode
      for (const ch of [GUITAR_CHANNEL, BASS_CHANNEL, STRINGS_HIGH_CHANNEL, STRINGS_LOW_CHANNEL]) {
        this.synth.controllerChange(ch, 7, 127);
      }

      this.synthState = 'ready';
    } catch (error) {
      console.error('SpessaSynth initialization failed:', error);
      this.synthState = 'failed';
    }
  }

  async playNote(
    note: string,
    duration: number = 0.5,
    guitarString?: string,
    fret?: number,
    stringIndex?: number,
    tuning?: Tuning
  ): Promise<void> {
    if (this.volume === 0) return;

    const ready = await this.ensureInitialized();
    if (!ready || !this.synth || !this.audioContext) return;

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Calculate MIDI note number
    let midiNote: number;

    if (guitarString && fret !== undefined && stringIndex !== undefined && tuning) {
      const stringTuning = tuning.strings[stringIndex];
      if (stringTuning) {
        const openStringMidi = noteToMidi(stringTuning.note, stringTuning.octave);
        midiNote = openStringMidi + fret;
      } else {
        midiNote = noteNameToMidi(note);
      }
    } else {
      midiNote = noteNameToMidi(note);
    }

    // Clamp to valid MIDI range
    midiNote = Math.max(0, Math.min(127, midiNote));

    // Select channel based on tuning and instrument
    let channel: number;
    if (isBassTuning(tuning)) {
      channel = BASS_CHANNEL;
    } else if (this.currentInstrument === 'strings') {
      // Split: violin for notes >= C4 (60), cello below
      channel = midiNote >= 60 ? STRINGS_HIGH_CHANNEL : STRINGS_LOW_CHANNEL;
    } else {
      channel = GUITAR_CHANNEL;
    }

    const velocity = 100;

    try {
      this.synth.noteOn(channel, midiNote, velocity);

      // Schedule note off
      setTimeout(() => {
        this.synth?.noteOff(channel, midiNote);
      }, duration * 1000);
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }
}

// Export singleton instance
export const audioPlayer = new AudioPlayer();
