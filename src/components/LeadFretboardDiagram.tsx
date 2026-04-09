import { useState, useRef, useCallback } from 'react';
import { getFretPositions } from '../lib/fretPositions';
import { type Tuning, getTuningStrings, type CapoSettings, isFretAvailable, applyCapo } from '../lib/tunings';
import { audioPlayer } from '../lib/audioPlayer';
import type { LeadNote } from '../types/lead';

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteAtFret(openNote: string, fret: number): string {
  const idx = CHROMATIC.indexOf(openNote);
  if (idx === -1) return '?';
  return CHROMATIC[(idx + fret) % 12];
}

interface FlyoutState {
  stringIndex: number;
  fret: number;
  note: string;
  x: number;
  y: number;
}

interface LeadFretboardDiagramProps {
  tuning: Tuning;
  capoSettings: CapoSettings;
  currentLeadNotes: LeadNote[];
  onAddNote: (note: string, stringIndex: number, fret: number) => void;
}

export default function LeadFretboardDiagram({ tuning, capoSettings, currentLeadNotes, onAddNote }: LeadFretboardDiagramProps) {
  const effectiveTuning = capoSettings.enabled && capoSettings.fret > 0
    ? applyCapo(tuning, capoSettings.fret)
    : tuning;
  const strings = getTuningStrings(effectiveTuning);
  const fretPositions = getFretPositions();
  const [flyout, setFlyout] = useState<FlyoutState | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const maxFret = 15; // Show first 15 frets for lead building

  const handlePointerDown = useCallback((stringIndex: number, fret: number, note: string, e: React.PointerEvent) => {
    didLongPressRef.current = false;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    pressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      setFlyout({ stringIndex, fret, note, x: rect.left + rect.width / 2, y: rect.top });
    }, 300);
  }, []);

  const handlePointerUp = useCallback((stringIndex: number, fret: number, note: string) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!didLongPressRef.current) {
      audioPlayer.playNote(note, 0.8, strings[stringIndex], fret, stringIndex, tuning);
    }
  }, [strings, tuning]);

  const handlePointerLeave = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handleConfirmAdd = useCallback(() => {
    if (flyout) {
      onAddNote(flyout.note, flyout.stringIndex, flyout.fret);
      audioPlayer.playNote(flyout.note, 0.5, strings[flyout.stringIndex], flyout.fret, flyout.stringIndex, tuning);
      setFlyout(null);
    }
  }, [flyout, onAddNote, strings, tuning]);

  const isNoteInLead = (stringIndex: number, fret: number): boolean => {
    return currentLeadNotes.some(n => n.stringIndex === stringIndex && n.fret === fret);
  };

  return (
    <>
      <div className="p-2 sm:p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          Click to hear, hold to add note
        </div>
        <div className="space-y-0.5">
          {strings.map((stringRoot, stringIndex) => (
            <div key={stringIndex} className="flex items-center">
              <div className="w-6 sm:w-8 text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {stringRoot}
              </div>
              <div className="relative flex-1 h-5 sm:h-6 mx-1 sm:mx-2 flex items-center">
                {/* String line */}
                <div className="absolute left-0 right-0 h-px top-1/2 transform -translate-y-1/2" style={{ background: 'var(--fret-string)' }} />

                {/* Fret position lines */}
                {fretPositions.slice(0, maxFret + 1).map((position, fret) => (
                  <div
                    key={fret}
                    className="absolute top-0 bottom-0 w-px"
                    style={{
                      left: `${(position / fretPositions[maxFret]) * 100}%`,
                      background: capoSettings.enabled && fret === capoSettings.fret
                        ? 'var(--glow)'
                        : !isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0)
                        ? 'var(--fret-divider-muted)'
                        : 'var(--fret-divider)',
                    }}
                  />
                ))}

                {/* Clickable fret zones */}
                {Array.from({ length: maxFret + 1 }, (_, fret) => {
                  if (!isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0)) return null;
                  const note = getNoteAtFret(stringRoot, fret);
                  const inLead = isNoteInLead(stringIndex, fret);
                  const centerPos = fret === 0
                    ? 0
                    : ((fretPositions[fret - 1] + fretPositions[fret]) / 2 / fretPositions[maxFret]) * 100;

                  return (
                    <div
                      key={fret}
                      className="absolute w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold cursor-pointer z-10 transition-all hover:scale-110 select-none"
                      style={{
                        left: `${centerPos}%`,
                        transform: 'translateX(-50%) translateY(-50%)',
                        top: '50%',
                        background: inLead ? 'var(--lead)' : fret === 0 ? 'var(--fret-marker-open)' : 'var(--fret-marker)',
                        border: `2px solid ${inLead ? 'var(--lead)' : fret === 0 ? 'var(--fret-marker-open-border)' : 'var(--fret-marker-border)'}`,
                        color: '#000',
                        boxShadow: inLead ? '0 0 0 2px var(--lead-subtle)' : undefined,
                      }}
                      title={`${note} (fret ${fret}) — hold to add`}
                      onPointerDown={(e) => handlePointerDown(stringIndex, fret, note, e)}
                      onPointerUp={() => handlePointerUp(stringIndex, fret, note)}
                      onPointerLeave={handlePointerLeave}
                    >
                      {note}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Fret number labels */}
        <div className="flex items-center mt-2">
          <div className="w-6 sm:w-8" />
          <div className="relative flex-1 mx-1 sm:mx-2 h-4">
            {Array.from({ length: maxFret + 1 }, (_, fret) => {
              const position = fretPositions[fret];
              const labelPos = fret === 0
                ? 0
                : ((fretPositions[fret - 1] + position) / 2 / fretPositions[maxFret]) * 100;
              return (
                <div
                  key={fret}
                  className="absolute text-xs transform -translate-x-1/2"
                  style={{
                    left: `${labelPos}%`,
                    color: !isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0)
                      ? 'var(--text-muted)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {fret}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flyout confirmation */}
      {flyout && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFlyout(null)} />
          <div
            className="fixed z-50 rounded-lg shadow-lg p-3 flex flex-col items-center gap-2 animate-[fadeIn_0.12s_ease-out]"
            style={{
              left: flyout.x,
              top: flyout.y - 8,
              transform: 'translate(-50%, -100%)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              minWidth: 120,
            }}
          >
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {flyout.note}
              <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                fret {flyout.fret}, string {flyout.stringIndex + 1}
              </span>
            </div>
            <button
              className="px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{
                background: 'var(--lead)',
                color: '#000',
              }}
              onClick={handleConfirmAdd}
            >
              Add to lead
            </button>
          </div>
        </>
      )}
    </>
  );
}
