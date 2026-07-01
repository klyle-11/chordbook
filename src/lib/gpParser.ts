// ─── Guitar Pro File Parser ───
// Extracts track names, tunings, and note positions (string + fret → pitch).
// Supports GP4, GP5 (binary) and GP7 (ZIP+XML).

// ─── Types ───

export interface GPFileData {
  title: string;
  artist: string;
  album: string;
  bpm: number;
  timeSignature: { num: number; denom: number };
  tracks: GPTrack[];
  masterBars: GPMasterBar[];
}

export interface GPTrack {
  id: number;
  name: string;
  strings: number[];       // MIDI note numbers per string
  stringCount: number;
  isPercussion: boolean;
  capo: number;
}

export interface GPMasterBar {
  index: number;
  timeSignature: { num: number; denom: number };
  bars: GPBar[];
}

export interface GPBar {
  trackIndex: number;
  beats: GPBeat[];
}

export interface GPBeat {
  duration: string;
  notes: GPNote[];
  isRest: boolean;
}

export interface GPNote {
  string: number;
  fret: number;
  midi: number;
  pitchClass: string;
}

// ─── Helpers ───

const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
function midiToPitch(midi: number): string { return PITCH_NAMES[((midi % 12) + 12) % 12]; }

const DURATIONS = ['Whole', 'Half', 'Quarter', 'Eighth', '16th', '32nd', '64th'];

// ─── Format detection ───

export type GPFormat = 'gp4' | 'gp5' | 'gp7' | 'unsupported';

export function detectGPFormat(bytes: Uint8Array): GPFormat {
  if (bytes.length < 4) return 'unsupported';
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) return 'gp7';           // ZIP (PK)
  if (bytes[0] === 0x42 && bytes[1] === 0x43) return 'unsupported';   // BCFZ (GP6)
  const headerLen = bytes[0];
  if (headerLen > 0 && headerLen < 60) {
    const h = new TextDecoder('latin1').decode(bytes.slice(1, 1 + headerLen));
    if (h.includes('v5')) return 'gp5';
    if (h.includes('v4') || h.includes('v3')) return 'gp4';
  }
  return 'unsupported';
}

export async function parseGPFile(buffer: ArrayBuffer): Promise<GPFileData> {
  const fmt = detectGPFormat(new Uint8Array(buffer));
  if (fmt === 'gp7') return parseGP7(buffer);
  if (fmt === 'gp4' || fmt === 'gp5') return parseGP45(buffer, fmt);
  throw new Error('Unsupported format. GP4, GP5, and GP7 files are supported.');
}

// ═══════════════════════════════════════════════════════
// GP7 (ZIP + GPIF XML)
// ═══════════════════════════════════════════════════════

async function parseGP7(buffer: ArrayBuffer): Promise<GPFileData> {
  const xml = await extractGPIF(buffer);
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  const idx = (tag: string) => {
    const m = new Map<string, Element>();
    for (const el of doc.querySelectorAll(tag)) {
      const id = el.getAttribute('id');
      if (id) m.set(id, el);
    }
    return m;
  };

  const notesMap = idx('Note');
  const beatsMap = idx('Beat');
  const voicesMap = idx('Voice');
  const barsMap = idx('Bar');
  const rhythmsMap = idx('Rhythm');

  const txt = (sel: string) => doc.querySelector(sel)?.textContent?.trim() || '';

  // Tempo
  let bpm = 120;
  for (const a of doc.querySelectorAll('Automation')) {
    if (a.querySelector('Type')?.textContent === 'Tempo') {
      bpm = parseInt(a.querySelector('Value')?.textContent?.split(/\s/)[0] || '') || 120;
      break;
    }
  }

  // Tracks
  const tracks: GPTrack[] = [];
  for (const t of doc.querySelectorAll('Tracks > Track')) {
    const id = parseInt(t.getAttribute('id') || '0');
    const name = t.querySelector('Name')?.textContent?.trim() || `Track ${id + 1}`;
    const strings: number[] = [];
    for (const p of t.querySelectorAll('Staves Staff Properties Property')) {
      if (p.getAttribute('name') === 'Tuning') {
        const pitches = p.querySelector('Pitches')?.textContent?.trim();
        if (pitches) strings.push(...pitches.split(/\s+/).map(Number));
      }
    }
    const isPerc = (t.querySelector('InstrumentSet > Name')?.textContent || '').toLowerCase().includes('drum') ||
                   parseInt(t.querySelector('MidiConnection > PrimaryChannel')?.textContent || '0') === 9;
    tracks.push({ id, name, strings, stringCount: strings.length, isPercussion: isPerc, capo: 0 });
  }

  // MasterBars
  const masterBars: GPMasterBar[] = [];
  let ts = { num: 4, denom: 4 };
  let mbIdx = 0;

  for (const mb of doc.querySelectorAll('MasterBars > MasterBar')) {
    const timeStr = mb.querySelector('Time')?.textContent;
    if (timeStr) {
      const [n, d] = timeStr.split('/').map(Number);
      if (n && d) ts = { num: n, denom: d };
    }

    const barIds = (mb.querySelector('Bars')?.textContent?.trim() || '').split(/\s+/);
    const bars: GPBar[] = barIds.map((barId, trackIdx) => {
      const barEl = barsMap.get(barId);
      if (!barEl) return { trackIndex: trackIdx, beats: [] };

      const voiceIds = (barEl.querySelector('Voices')?.textContent?.trim() || '')
        .split(/\s+/).filter(v => v !== '-1');

      const beats: GPBeat[] = [];
      for (const vid of voiceIds) {
        const voiceEl = voicesMap.get(vid);
        if (!voiceEl) continue;
        for (const bid of (voiceEl.querySelector('Beats')?.textContent?.trim() || '').split(/\s+/)) {
          const beatEl = beatsMap.get(bid);
          if (!beatEl) continue;

          const rhythmId = beatEl.querySelector('Rhythm')?.getAttribute('ref') || '';
          const duration = rhythmsMap.get(rhythmId)?.querySelector('NoteValue')?.textContent || 'Quarter';
          const noteIds = (beatEl.querySelector('Notes')?.textContent?.trim() || '').split(/\s+/).filter(Boolean);

          const notes: GPNote[] = noteIds.map(nid => {
            const n = notesMap.get(nid);
            if (!n) return null;
            let fret = 0, str = 0, midi = 0, pitch = 'C';
            for (const p of n.querySelectorAll('Properties > Property')) {
              const pn = p.getAttribute('name');
              if (pn === 'Fret') fret = parseInt(p.querySelector('Fret')?.textContent || '0');
              else if (pn === 'String') str = parseInt(p.querySelector('String')?.textContent || '0');
              else if (pn === 'Midi') midi = parseInt(p.querySelector('Number')?.textContent || '0');
              else if (pn === 'ConcertPitch') {
                const step = p.querySelector('Pitch > Step')?.textContent || 'C';
                const acc = p.querySelector('Pitch > Accidental')?.textContent || '';
                pitch = step + (acc === '#' ? '#' : acc === 'b' ? 'b' : '');
              }
            }
            if (!midi && pitch) midi = 60; // fallback
            if (midi) pitch = midiToPitch(midi);
            return { string: str, fret, midi, pitchClass: pitch };
          }).filter((n): n is GPNote => n !== null);

          beats.push({ duration, notes, isRest: notes.length === 0 });
        }
      }
      return { trackIndex: trackIdx, beats };
    });

    masterBars.push({ index: mbIdx++, timeSignature: { ...ts }, bars });
  }

  return { title: txt('Score > Title'), artist: txt('Score > Artist'), album: txt('Score > Album'), bpm, timeSignature: ts, tracks, masterBars };
}

// ─── ZIP extractor (just for Content/score.gpif) ───

async function extractGPIF(buffer: ArrayBuffer): Promise<string> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('Not a valid ZIP');

  let pos = view.getUint32(eocd + 16, true);
  const n = view.getUint16(eocd + 10, true);

  for (let i = 0; i < n; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compSize = view.getUint32(pos + 20, true);
    const uncompSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOff = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + nameLen));

    if (name === 'Content/score.gpif') {
      const lNameLen = view.getUint16(localOff + 26, true);
      const lExtraLen = view.getUint16(localOff + 28, true);
      const dataStart = localOff + 30 + lNameLen + lExtraLen;
      const raw = bytes.slice(dataStart, dataStart + compSize);
      if (method === 0) return new TextDecoder('utf-8').decode(raw);
      if (method === 8) return new TextDecoder('utf-8').decode(await inflate(raw, uncompSize));
      throw new Error(`Unsupported compression: ${method}`);
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('score.gpif not found in ZIP');
}

async function inflate(data: Uint8Array, _size: number): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const w = ds.writable.getWriter();
  const rd = ds.readable.getReader();
  w.write(data); w.close();
  const chunks: Uint8Array[] = [];
  let len = 0;
  for (;;) { const { value, done } = await rd.read(); if (done) break; chunks.push(value); len += value.length; }
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

// ═══════════════════════════════════════════════════════
// GP4/GP5 Binary Parser
// ═══════════════════════════════════════════════════════

class R {
  private v: DataView;
  private b: Uint8Array;
  p: number;
  constructor(buf: ArrayBuffer) { this.v = new DataView(buf); this.b = new Uint8Array(buf); this.p = 0; }
  get len() { return this.b.length; }
  ok(n = 1) { return this.p + n <= this.len; }
  skip(n: number) { this.p += n; }
  u8() { return this.b[this.p++]; }
  i8() { const v = this.v.getInt8(this.p); this.p++; return v; }
  i16() { const v = this.v.getInt16(this.p, true); this.p += 2; return v; }
  i32() { const v = this.v.getInt32(this.p, true); this.p += 4; return v; }
  f64() { const v = this.v.getFloat64(this.p, true); this.p += 8; return v; }
  str(n: number) { const s = new TextDecoder('latin1').decode(this.b.slice(this.p, this.p + n)); this.p += n; return s; }
  // 4-byte int len + raw chars
  intStr() { const n = this.i32(); if (n <= 0 || n > 10000) return ''; return this.str(n); }
  // 1-byte len + fixed buffer
  fixStr(buf: number) { const n = this.u8(); const s = this.str(Math.min(n, buf)); if (n < buf) this.p += buf - n; return s; }
  // GP-string: int(strLen+1), byte(strLen), strLen chars
  gpStr() { const total = this.i32(); if (total <= 0) return ''; const n = this.u8(); return this.str(n); }
}

function parseGP45(buffer: ArrayBuffer, fmt: 'gp4' | 'gp5'): GPFileData {
  const r = new R(buffer);
  const gp5 = fmt === 'gp5';

  // Header (31 bytes: 1 len + up to 30 chars, zero-padded)
  const hLen = r.u8(); r.str(hLen); r.skip(30 - hLen);

  // Song info (GP-strings)
  const title = r.gpStr(); r.gpStr(); // subtitle
  const artist = r.gpStr();
  const album = r.gpStr();
  r.gpStr(); r.gpStr(); r.gpStr(); r.gpStr(); // words, music, copyright, tab

  // Notices
  const nc = r.i32();
  for (let i = 0; i < nc; i++) r.gpStr();

  // Triplet feel
  r.u8();

  // Lyrics (both GP4 and GP5)
  r.i32(); // lyric track
  for (let i = 0; i < 5; i++) { r.i32(); r.intStr(); }

  // Tempo, key, octave
  const bpm = r.i32();
  r.i32(); // key
  r.u8();  // octave

  // MIDI channels (64 × 12 bytes) — skip all
  r.skip(64 * 12);

  const numMeasures = r.i32();
  const numTracks = r.i32();

  // ── Measure headers ──
  const mHeaders: { num: number; denom: number }[] = [];
  let tNum = 4, tDen = 4;

  for (let i = 0; i < numMeasures; i++) {
    const f = r.u8();
    if (f & 0x01) tNum = r.u8();
    if (f & 0x02) tDen = r.u8();
    if (f & 0x08) r.u8();       // repeat close
    if (f & 0x10) r.u8();       // alt ending
    if (f & 0x20) { r.gpStr(); r.skip(4); } // marker + color
    if (f & 0x40) { r.i8(); r.u8(); }       // key change
    if (gp5 && (f & 0x03)) r.skip(4);       // beam values
    if (gp5 && (f & 0x80)) r.u8();          // triplet feel
    mHeaders.push({ num: tNum, denom: tDen });
  }

  // ── Track definitions (98 bytes each) ──
  const tracks: GPTrack[] = [];
  for (let t = 0; t < numTracks; t++) {
    const flags = r.u8();
    const name = r.fixStr(40);
    const strCount = r.i32();
    const strings: number[] = [];
    for (let s = 0; s < 7; s++) { const v = r.i32(); if (s < strCount) strings.push(v); }
    r.i32(); // port
    r.i32(); // channel
    r.i32(); // channel effects
    r.i32(); // frets
    const capo = r.i32();
    r.skip(4); // RGBA color
    if (gp5) r.skip(44); // GP5 extra

    tracks.push({
      id: t, name: name.trim(), strings, stringCount: strCount,
      isPercussion: !!(flags & 0x01), capo,
    });
  }

  // ── Beat data (measures × tracks) ──
  const masterBars: GPMasterBar[] = [];
  for (let m = 0; m < numMeasures; m++) {
    const bars: GPBar[] = [];
    for (let t = 0; t < numTracks; t++) {
      bars.push({ trackIndex: t, beats: readMeasure(r, tracks[t], gp5) });
    }
    masterBars.push({ index: m, timeSignature: mHeaders[m], bars });
  }

  return { title, artist, album, bpm, timeSignature: { num: tNum, denom: tDen }, tracks, masterBars };
}

// ─── Beat/Note readers ───

function readMeasure(r: R, track: GPTrack, gp5: boolean): GPBeat[] {
  const beats: GPBeat[] = [];
  const voices = gp5 ? 2 : 1;
  for (let v = 0; v < voices; v++) {
    const n = r.i32();
    for (let b = 0; b < n; b++) {
      const beat = readBeat(r, track, gp5);
      if (v === 0) beats.push(beat);
    }
  }
  return beats;
}

function readBeat(r: R, track: GPTrack, gp5: boolean): GPBeat {
  const f = r.u8();
  if (f & 0x40) r.u8(); // rest type

  const durVal = r.i8();
  const dur = DURATIONS[Math.max(0, Math.min(durVal + 2, 6))] || 'Quarter';
  if (f & 0x20) r.i32(); // tuplet

  if (f & 0x02) skipChordDiagram(r);
  if (f & 0x04) r.gpStr(); // text
  if (f & 0x08) skipBeatEffects(r, gp5);
  if (f & 0x10) skipMixChange(r, gp5);

  const strFlags = r.u8();
  const notes: GPNote[] = [];
  for (let s = 6; s >= 0; s--) {
    if (strFlags & (1 << s)) {
      const note = readNote(r, track, 6 - s, gp5);
      if (note) notes.push(note);
    }
  }

  if (gp5) { const ef = r.u8(); if (ef & 0x08) r.u8(); }

  return { duration: dur, notes, isRest: !!(f & 0x40) };
}

function readNote(r: R, track: GPTrack, strIdx: number, gp5: boolean): GPNote | null {
  const f = r.u8();
  if (gp5 && (f & 0x02)) r.u8(); // accent
  if (f & 0x20) r.u8();           // note type
  if (f & 0x01) { r.u8(); r.u8(); } // duration override
  if (f & 0x10) r.i8();           // velocity
  const fret = (f & 0x20) ? r.i8() : 0;
  if (f & 0x80) { r.u8(); r.u8(); } // fingering
  if (gp5 && (f & 0x01)) r.f64();   // time percent
  if (gp5) r.u8();                   // swap accidentals
  if (f & 0x04) skipNoteEffects(r, gp5);

  const tuning = track.strings[strIdx];
  if (tuning === undefined || fret < 0) return null;
  const midi = tuning + fret;
  return { string: strIdx, fret, midi, pitchClass: midiToPitch(midi) };
}

// ─── Skip helpers (advance past data we don't need) ───

function skipChordDiagram(r: R): void {
  const fmt = r.u8();
  if (fmt === 0) {
    r.gpStr(); r.i32();
    if (r.i32() > 0) r.skip(24);
  } else {
    r.skip(16); r.fixStr(20); r.skip(4);
    r.skip(16); // 5th, 9th, 11th, baseFret
    r.skip(28); // 7 frets
    r.u8();     // barres
    r.skip(15); // barre data
    r.skip(8); r.u8();
  }
}

function skipBeatEffects(r: R, gp5: boolean): void {
  const f1 = r.u8();
  const f2 = gp5 ? r.u8() : 0;
  if (f1 & 0x20) { if (gp5) r.u8(); else r.i32(); }
  if (f2 & 0x04) skipBend(r);
  if (f1 & 0x40) { r.u8(); r.u8(); }
  if (f2 & 0x02) r.u8();
}

function skipMixChange(r: R, gp5: boolean): void {
  r.i8(); // instrument
  if (gp5) r.skip(16);
  const vol = r.i8(), pan = r.i8(), cho = r.i8(), rev = r.i8(), pha = r.i8(), tre = r.i8();
  if (gp5) r.gpStr();
  const tempo = r.i32();
  if (vol >= 0) r.u8();
  if (pan >= 0) r.u8();
  if (cho >= 0) r.u8();
  if (rev >= 0) r.u8();
  if (pha >= 0) r.u8();
  if (tre >= 0) r.u8();
  if (tempo >= 0) { r.u8(); if (gp5) r.u8(); }
  if (gp5) r.u8();
}

function skipNoteEffects(r: R, gp5: boolean): void {
  const f1 = r.u8();
  const f2 = gp5 ? r.u8() : 0;
  if (f1 & 0x01) skipBend(r);
  if (f1 & 0x10) r.skip(4); // grace note
  if (f2 & 0x04) r.u8();    // tremolo picking
  if (f2 & 0x08) r.u8();    // slide
  if (f2 & 0x10) { const t = r.u8(); if (gp5 && t === 2) r.skip(3); else if (gp5 && t === 3) r.u8(); }
  if (f2 & 0x20) r.skip(2); // trill
}

function skipBend(r: R): void {
  r.u8(); r.i32();
  const n = r.i32();
  r.skip(n * 9); // 4+4+1 per point
}
