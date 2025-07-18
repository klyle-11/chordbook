import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Chord } from '../types/chord';
import type { Tuning, CapoSettings } from '../lib/tunings';
import FretBoard from './Fretboard';

interface DraggableChordCardProps {
  chord: Chord;
  index: number;
  tuning: Tuning;
  capoSettings: CapoSettings;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
}

export default function DraggableChordCard({ 
  chord, 
  index, 
  tuning,
  capoSettings,
  onReplace, 
  onRemove 
}: DraggableChordCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white rounded-lg p-4 transition-all duration-200 border-2 shadow-sm ${
        isDragging 
          ? 'opacity-70 shadow-2xl z-50 border-blue-500 scale-105' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      {/* Drag handle and chord info */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-gray-800">{chord.name}</h3>
        <div className="flex gap-2">
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
      
      <p className="text-sm text-gray-600 mb-3 text-center">
        Notes: {chord.notes.join(", ")}
      </p>
      
      <FretBoard chordNotes={chord.notes} tuning={tuning} capoSettings={capoSettings} />
    </div>
  );
}
