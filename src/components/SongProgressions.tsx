import { useState } from 'react';
import type { NamedProgression } from '../types/song';
import type { Tuning, CapoSettings } from '../lib/tunings';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SortableChordGrid from './SortableChordGrid';
import { EditableText } from './EditableText';
import { formatSongInfo } from '../lib/displayUtils';
import { ChordIcons } from './ChordIcons';
import ChordForm from './ChordForm';
import { IntegratedMetronome } from './IntegratedMetronome';

interface SortableProgressionItemProps {
  progression: NamedProgression;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (progressionId: string, field: 'name', value: string) => void;
  onDelete: (progressionId: string) => void;
  onChordReorder: (progressionId: string, oldIndex: number, newIndex: number) => void;
  onChordReplace: (progressionId: string, chordIndex: number) => void;
  onChordRemove: (progressionId: string, chordIndex: number) => void;
  onAddChord: (progressionId: string, chordName: string) => void;
  onUpdateProgressionBpm: (progressionId: string, bpm: number) => void;
  tuning: Tuning;
  capoSettings: CapoSettings;
  songBpm: number;
}

function SortableProgressionItem({ 
  progression, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  onChordReorder, 
  onChordReplace, 
  onChordRemove,
  onAddChord,
  onUpdateProgressionBpm,
  tuning, 
  capoSettings, 
  songBpm 
}: SortableProgressionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: progression.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const effectiveBpm = progression.bpm || songBpm;

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center p-4 gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Drag to reorder"
        >
          <div className="w-3 h-3 grid grid-cols-2 gap-0.5">
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
          </div>
        </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={onToggle}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg 
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Progression Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <EditableText 
                value={progression.name}
                onChange={(value) => onEdit(progression.id, 'name', value)}
                placeholder="Untitled Progression"
                className="text-lg font-medium text-gray-800"
              />
              <span className="text-sm text-gray-500">
                ({progression.chords.length} chord{progression.chords.length !== 1 ? 's' : ''})
              </span>
            </div>
            
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-500">
                {formatSongInfo(tuning, capoSettings, effectiveBpm)}
              </span>
              
              {progression.chords.length > 0 && (
                <ChordIcons chords={progression.chords} tuning={tuning} className="flex-shrink-0" />
              )}
            </div>
          </div>

          {/* BPM Display (read-only) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">BPM:</span>
            <span className="text-sm font-medium text-gray-700 min-w-[2rem] text-center">
              {effectiveBpm}
            </span>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete the progression "${progression.name}"? This action cannot be undone.`)) {
                onDelete(progression.id);
              }
            }}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Delete progression"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-4">
            {/* Chord Form for adding chords */}
            <div className="mb-4">
              <ChordForm onAddChord={(chordName) => onAddChord(progression.id, chordName)} />
            </div>
            
            {/* Integrated Metronome for this progression */}
            {progression.chords.length > 0 && (
              <div className="mb-4">
                <IntegratedMetronome 
                  onTempoChange={(bpm) => onUpdateProgressionBpm(progression.id, bpm)} 
                  currentBpm={effectiveBpm}
                />
              </div>
            )}
            
            {/* Chord Grid */}
            <SortableChordGrid
              progression={progression.chords}
              tuning={tuning}
              capoSettings={capoSettings}
              onReorder={(oldIndex, newIndex) => onChordReorder(progression.id, oldIndex, newIndex)}
              onReplace={(index) => onChordReplace(progression.id, index)}
              onRemove={(index) => onChordRemove(progression.id, index)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface SongProgressionsProps {
  progressions: NamedProgression[];
  onReorderProgressions: (oldIndex: number, newIndex: number) => void;
  onEditProgression: (progressionId: string, field: 'name', value: string) => void;
  onUpdateProgressionBpm: (progressionId: string, bpm: number) => void;
  onDeleteProgression: (progressionId: string) => void;
  onCreateProgression: () => void; // Add new prop for creating progressions
  onSelectProgression: (progressionId: string) => void;
  currentProgressionId: string | null;
  onChordReorder: (progressionId: string, oldIndex: number, newIndex: number) => void;
  onChordReplace: (progressionId: string, chordIndex: number) => void;
  onChordRemove: (progressionId: string, chordIndex: number) => void;
  onAddChord: (progressionId: string, chordName: string) => void;
  tuning: Tuning;
  capoSettings: CapoSettings;
  bpm: number;
}

export default function SongProgressions({
  progressions,
  onReorderProgressions,
  onEditProgression,
  onUpdateProgressionBpm,
  onDeleteProgression,
  onCreateProgression,
  onSelectProgression: _onSelectProgression, // For future use
  onChordReorder,
  onChordReplace,
  onChordRemove,
  onAddChord,
  currentProgressionId: _currentProgressionId, // For future highlighting
  tuning,
  capoSettings,
  bpm
}: SongProgressionsProps) {
  const [expandedProgressions, setExpandedProgressions] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpanded = (progressionId: string) => {
    setExpandedProgressions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(progressionId)) {
        newSet.delete(progressionId);
      } else {
        newSet.add(progressionId);
      }
      return newSet;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = progressions.findIndex(p => p.id === active.id);
      const newIndex = progressions.findIndex(p => p.id === over.id);
      
      onReorderProgressions(oldIndex, newIndex);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800">
          Chord Progressions ({progressions.length})
        </h3>
        <button
          onClick={onCreateProgression}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Progression
        </button>
      </div>

      {progressions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No progressions in this song yet.</p>
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={progressions.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {progressions.map((progression) => (
              <SortableProgressionItem
                key={progression.id}
                progression={progression}
                isExpanded={expandedProgressions.has(progression.id)}
                onToggle={() => toggleExpanded(progression.id)}
                onEdit={onEditProgression}
                onDelete={onDeleteProgression}
                onChordReorder={onChordReorder}
                onChordReplace={onChordReplace}
                onChordRemove={onChordRemove}
                onAddChord={onAddChord}
                onUpdateProgressionBpm={onUpdateProgressionBpm}
                tuning={tuning}
                capoSettings={capoSettings}
                songBpm={bpm}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
