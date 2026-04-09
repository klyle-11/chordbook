import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import type { Chord, ChordVoicing } from '../types/chord';
import type { Tuning, CapoSettings } from '../lib/tunings';
import { getTuningStrings } from '../lib/tunings';
import { audioPlayer } from '../lib/audioPlayer';
import DraggableChordCard from './DraggableChordCard';
import FretboardDiagram from './FretboardDiagram';
import ChordVoicingEditor, { type ChordVoicingEditorRef } from './ChordVoicingEditor';
import { calculateChordFingering } from './ChordDiagram';
import { getNotesForChord, isValidChord } from '../lib/chordUtils';

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteAtFret(openNote: string, fret: number): string {
  const idx = CHROMATIC.indexOf(openNote);
  if (idx === -1) return '?';
  return CHROMATIC[(idx + fret) % 12];
}

function strumChordFrets(frets: (number | null)[], tuning: Tuning) {
  const strings = getTuningStrings(tuning);
  const strumDelay = audioPlayer.getStrumDelay();

  const entries: { stringIndex: number; fret: number }[] = [];
  for (let i = frets.length - 1; i >= 0; i--) {
    const f = frets[i];
    if (f !== null && typeof f === 'number') {
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

interface SortableChordGridProps {
  progression: Chord[];
  tuning: Tuning;
  capoSettings: CapoSettings;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdateVoicing?: (index: number, voicing: ChordVoicing | undefined) => void;
  activeLeadNotes?: string[];
  bpm: number;
  beatsPerMeasure: number;
  nextProgressionFirstChord?: Chord;
}

export default function SortableChordGrid({
  progression,
  tuning,
  capoSettings,
  onReorder,
  onReplace: _onReplace,
  onRemove,
  onUpdateVoicing,
  activeLeadNotes,
  bpm,
  beatsPerMeasure,
  nextProgressionFirstChord,
}: SortableChordGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showVoicingEditor, setShowVoicingEditor] = useState(false);
  const [showNextChord, setShowNextChord] = useState(true);
  const [anticipateNextProgression, setAnticipateNextProgression] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicingEditorRef = useRef<ChordVoicingEditorRef>(null);

  // Calculate ms per chord: each chord lasts its beats (or beatsPerMeasure) at the current BPM
  const getMsPerChord = useCallback((chordIndex: number) => {
    const chord = progression[chordIndex];
    const beats = chord?.beats || beatsPerMeasure;
    return (beats / (bpm / 60)) * 1000;
  }, [progression, bpm, beatsPerMeasure]);

  // Auto-cycle playback
  useEffect(() => {
    if (!isPlaying || progression.length === 0) return;

    const currentIdx = selectedIndex ?? 0;
    if (selectedIndex === null) setSelectedIndex(0);

    // Strum the current chord using voicing or computed fingering
    const chord = progression[currentIdx];
    let frets: (number | null)[] | undefined;
    if (chord.voicing?.tuningId === tuning.id) {
      frets = chord.voicing.frets;
    } else {
      const fingering = calculateChordFingering(chord.name, tuning);
      if (fingering) {
        frets = fingering.positions.map(p => typeof p.fret === 'number' ? p.fret : null);
      }
    }
    if (frets) strumChordFrets(frets, tuning);

    // Schedule advance to next chord
    const ms = getMsPerChord(currentIdx);
    playTimerRef.current = setTimeout(() => {
      const nextIdx = (currentIdx + 1) % progression.length;
      setSelectedIndex(nextIdx);
    }, ms);

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, selectedIndex, progression, tuning, getMsPerChord]);

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    } else {
      setShowVoicingEditor(false);
      if (selectedIndex === null) setSelectedIndex(0);
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = progression.findIndex((_, index) => `chord-${index}` === active.id);
      const newIndex = progression.findIndex((_, index) => `chord-${index}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
        // Update selection to follow the dragged chord
        if (selectedIndex === oldIndex) {
          setSelectedIndex(newIndex);
        } else if (selectedIndex !== null) {
          if (oldIndex < selectedIndex && newIndex >= selectedIndex) {
            setSelectedIndex(selectedIndex - 1);
          } else if (oldIndex > selectedIndex && newIndex <= selectedIndex) {
            setSelectedIndex(selectedIndex + 1);
          }
        }
      }
    }
  };

  const handleSelect = (index: number) => {
    stopPlayback();
    if (selectedIndex === index) {
      setSelectedIndex(null);
      setShowVoicingEditor(false);
    } else {
      setSelectedIndex(index);
      setShowVoicingEditor(false);
    }
  };

  const handleFretClick = showVoicingEditor
    ? (stringIndex: number, fret: number, _note: string) => {
        voicingEditorRef.current?.setFretForString(stringIndex, fret);
      }
    : undefined;

  const items = progression.map((_, index) => `chord-${index}`);
  const selectedChord = selectedIndex !== null ? progression[selectedIndex] : null;
  const isLastChord = selectedIndex !== null && selectedIndex === progression.length - 1;

  // Next chord within the progression (wraps to first chord on last)
  const nextChordInProgression = selectedIndex !== null
    ? (selectedIndex < progression.length - 1
        ? progression[selectedIndex + 1]
        : progression.length > 1 ? progression[0] : null)
    : null;

  // When on the last chord and anticipating next progression, use that instead
  const previewChord = isLastChord && anticipateNextProgression && nextProgressionFirstChord
    ? nextProgressionFirstChord
    : nextChordInProgression;

  // Get voicing frets: prefer explicit voicing, fall back to computed fingering
  function getVoicingFrets(chord: Chord): (number | null)[] | undefined {
    if (chord.voicing?.tuningId === tuning.id) {
      return chord.voicing.frets;
    }
    const fingering = calculateChordFingering(chord.name, tuning);
    if (fingering) {
      return fingering.positions.map(p => typeof p.fret === 'number' ? p.fret : null);
    }
    return undefined;
  }

  // Full theoretical notes for the chord (even if voicing is a shell voicing with fewer notes)
  function getFullChordNotes(chord: Chord): string[] {
    if (isValidChord(chord.name)) {
      const fullNotes = getNotesForChord(chord.name);
      if (fullNotes.length > 0) return fullNotes;
    }
    return chord.notes;
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {progression.map((chord, index) => (
              <DraggableChordCard
                key={`chord-${index}`}
                chord={chord}
                index={index}
                tuning={tuning}
                onRemove={onRemove}
                onUpdateVoicing={onUpdateVoicing}
                activeLeadNotes={activeLeadNotes}
                isSelected={selectedIndex === index}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Shared fretboard panel for selected chord */}
      {selectedChord && selectedIndex !== null && (
        <div
          className="mt-3 rounded-lg overflow-hidden transition-all"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              {/* Play/Stop button */}
              <button
                onClick={togglePlayback}
                className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                style={{
                  background: isPlaying ? 'var(--danger)' : 'var(--accent)',
                  color: '#fff',
                }}
                title={isPlaying ? 'Stop playback' : 'Play progression'}
              >
                {isPlaying ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {selectedChord.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {getFullChordNotes(selectedChord).join(', ')}
              </span>
              {isPlaying && (
                <span className="text-xs" style={{ color: 'var(--accent)' }}>
                  {selectedIndex! + 1}/{progression.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Show next chord toggle */}
              {previewChord && (
                <button
                  onClick={() => setShowNextChord(!showNextChord)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
                  style={{
                    background: showNextChord ? 'var(--accent)' : 'transparent',
                    color: showNextChord ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                  title={`${showNextChord ? 'Hide' : 'Show'} next chord (${previewChord.name}) on fretboard`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                  </svg>
                  {previewChord.name}
                </button>
              )}
              {/* Cross-progression anticipation toggle (only on last chord when next progression exists) */}
              {isLastChord && nextProgressionFirstChord && (
                <button
                  onClick={() => setAnticipateNextProgression(!anticipateNextProgression)}
                  className="flex items-center justify-center rounded transition-colors"
                  style={{
                    width: 20,
                    height: 20,
                    background: anticipateNextProgression ? 'var(--accent)' : 'transparent',
                    color: anticipateNextProgression ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                  title={anticipateNextProgression
                    ? `Previewing next progression's first chord (${nextProgressionFirstChord.name})`
                    : `Preview next progression's first chord (${nextProgressionFirstChord.name})`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17l5-5-5-5" />
                    <path d="M13 17l5-5-5-5" />
                  </svg>
                </button>
              )}
              {/* TAB editor toggle */}
              <button
                onClick={() => setShowVoicingEditor(!showVoicingEditor)}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  background: showVoicingEditor ? 'var(--accent)' : 'transparent',
                  color: showVoicingEditor ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
                title="Edit voicing"
              >
                TAB
              </button>
              {/* Close */}
              <button
                onClick={() => { stopPlayback(); setSelectedIndex(null); setShowVoicingEditor(false); }}
                className="px-1 py-0.5 rounded text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title="Close panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Fretboard */}
          <div className="px-2 pb-2">
            {showVoicingEditor && (
              <div className="text-xs text-center py-1" style={{ color: 'var(--accent)' }}>
                Click a note on the fretboard to fill it into the editor below
              </div>
            )}
            <div className="overflow-x-auto">
              <FretboardDiagram
                chordNotes={getFullChordNotes(selectedChord)}
                tuning={tuning}
                capoSettings={capoSettings}
                onFretClick={handleFretClick}
                activeLeadNotes={activeLeadNotes}
                previewNotes={showNextChord && previewChord ? previewChord.notes : undefined}
                voicingFrets={getVoicingFrets(selectedChord)}
              />
            </div>

            {/* Voicing editor */}
            {showVoicingEditor && (
              <ChordVoicingEditor
                ref={voicingEditorRef}
                tuning={tuning}
                initialFrets={selectedChord.voicing?.tuningId === tuning.id ? selectedChord.voicing.frets : undefined}
                chordName={selectedChord.name}
                chordNotes={selectedChord.notes}
                onApply={(frets) => {
                  if (onUpdateVoicing) {
                    onUpdateVoicing(selectedIndex, { frets, tuningId: tuning.id });
                  }
                  setShowVoicingEditor(false);
                }}
                onCancel={() => setShowVoicingEditor(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
