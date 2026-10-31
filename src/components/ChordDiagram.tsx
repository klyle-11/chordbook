import { useState } from 'react';
import type { Tuning } from '../lib/music/tunings';
import type { ChordVoicing } from '../types/chord';
import { getTuningStrings } from '../lib/music/tunings';
import { audioPlayer } from '../lib/audioPlayer';
import { getNoteAtFret } from '../lib/music/notes';
import { calculateChordFingering } from '../lib/music/fingering';

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
      <div className="text-center font-semibold text-sm mb-2 text-[var(--card-text)]">{chordName}</div>
      {startFret > 0 && (
        <div className="text-center text-xs text-[var(--card-text-secondary)] mb-1">
          {startFret === 1 ? '1st fret' : `${startFret}${getOrdinalSuffix(startFret)} fret`}
        </div>
      )}
      {capo && <div className="text-center text-xs text-[var(--accent)] font-semibold mb-1">Barre {capo}</div>}
      <div className="relative flex">
        <div className="flex flex-col justify-between text-xs text-[var(--card-text-secondary)] mr-2 h-24">
          {strings.map((s, i) => <span key={i} className="h-6 flex items-center">{s}</span>)}
        </div>
        <div className="relative flex">
          {[0, 1, 2, 3].map(offset => {
            const actualFret = startFret + offset;
            return (
              <div key={offset} className="flex flex-col justify-between w-6 border-r border-[var(--fret-divider)] h-24">
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
                        <div className="absolute left-1/2 h-px w-6 bg-[var(--fret-string)] transform -translate-x-1/2" />
                      )}
                      {typeof pos.fret === 'number' && pos.fret === actualFret && pos.fret > 0 && (
                        <div
                          className="relative z-10 w-4 h-4 bg-[var(--card-text)] rounded-full flex items-center justify-center"
                          title={note || ''}
                          style={note && leadNoteSet?.has(note) ? { boxShadow: '0 0 0 2px var(--lead)' } : undefined}
                        >
                          <span className="text-[var(--bg-card)] text-xs font-bold">
                            {isHovered && note ? note : pos.finger || ''}
                          </span>
                        </div>
                      )}
                      {pos.fret === 'x' && actualFret === startFret && (
                        <div className="relative z-10 text-[var(--danger)] text-sm font-bold">&times;</div>
                      )}
                      {pos.fret === 0 && actualFret === 0 && (
                        <div
                          className="relative z-10 w-4 h-4 border-2 border-[var(--card-text)] rounded-full bg-[var(--bg-card)] flex items-center justify-center"
                          title={note || ''}
                          style={note && leadNoteSet?.has(note) ? { boxShadow: '0 0 0 2px var(--lead)' } : undefined}
                        >
                          {isHovered && note && <span className="text-[var(--card-text)] text-xs font-bold leading-none">{note}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-0 left-10 flex text-xs text-[var(--card-text-muted)] mt-1">
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
