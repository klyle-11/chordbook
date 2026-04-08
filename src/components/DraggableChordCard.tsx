import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Chord, ChordVoicing, SavedVoicing } from '../types/chord';
import type { Tuning, CapoSettings } from '../lib/tunings';
import { findVoicingsForNotes } from '../lib/savedVoicingLibrary';
import FretboardDiagram from './FretboardDiagram';
import { ChordDiagram } from './ChordDiagram';
import ChordVoicingEditor, { type ChordVoicingEditorRef } from './ChordVoicingEditor';

interface DraggableChordCardProps {
  chord: Chord;
  index: number;
  tuning: Tuning;
  capoSettings: CapoSettings;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdateVoicing?: (index: number, voicing: ChordVoicing | undefined) => void;
}

export default function DraggableChordCard({
  chord,
  index,
  tuning,
  capoSettings,
  onReplace,
  onRemove,
  onUpdateVoicing,
}: DraggableChordCardProps) {
  const [showVoicingEditor, setShowVoicingEditor] = useState(false);
  const [savedVoicings, setSavedVoicings] = useState<SavedVoicing[]>([]);
  const [showVoicingPicker, setShowVoicingPicker] = useState(false);
  const voicingEditorRef = useRef<ChordVoicingEditorRef>(null);

  // Load saved voicings for this chord's notes + tuning
  useEffect(() => {
    let cancelled = false;
    findVoicingsForNotes(chord.notes, tuning.id).then(v => {
      if (!cancelled) setSavedVoicings(v);
    });
    return () => { cancelled = true; };
  }, [chord.notes, tuning.id, showVoicingEditor]); // re-fetch after editor closes (may have saved new)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `chord-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFretClick = showVoicingEditor
    ? (stringIndex: number, fret: number, _note: string) => {
        voicingEditorRef.current?.setFretForString(stringIndex, fret);
      }
    : undefined;

  function selectVoicing(v: SavedVoicing) {
    if (onUpdateVoicing) {
      onUpdateVoicing(index, { frets: v.frets, tuningId: v.tuningId });
    }
    setShowVoicingPicker(false);
  }

  function clearVoicing() {
    if (onUpdateVoicing) {
      onUpdateVoicing(index, undefined);
    }
    setShowVoicingPicker(false);
  }

  // Format frets for display: e.g. "0 2 2 1 0 X"
  function fretLabel(frets: (number | null)[]): string {
    return frets.map(f => f === null ? 'X' : f).join(' ');
  }

  // Check if a saved voicing matches the currently applied one
  function isActive(v: SavedVoicing): boolean {
    if (!chord.voicing || chord.voicing.tuningId !== tuning.id) return false;
    return v.frets.length === chord.voicing.frets.length &&
      v.frets.every((f, i) => f === chord.voicing!.frets[i]);
  }

  return (
    <div className="flex justify-start">
      <div
        ref={setNodeRef}
        style={{
          ...style,
          background: 'var(--bg-card)',
          borderColor: isDragging ? 'var(--accent)' : 'var(--border)',
        }}
        {...attributes}
        data-chord-diagram
        className={`w-full rounded-lg p-3 sm:p-4 transition-all duration-200 border-2 shadow-sm ${
          isDragging
            ? 'opacity-70 shadow-2xl z-50 scale-105'
            : ''
        }`}
      >
      {/* Drag handle and chord info */}
      <div className="flex items-center justify-between mb-2 sm:mb-1">
        <h3 className="text-base sm:text-lg font-medium truncate min-w-0 flex-1 mr-2" style={{ color: 'var(--card-text)' }}>{chord.name}</h3>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setShowVoicingEditor(!showVoicingEditor)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              background: showVoicingEditor ? 'var(--accent)' : 'var(--bg-secondary)',
              color: showVoicingEditor ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
            title="Edit voicing (frets per string)"
          >
            TAB
          </button>
          {savedVoicings.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowVoicingPicker(!showVoicingPicker)}
                className="px-2 py-1 text-xs rounded transition-colors"
                style={{
                  background: showVoicingPicker ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: showVoicingPicker ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
                title={`${savedVoicings.length} saved voicing${savedVoicings.length !== 1 ? 's' : ''}`}
              >
                {savedVoicings.length}V
              </button>
              {showVoicingPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowVoicingPicker(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg p-1 min-w-[180px]"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <p className="px-2 py-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Saved Voicings
                    </p>
                    {savedVoicings.map(v => (
                      <button
                        key={v.id}
                        onClick={() => selectVoicing(v)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2"
                        style={{
                          background: isActive(v) ? 'var(--accent-subtle)' : 'transparent',
                          color: 'var(--text)',
                        }}
                      >
                        <span className="font-medium truncate flex-1">{v.name}</span>
                        <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                          {fretLabel(v.frets)}
                        </span>
                        {isActive(v) && (
                          <svg width="12" height="12" viewBox="0 0 20 20" fill="var(--accent)">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                    {chord.voicing && (
                      <>
                        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                        <button
                          onClick={clearVoicing}
                          className="w-full text-left px-2 py-1.5 rounded text-xs transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Clear voicing
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => onReplace(index)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Replace
          </button>
          <button
            onClick={() => onRemove(index)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            ×
          </button>
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing px-2 py-1 text-xs rounded flex items-center transition-colors"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            title="Drag to reorder"
          >
            ⋮⋮
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm mb-2 text-center break-words" style={{ color: 'var(--text-secondary)' }}>
        Notes: {chord.notes.join(", ")}
      </p>

      {/* Chord diagram (TAB when voicing exists, dot-style otherwise) */}
      <ChordDiagram
        chordName={chord.name}
        tuning={tuning}
        voicing={chord.voicing}
        onRequestVoicingEditor={() => setShowVoicingEditor(true)}
      />

      {/* Fretboard hint when editor is open */}
      {showVoicingEditor && (
        <div className="mb-1 text-xs text-center" style={{ color: 'var(--accent)' }}>
          Click a note on the fretboard to fill it into the editor below
        </div>
      )}

      <div className="overflow-x-auto">
        <FretboardDiagram
          chordNotes={chord.notes}
          tuning={tuning}
          capoSettings={capoSettings}
          onFretClick={handleFretClick}
        />
      </div>

      {/* Inline voicing editor */}
      {showVoicingEditor && (
        <ChordVoicingEditor
          ref={voicingEditorRef}
          tuning={tuning}
          initialFrets={chord.voicing?.tuningId === tuning.id ? chord.voicing.frets : undefined}
          chordName={chord.name}
          chordNotes={chord.notes}
          onApply={(frets) => {
            if (onUpdateVoicing) {
              onUpdateVoicing(index, { frets, tuningId: tuning.id });
            }
            setShowVoicingEditor(false);
          }}
          onCancel={() => setShowVoicingEditor(false)}
        />
      )}
      </div>
    </div>
  );
}
