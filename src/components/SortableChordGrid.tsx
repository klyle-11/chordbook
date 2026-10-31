import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import type { Tuning, CapoSettings } from '../lib/music/tunings';
import { getTuningStrings, getSoundingTuning } from '../lib/music/tunings';
import { getNoteAtFret } from '../lib/music/notes';
import { audioPlayer } from '../lib/audioPlayer';
import type { ChordAnalysis, HarmonicContext } from '../lib/harmonicAnalysis';
import DraggableChordCard from './DraggableChordCard';
import ChordVoicingEditor, { type ChordVoicingEditorRef } from './ChordVoicingEditor';
import QuickTabEditor from './QuickTabEditor';
import { calculateChordFingering } from '../lib/music/fingering';
import { getNotesForChord, isValidChord } from '../lib/music/chords';
import { EditableText } from './EditableText';
import { useFretboardFocus } from '../lib/fretboardFocus';
import { suggestChordScale } from '../lib/music/scales';

type FretboardOverlayMode = 'next' | 'mode' | 'off';

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
  onRemove: (index: number) => void;
  onUpdateVoicing?: (index: number, voicing: ChordVoicing | undefined, renameTo?: string) => void;
  onRename?: (index: number, name: string) => void;
  activeLeadNotes?: string[];
  bpm: number;
  beatsPerMeasure: number;
  nextProgressionFirstChord?: Chord;
  chordAnalyses?: ChordAnalysis[];
  harmonicContext?: HarmonicContext;
  /** Progression id — identifies this grid as owner of the header fretboard focus */
  ownerId: string;
  /** No reordering, removing or voicing changes (exported song viewer) */
  readOnly?: boolean;
  /** Exported viewers always show the suggested mode and do not expose overlay controls. */
  forceModeOverlay?: boolean;
}

export default function SortableChordGrid({
  ownerId,
  progression,
  tuning,
  capoSettings,
  onReorder,
  onRemove,
  onUpdateVoicing,
  onRename,
  activeLeadNotes,
  bpm,
  beatsPerMeasure,
  nextProgressionFirstChord,
  chordAnalyses,
  harmonicContext,
  readOnly = false,
  forceModeOverlay = false,
}: SortableChordGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showVoicingEditor, setShowVoicingEditor] = useState(false);
  const [quickEditIndex, setQuickEditIndex] = useState<number | null>(null);
  const [overlayMode, setOverlayMode] = useState<FretboardOverlayMode>('next');
  const [anticipateNextProgression, setAnticipateNextProgression] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicingEditorRef = useRef<ChordVoicingEditorRef>(null);
  // Voicings, tab and shapes are relative to the capo; only FretboardDiagram needs the raw tuning
  const soundingTuning = getSoundingTuning(tuning, capoSettings);

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
    const frets = getVoicingFrets(chord);
    if (frets) strumChordFrets(frets, soundingTuning);

    // Schedule advance to next chord
    const ms = getMsPerChord(currentIdx);
    playTimerRef.current = setTimeout(() => {
      const nextIdx = (currentIdx + 1) % progression.length;
      setSelectedIndex(nextIdx);
    }, ms);

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getVoicingFrets only depends on soundingTuning
  }, [isPlaying, selectedIndex, progression, soundingTuning.name, getMsPerChord]);

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

  // Quick tab editor over a chord already in the progression
  const handleEditVoicing = (index: number) => {
    stopPlayback();
    setShowVoicingEditor(false);
    setQuickEditIndex(index);
  };

  // "More…" from the quick editor → full editor in the fretboard panel
  const openFullEditor = (index: number) => {
    setQuickEditIndex(null);
    setSelectedIndex(index);
    setShowVoicingEditor(true);
  };

  const renderQuickEditor = (chord: Chord, index: number) => quickEditIndex === index ? (
    <QuickTabEditor
      tuning={soundingTuning}
      chordName={chord.name}
      chordNotes={getFullChordNotes(chord)}
      initialFrets={getVoicingFrets(chord)}
      onApply={(frets, renameTo) => {
        onUpdateVoicing?.(index, { frets, tuningId: tuning.id }, renameTo);
        setQuickEditIndex(null);
      }}
      onClose={() => setQuickEditIndex(null)}
      onMore={() => openFullEditor(index)}
    />
  ) : undefined;

  // Fretboard clicks (in the song header) fill the full editor while it's open
  const fillFromFretboard = useCallback((stringIndex: number, fret: number) => {
    voicingEditorRef.current?.setFretForString(stringIndex, fret);
  }, []);

  // ─── Song-header fretboard focus ───
  const { focus, setFocus } = useFretboardFocus();
  const focusOwner = focus?.ownerId;

  // Another progression took the fretboard → drop our selection
  useEffect(() => {
    if (focusOwner && focusOwner !== ownerId) {
      setIsPlaying(false);
      setSelectedIndex(null);
      setShowVoicingEditor(false);
    }
  }, [focusOwner, ownerId]);

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
    const fingering = calculateChordFingering(chord.name, soundingTuning);
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

  const modeSuggestion = useMemo(
    () => selectedChord
      ? suggestChordScale(selectedChord.name, getFullChordNotes(selectedChord), harmonicContext)
      : null,
    [selectedChord, harmonicContext]
  );
  const effectiveOverlayMode: FretboardOverlayMode = forceModeOverlay ? 'mode' : overlayMode;

  // Publish the selected / playing chord to the song-header fretboard
  useEffect(() => {
    if (!selectedChord || selectedIndex === null) {
      setFocus(prev => (prev?.ownerId === ownerId ? null : prev));
      return;
    }
    const modeContext = effectiveOverlayMode === 'mode' ? modeSuggestion : null;
    const nextContext = effectiveOverlayMode === 'next' ? previewChord : null;
    setFocus({
      ownerId,
      chordName: selectedChord.name,
      chordNotes: getFullChordNotes(selectedChord),
      voicingFrets: getVoicingFrets(selectedChord),
      secondaryKind: modeContext ? 'mode' : nextContext ? 'next' : undefined,
      secondaryName: modeContext?.name || nextContext?.name,
      secondaryNotes: modeContext?.notes || (nextContext ? getFullChordNotes(nextContext) : undefined),
      onFretClick: showVoicingEditor ? fillFromFretboard : undefined,
    });
    // getVoicingFrets / getFullChordNotes only read soundingTuning and the chord
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, selectedChord, selectedIndex, previewChord, effectiveOverlayMode, modeSuggestion, showVoicingEditor, soundingTuning.name, fillFromFretboard, setFocus]);

  // Release the fretboard when this progression unmounts (deleted / song closed)
  useEffect(() => () => setFocus(prev => (prev?.ownerId === ownerId ? null : prev)), [ownerId, setFocus]);

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
                tuning={soundingTuning}
                onRemove={onRemove}
                onUpdateVoicing={onUpdateVoicing}
                onEditVoicing={onUpdateVoicing ? handleEditVoicing : undefined}
                quickEditor={renderQuickEditor(chord, index)}
                activeLeadNotes={activeLeadNotes}
                isSelected={selectedIndex === index}
                onSelect={handleSelect}
                chordAnalysis={chordAnalyses?.[index]}
                harmonicContext={harmonicContext}
                readOnly={readOnly}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Progression toolbar — the chord itself shows on the song fretboard in the header */}
      {progression.length > 0 && (
        <div
          className="mt-2 rounded-lg overflow-hidden transition-all"
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
              {!selectedChord || selectedIndex === null ? (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Click a chord or ▶ to show it on the fretboard
                </span>
              ) : onRename ? (
                <EditableText
                  value={selectedChord.name}
                  onChange={(name) => { if (name.trim() && name !== selectedChord.name) onRename(selectedIndex, name.trim()); }}
                  className="text-sm font-medium"
                  placeholder="Chord name"
                />
              ) : (
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {selectedChord.name}
                </span>
              )}
              {selectedChord && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {getFullChordNotes(selectedChord).join(', ')}
                </span>
              )}
              {isPlaying && (
                <span className="text-xs" style={{ color: 'var(--accent)' }}>
                  {selectedIndex! + 1}/{progression.length}
                </span>
              )}
            </div>
            {selectedChord && selectedIndex !== null && (
            <div className="flex items-center gap-2">
              {/* Fretboard secondary layer: next chord, suggested mode, or off. */}
              {!forceModeOverlay && previewChord && (
                <button
                  onClick={() => setOverlayMode(overlayMode === 'next' ? 'off' : 'next')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
                  style={{
                    background: overlayMode === 'next' ? 'var(--accent)' : 'transparent',
                    color: overlayMode === 'next' ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                  title={`${overlayMode === 'next' ? 'Hide' : 'Show'} next chord (${previewChord.name}) on fretboard`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                  </svg>
                  {previewChord.name}
                </button>
              )}
              {!forceModeOverlay && (
                <button
                  onClick={() => setOverlayMode(overlayMode === 'mode' ? 'off' : 'mode')}
                  disabled={!modeSuggestion}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{
                    background: overlayMode === 'mode' && modeSuggestion ? 'var(--analysis)' : 'transparent',
                    color: overlayMode === 'mode' && modeSuggestion ? '#000' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                  title={modeSuggestion
                    ? `${overlayMode === 'mode' ? 'Hide' : 'Show'} ${modeSuggestion.name} on fretboard`
                    : 'No confident scale or mode matches every chord tone'}
                >
                  Mode
                </button>
              )}
              {forceModeOverlay && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    background: modeSuggestion ? 'var(--analysis)' : 'var(--analysis-subtle)',
                    color: modeSuggestion ? '#000' : 'var(--text-muted)',
                    border: '1px solid var(--analysis)',
                  }}
                  title={modeSuggestion?.name || 'No confident scale or mode matches every chord tone'}
                >
                  Mode
                </span>
              )}
              {/* Cross-progression anticipation toggle (only on last chord when next progression exists) */}
              {!forceModeOverlay && overlayMode === 'next' && isLastChord && nextProgressionFirstChord && (
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
              {onUpdateVoicing && (
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
                Tab voicing
              </button>
              )}
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
            )}
          </div>

          <div className="px-2 pb-2">
            {showVoicingEditor && selectedChord && (
              <div className="text-xs text-center py-1" style={{ color: 'var(--accent)' }}>
                Click notes on the fretboard above to fill the tab
              </div>
            )}

            {/* Voicing editor */}
            {showVoicingEditor && selectedChord && selectedIndex !== null && (
              <ChordVoicingEditor
                key={selectedIndex}
                ref={voicingEditorRef}
                tuning={soundingTuning}
                initialFrets={getVoicingFrets(selectedChord)}
                chordName={selectedChord.name}
                chordNotes={getFullChordNotes(selectedChord)}
                onApply={(frets, renameTo) => {
                  if (onUpdateVoicing) {
                    onUpdateVoicing(selectedIndex, { frets, tuningId: tuning.id }, renameTo);
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
