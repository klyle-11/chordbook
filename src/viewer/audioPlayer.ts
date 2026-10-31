import type { Tuning } from '../lib/music/tunings';
import { pitchClass } from '../lib/music/notes';
import type { audioPlayer as realAudioPlayer, InstrumentId, InstrumentOption, StrumMode } from '../lib/audioPlayer';

/**
 * Stand-in for lib/audioPlayer in the exported song viewer (swapped in by vite.viewer.config.ts).
 * The app's SoundFont is far too big to embed in a file, so sound is synthesized here:
 * a plucked string (Karplus–Strong) for nylon guitar and a filtered saw pair for strings.
 */
export type { InstrumentId, InstrumentOption, StrumMode };

export const INSTRUMENTS: InstrumentOption[] = [
  { id: 'nylon-guitar', name: 'Nylon Guitar', program: 24 },
  { id: 'strings', name: 'Strings', program: 40 },
];

// Output level at full volume, before the limiter
const MASTER_GAIN = 2;
const PLUCK_LEVEL = 0.3;
const STRINGS_LEVEL = 0.1;

function midiFromNote(note: string, octave: number): number {
  const pc = pitchClass(note);
  return pc === -1 ? 69 : 12 * (octave + 1) + pc; // A4 fallback
}

function midiFromNoteName(noteName: string): number {
  const octave = noteName.match(/(\d+)$/);
  return midiFromNote(noteName, octave ? parseInt(octave[1], 10) : 4);
}

const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface Pluck {
  buffer: AudioBuffer;
  /** playbackRate that brings the rendered string exactly to pitch */
  rate: number;
}

/**
 * Render one plucked string. The string is a delay line fed back through a two-point
 * average, which damps high harmonics first, as a real string does. The excitation is
 * low-passed noise, so the attack is soft (fingers on nylon rather than a pick on steel).
 */
export function renderPluck(ctx: BaseAudioContext, midi: number): Pluck {
  const sampleRate = ctx.sampleRate;
  const frequency = midiToFrequency(midi);
  // The averaging filter adds half a sample, so the loop is N + 0.5 samples long
  const N = Math.max(2, Math.floor(sampleRate / frequency - 0.5));
  const loopFrequency = sampleRate / (N + 0.5);

  // Low strings ring longer than high ones
  const t60 = Math.min(3.5, Math.max(1.2, 3.5 - (midi - 40) * 0.055));
  const feedback = 10 ** (-3 / (t60 * loopFrequency));
  const length = Math.floor(Math.min(t60, 2.6) * sampleRate);
  const data = new Float32Array(length);

  // Excitation: noise, low-passed twice, brighter for higher notes
  const cutoff = Math.min(3800, 900 + frequency * 3);
  const a = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
  const excitation = new Float32Array(N);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < N * 2; i++) {
    lp1 += a * (Math.random() * 2 - 1 - lp1);
    lp2 += a * (lp1 - lp2);
    // The first pass only settles the filters
    if (i >= N) excitation[i - N] = lp2;
  }
  // Pluck position (about a fifth of the way along the string) hollows out the tone.
  // The difference also sums to zero, so no constant offset circulates in the loop.
  const pluckOffset = Math.max(1, Math.round(N * 0.18));
  for (let i = 0; i < N; i++) {
    data[i] = excitation[i] - excitation[(i + N - pluckOffset) % N];
  }

  for (let i = N; i < length; i++) {
    data[i] = feedback * 0.5 * (data[i - N] + (data[i - N - 1] ?? 0));
  }

  // Normalize, then fade the edges so nothing clicks
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const fadeIn = Math.floor(sampleRate * 0.002);
  const fadeOut = Math.floor(sampleRate * 0.05);
  for (let i = 0; i < length; i++) {
    const edge = Math.min(1, i / fadeIn, (length - 1 - i) / fadeOut);
    data[i] = peak > 0 ? (data[i] / peak) * edge : 0;
  }

  const buffer = ctx.createBuffer(1, length, sampleRate);
  buffer.getChannelData(0).set(data);
  return { buffer, rate: frequency / loopFrequency };
}

class ViewerAudioPlayer {
  private audioContext: AudioContext | null = null;
  private output: GainNode | null = null;
  private volume: number = 0.5;
  private currentInstrument: InstrumentId = 'nylon-guitar';
  private strumMode: StrumMode = 'strum';
  private plucks = new Map<number, Pluck>();

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.output) {
      this.output.gain.value = this.volume * MASTER_GAIN;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setInstrument(id: InstrumentId): void {
    this.currentInstrument = id;
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

  /** Voices → volume → gentle top-end roll-off → limiter (a six-string chord must not clip) */
  private ensureOutput(): { ctx: AudioContext; output: GainNode } {
    if (!this.audioContext || !this.output) {
      // @ts-expect-error - WebKit audio context fallback
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx: AudioContext = new AudioContextClass();
      const output = ctx.createGain();
      output.gain.value = this.volume * MASTER_GAIN;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 5000;
      tone.Q.value = 0.5;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.knee.value = 12;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.25;
      output.connect(tone);
      tone.connect(limiter);
      limiter.connect(ctx.destination);
      this.audioContext = ctx;
      this.output = output;
    }
    return { ctx: this.audioContext, output: this.output };
  }

  private playPluck(ctx: AudioContext, output: GainNode, midi: number, duration: number): void {
    let pluck = this.plucks.get(midi);
    if (!pluck) {
      pluck = renderPluck(ctx, midi);
      this.plucks.set(midi, pluck);
    }
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = pluck.buffer;
    source.playbackRate.value = pluck.rate;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(PLUCK_LEVEL, now);
    // Damp the string when the note ends, as a note-off would
    gain.gain.setTargetAtTime(0, now + duration, 0.08);
    source.connect(gain);
    gain.connect(output);
    source.start(now);
    source.stop(now + duration + 0.6);
  }

  private playStrings(ctx: AudioContext, output: GainNode, midi: number, duration: number): void {
    const now = ctx.currentTime;
    const end = now + duration;
    const frequency = midiToFrequency(midi);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(3200, 500 + frequency * 2.5);
    filter.Q.value = 0.7;

    // Slow bow attack and a soft release
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(STRINGS_LEVEL, now + 0.09);
    gain.gain.setTargetAtTime(0, end, 0.12);

    // Vibrato that eases in after the attack
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.setValueAtTime(0, now);
    vibratoDepth.gain.linearRampToValueAtTime(5, now + 0.5); // cents
    vibrato.connect(vibratoDepth);

    // Two slightly detuned saws read as a section rather than a single buzzy voice
    const oscillators = [-6, 6].map(detune => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      vibratoDepth.connect(osc.detune);
      osc.connect(filter);
      return osc;
    });

    filter.connect(gain);
    gain.connect(output);
    for (const node of [...oscillators, vibrato]) {
      node.start(now);
      node.stop(end + 0.9);
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

    const { ctx, output } = this.ensureOutput();

    // Resume audio context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Calculate MIDI note number
    let midiNote: number;
    const stringTuning = guitarString && fret !== undefined && stringIndex !== undefined ? tuning?.strings[stringIndex] : undefined;
    if (stringTuning && fret !== undefined) {
      midiNote = midiFromNote(stringTuning.note, stringTuning.octave) + fret;
    } else {
      midiNote = midiFromNoteName(note);
    }
    midiNote = Math.max(24, Math.min(108, midiNote));

    try {
      if (this.currentInstrument === 'strings') {
        this.playStrings(ctx, output, midiNote, duration);
      } else {
        this.playPluck(ctx, output, midiNote, duration);
      }
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }
}

type PublicAudioPlayer = Pick<typeof realAudioPlayer,
  'setVolume' | 'getVolume' | 'setInstrument' | 'getInstrument' | 'setStrumMode' | 'getStrumMode' | 'getStrumDelay' | 'playNote'>;

// Export singleton instance
export const audioPlayer: PublicAudioPlayer = new ViewerAudioPlayer();
