import { useState } from 'react';
import { Chord } from '@tonaljs/tonal';
import type { Tuning } from '../lib/tunings';
import type { ChordVoicing } from '../types/chord';
import { getTuningStrings, getTuningData } from '../lib/tunings';
import { audioPlayer } from '../lib/audioPlayer';

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteAtFret(openNote: string, fret: number): string {
  const idx = CHROMATIC.indexOf(openNote);
  if (idx === -1) return '?';
  return CHROMATIC[(idx + fret) % 12];
}

interface ChordDiagramProps {
  chordName: string;
  tuning: Tuning;
  voicing?: ChordVoicing;
  onRequestVoicingEditor?: () => void;
  activeLeadNotes?: string[];
}

// ─── TAB rendering (when voicing exists) ───

function TabView({ voicing, tuning, chordName, activeLeadNotes }: { voicing: ChordVoicing; tuning: Tuning; chordName: string; activeLeadNotes?: string[] }) {
  const strings = tuning.displayStrings;
  const [hoveredString, setHoveredString] = useState<number | null>(null);
  const leadNoteSet = activeLeadNotes ? new Set(activeLeadNotes) : null;

  return (
    <div className="tab-box">
      <div className="tab-box__title">{chordName}</div>
      <div className="tab-box__body">
        <div className="tab-box__gutter">
          <span>T</span><span>A</span><span>B</span>
        </div>
        <div className="tab-box__strings">
          {strings.map((name, i) => {
            const fret = voicing.frets[i];
            const isMuted = fret === null;
            const note = !isMuted && fret !== undefined ? getNoteAtFret(name, fret) : null;
            const isInLead = note && leadNoteSet?.has(note);
            return (
              <div
                key={i}
                className="tab-box__row"
                onMouseEnter={() => setHoveredString(i)}
                onMouseLeave={() => setHoveredString(null)}
              >
                <span className="tab-box__string-label">{name}</span>
                <div className="tab-box__line" style={{ position: 'relative' }}>
                  <span
                    className={`tab-box__fret ${isMuted ? 'tab-box__fret--muted' : ''}`}
                    style={isInLead ? { boxShadow: '0 0 0 2px var(--lead)', borderRadius: '3px' } : undefined}
                  >
                    {hoveredString === i && note ? note : isMuted ? 'X' : fret}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Dot-style rendering (computed fingering) ───

interface ChordPosition {
  fret: number | 'x';
  finger?: number;
}

function getKnownChordPattern(chordName: string): { positions: ChordPosition[]; startFret: number; capo?: number } | null {
  const knownPatterns: Record<string, { positions: ChordPosition[]; startFret: number; capo?: number }> = {
    'C6': { positions: [{ fret: 0 }, { fret: 1, finger: 1 }, { fret: 2, finger: 2 }, { fret: 2, finger: 3 }, { fret: 3, finger: 4 }, { fret: 'x' }], startFret: 0 },
    'Cmaj7': { positions: [{ fret: 0 }, { fret: 0 }, { fret: 0 }, { fret: 2, finger: 2 }, { fret: 3, finger: 3 }, { fret: 'x' }], startFret: 0 },
    'Amaj7': { positions: [{ fret: 0 }, { fret: 2, finger: 2 }, { fret: 1, finger: 1 }, { fret: 2, finger: 3 }, { fret: 0 }, { fret: 'x' }], startFret: 0 },
    'Dmaj7': { positions: [{ fret: 2, finger: 1 }, { fret: 2, finger: 2 }, { fret: 2, finger: 3 }, { fret: 0 }, { fret: 'x' }, { fret: 'x' }], startFret: 0 },
    'Emaj7': { positions: [{ fret: 0 }, { fret: 0 }, { fret: 1, finger: 1 }, { fret: 1, finger: 2 }, { fret: 2, finger: 3 }, { fret: 0 }], startFret: 0 },
    'Gmaj7': { positions: [{ fret: 2, finger: 1 }, { fret: 0 }, { fret: 0 }, { fret: 0 }, { fret: 'x' }, { fret: 3, finger: 2 }], startFret: 0 },
    'Am6': { positions: [{ fret: 0 }, { fret: 1, finger: 1 }, { fret: 2, finger: 3 }, { fret: 2, finger: 2 }, { fret: 0 }, { fret: 'x' }], startFret: 0 },
    'Dm6': { positions: [{ fret: 1, finger: 1 }, { fret: 0 }, { fret: 2, finger: 2 }, { fret: 0 }, { fret: 'x' }, { fret: 'x' }], startFret: 0 },
  };
  return knownPatterns[chordName] || null;
}

function assignFingerNumbers(positions: ChordPosition[]): ChordPosition[] {
  const result = [...positions];
  const fretted = result
    .map((pos, index) => ({ ...pos, stringIndex: index }))
    .filter(pos => typeof pos.fret === 'number' && pos.fret > 0);
  fretted.sort((a, b) => (a.fret as number) - (b.fret as number));

  const fretGroups = new Map<number, typeof fretted>();
  fretted.forEach(pos => {
    const f = pos.fret as number;
    if (!fretGroups.has(f)) fretGroups.set(f, []);
    fretGroups.get(f)!.push(pos);
  });

  let finger = 1;
  for (const [, group] of Array.from(fretGroups.entries()).sort((a, b) => a[0] - b[0])) {
    if (group.length >= 3) {
      group.forEach(pos => { result[pos.stringIndex].finger = finger; });
    } else {
      group.forEach(pos => { result[pos.stringIndex].finger = finger; finger = Math.min(finger + 1, 4); });
      continue;
    }
    finger = Math.min(finger + 1, 4);
  }
  return result;
}

export function calculateChordFingering(chordName: string, tuning: Tuning): { positions: ChordPosition[]; startFret: number; capo?: number } | null {
  const chord = Chord.get(chordName);
  if (!chord.notes || chord.notes.length === 0) return null;

  if (tuning.id === 'standard') {
    const known = getKnownChordPattern(chordName);
    if (known) return known;
  }

  const tuningData = getTuningData(tuning);
  const chordNotes = chord.notes;
  const noteToSemitone: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };

  const getNoteSemitones = (name: string) => {
    const base = noteToSemitone[name];
    return base === undefined ? [] : [base, base + 12, base + 24, base + 36];
  };

  const stringBases = tuningData.map(s => noteToSemitone[s.note] + s.octave * 12);

  for (const startFret of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const positions: ChordPosition[] = [];
    let toneCount = 0;

    for (let si = 0; si < stringBases.length; si++) {
      let bestFret: number | 'x' = 'x';
      let found = false;

      for (let f = startFret; f <= startFret + 3; f++) {
        const semitone = stringBases[si] + f;
        if (chordNotes.some(cn => getNoteSemitones(cn).some(s => s % 12 === semitone % 12))) {
          bestFret = f; found = true; toneCount++; break;
        }
      }

      if (!found && startFret === 0) {
        const open = stringBases[si];
        if (chordNotes.some(cn => getNoteSemitones(cn).some(s => s % 12 === open % 12))) {
          bestFret = 0; toneCount++;
        }
      }
      positions.push({ fret: bestFret });
    }

    const active = positions.filter(p => p.fret !== 'x').length;
    if (toneCount >= Math.min(3, chordNotes.length) && active >= 3) {
      const withFingers = assignFingerNumbers(positions);
      const fretted = withFingers.filter(p => typeof p.fret === 'number' && (p.fret as number) > 0);
      const uniqueFrets = [...new Set(fretted.map(p => p.fret))];
      const capo = uniqueFrets.length === 1 && uniqueFrets[0] === startFret && fretted.length >= 4 ? startFret : undefined;
      return { positions: withFingers, startFret, capo };
    }
  }
  return null;
}

function getOrdinalSuffix(n: number): string {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

function DotView({ chordName, tuning, activeLeadNotes }: { chordName: string; tuning: Tuning; activeLeadNotes?: string[] }) {
  const shape = calculateChordFingering(chordName, tuning);
  const [hoveredString, setHoveredString] = useState<number | null>(null);
  if (!shape) return null;

  const { positions, startFret, capo } = shape;
  const strings = getTuningStrings(tuning);
  const leadNoteSet = activeLeadNotes ? new Set(activeLeadNotes) : null;

  return (
    <>
      <div className="text-center font-semibold text-sm mb-2">{chordName}</div>
      {startFret > 0 && (
        <div className="text-center text-xs text-gray-600 mb-1">
          {startFret === 1 ? '1st fret' : `${startFret}${getOrdinalSuffix(startFret)} fret`}
        </div>
      )}
      {capo && <div className="text-center text-xs text-orange-600 font-semibold mb-1">Capo {capo}</div>}
      <div className="relative flex">
        <div className="flex flex-col justify-between text-xs text-gray-600 mr-2 h-24">
          {strings.map((s, i) => <span key={i} className="h-6 flex items-center">{s}</span>)}
        </div>
        <div className="relative flex">
          {[0, 1, 2, 3].map(offset => {
            const actualFret = startFret + offset;
            return (
              <div key={offset} className="flex flex-col justify-between w-6 border-r border-gray-400 h-24">
                {positions.map((pos, si) => {
                  const isActive = typeof pos.fret === 'number';
                  const note = isActive ? getNoteAtFret(strings[si], pos.fret as number) : null;
                  const isHovered = hoveredString === si;

                  return (
                    <div
                      key={si}
                      className="relative h-6 flex items-center justify-center"
                      onMouseEnter={() => isActive && setHoveredString(si)}
                      onMouseLeave={() => setHoveredString(null)}
                    >
                      {!(pos.fret === 0 && actualFret === 0) && (
                        <div className="absolute left-1/2 h-px w-6 bg-gray-400 transform -translate-x-1/2" />
                      )}
                      {typeof pos.fret === 'number' && pos.fret === actualFret && pos.fret > 0 && (
                        <div
                          className="relative z-10 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center"
                          title={note || ''}
                          style={note && leadNoteSet?.has(note) ? { boxShadow: '0 0 0 2px var(--lead)' } : undefined}
                        >
                          <span className="text-white text-xs font-bold">
                            {isHovered && note ? note : pos.finger || ''}
                          </span>
                        </div>
                      )}
                      {pos.fret === 'x' && actualFret === startFret && (
                        <div className="relative z-10 text-red-600 text-sm font-bold">&times;</div>
                      )}
                      {pos.fret === 0 && actualFret === 0 && (
                        <div
                          className="relative z-10 w-4 h-4 border-2 border-gray-800 rounded-full bg-white flex items-center justify-center"
                          title={note || ''}
                          style={note && leadNoteSet?.has(note) ? { boxShadow: '0 0 0 2px var(--lead)' } : undefined}
                        >
                          {isHovered && note && <span className="text-gray-800 text-xs font-bold leading-none">{note}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-0 left-10 flex text-xs text-gray-500 mt-1">
          {[1, 2, 3].map(o => <span key={o} className="w-6 text-center">{startFret + o}</span>)}
        </div>
      </div>
    </>
  );
}

// ─── Play chord (strum all notes low-to-high) ───

function playChordFromFrets(frets: (number | 'x' | null)[], tuning: Tuning) {
  const strings = getTuningStrings(tuning);
  const strumDelay = audioPlayer.getStrumDelay();

  // Strum from lowest string (last index) to highest (first index)
  const entries: { stringIndex: number; fret: number }[] = [];
  for (let i = frets.length - 1; i >= 0; i--) {
    const f = frets[i];
    if (f !== null && f !== 'x' && typeof f === 'number') {
      entries.push({ stringIndex: i, fret: f });
    }
  }

  entries.forEach(({ stringIndex, fret }, i) => {
    const note = getNoteAtFret(strings[stringIndex], fret);
    setTimeout(() => {
      audioPlayer.playNote(note, 1.5, strings[stringIndex], fret, stringIndex, tuning);
    }, i * strumDelay);
  });
}

function PlayButton({ onClick }: { onClick: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    onClick();
    setTimeout(() => setIsPlaying(false), 400);
  };

  return (
    <button
      onClick={handleClick}
      title="Play chord"
      className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full transition-all opacity-50 hover:opacity-100"
      style={{
        background: isPlaying ? 'var(--accent)' : 'var(--bg-card)',
        color: isPlaying ? '#fff' : 'var(--text-muted)',
        border: '1px solid var(--border)',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {isPlaying ? (
          <>
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        ) : (
          <>
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </>
        )}
      </svg>
    </button>
  );
}

// ─── Public component ───

export function ChordDiagram({ chordName, tuning, voicing, onRequestVoicingEditor, activeLeadNotes }: ChordDiagramProps) {
  // TAB view when voicing exists for this tuning
  if (voicing && voicing.tuningId === tuning.id) {
    return (
      <div className="relative rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <PlayButton onClick={() => playChordFromFrets(voicing.frets, tuning)} />
        <TabView voicing={voicing} tuning={tuning} chordName={chordName} activeLeadNotes={activeLeadNotes} />
      </div>
    );
  }

  // Dot view when a computed fingering is available
  const fingering = calculateChordFingering(chordName, tuning);
  if (fingering) {
    const dotFrets = fingering.positions.map(p => p.fret);
    return (
      <div className="relative rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <PlayButton onClick={() => playChordFromFrets(dotFrets, tuning)} />
        <DotView chordName={chordName} tuning={tuning} activeLeadNotes={activeLeadNotes} />
      </div>
    );
  }

  // No diagram — offer to open voicing editor
  return (
    <div
      className="rounded-lg p-3 flex flex-col items-center justify-center min-h-[100px] transition-colors group"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        cursor: onRequestVoicingEditor ? 'pointer' : 'default',
      }}
      onClick={onRequestVoicingEditor}
      title="Click to create a voicing"
    >
      <div className="text-center font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{chordName}</div>
      <div className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}>
        {onRequestVoicingEditor ? 'Click to add voicing' : 'No diagram available'}
      </div>
    </div>
  );
}
