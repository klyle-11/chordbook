import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Chord, ChordVoicing } from '../types/chord';
import type { Tuning, CapoSettings } from '../lib/tunings';
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
  const voicingEditorRef = useRef<ChordVoicingEditorRef>(null);

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

  // When voicing editor is open, fretboard clicks push frets into the editor
  const handleFretClick = showVoicingEditor
    ? (stringIndex: number, fret: number, _note: string) => {
        voicingEditorRef.current?.setFretForString(stringIndex, fret);
      }
    : undefined;

  return (
    <div className="flex justify-start">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        data-chord-diagram
        className={`w-full bg-white rounded-lg p-3 sm:p-4 transition-all duration-200 border-2 shadow-sm ${
          isDragging
            ? 'opacity-70 shadow-2xl z-50 border-blue-500 scale-105'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
      >
      {/* Drag handle and chord info */}
      <div className="flex items-center justify-between mb-2 sm:mb-1">
        <h3 className="text-base sm:text-lg font-medium text-gray-800 truncate min-w-0 flex-1 mr-2">{chord.name}</h3>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setShowVoicingEditor(!showVoicingEditor)}
            className="px-2 py-1 text-white text-xs rounded"
            style={{ background: showVoicingEditor ? 'var(--accent)' : '#6b7280' }}
            title="Edit voicing (frets per string)"
          >
            TAB
          </button>
          <button
            onClick={() => onReplace(index)}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Replace
          </button>
          <button
            onClick={() => onRemove(index)}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            ×
          </button>
          {/* Drag handle */}
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 flex items-center transition-colors"
            title="Drag to reorder"
          >
            ⋮⋮
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-gray-600 mb-2 text-center break-words">
        Notes: {chord.notes.join(", ")}
      </p>

      {/* Chord diagram (TAB when voicing exists, dot-style otherwise) */}
      <ChordDiagram chordName={chord.name} tuning={tuning} voicing={chord.voicing} />

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
