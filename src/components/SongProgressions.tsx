import { useState, useEffect, useRef } from 'react';
import type { NamedProgression } from '../types/song';
import type { Tuning, CapoSettings } from '../lib/tunings';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SortableChordGrid from './SortableChordGrid';
import { EditableText } from './EditableText';
import { formatSongInfo } from '../lib/displayUtils';
import { SortableChordIcons } from './SortableChordIcons';
import { BpmInput } from './BpmInput';
import ChordForm from './ChordForm';

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
  isNewlyCreated?: boolean;
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
  songBpm,
  isNewlyCreated = false
}: SortableProgressionItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(progression.id);
    setShowDeleteConfirm(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-white rounded-lg shadow-sm border border-gray-200"
      data-progression-id={progression.id}
    >
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
                autoFocus={isNewlyCreated}
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
                <SortableChordIcons 
                  chords={progression.chords} 
                  tuning={tuning} 
                  className="flex-shrink-0" 
                  onReorder={(oldIndex, newIndex) => onChordReorder(progression.id, oldIndex, newIndex)}
                />
              )}
            </div>
          </div>

          {/* BPM Control */}
          <div className="flex items-center gap-2 mr-4">
            <BpmInput
              bpm={effectiveBpm}
              onChange={(bpm) => onUpdateProgressionBpm(progression.id, bpm)}
              size="sm"
              className="w-16"
            />
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDeleteClick}
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

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Chord Progression
            </h3>
            <p className="text-gray-600">
              Are you sure you want to delete the progression "{progression.name}"?
              {progression.chords.length > 0 && (
                <span className="block mt-1 text-sm text-red-600">
                  This will permanently delete {progression.chords.length} chord{progression.chords.length !== 1 ? 's' : ''}.
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleDeleteCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

interface SongProgressionsProps {
  progressions: NamedProgression[];
  onReorderProgressions: (oldIndex: number, newIndex: number) => void;
  onEditProgression: (progressionId: string, field: 'name', value: string) => void;
  onUpdateProgressionBpm: (progressionId: string, bpm: number) => void;
  onDeleteProgression: (progressionId: string) => void;
  onChordReorder: (progressionId: string, oldIndex: number, newIndex: number) => void;
  onChordReplace: (progressionId: string, chordIndex: number) => void;
  onChordRemove: (progressionId: string, chordIndex: number) => void;
  onAddChord: (progressionId: string, chordName: string) => void;
  onAddProgression?: () => void;
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
  onChordReorder,
  onChordReplace,
  onChordRemove,
  onAddChord,
  onAddProgression,
  tuning,
  capoSettings,
  bpm
}: SongProgressionsProps) {
  const [expandedProgressions, setExpandedProgressions] = useState<Set<string>>(new Set());
  const [newlyCreatedProgression, setNewlyCreatedProgression] = useState<string | null>(null);
  const progressionsRef = useRef<HTMLDivElement>(null);

    // Auto-expand progressions that are newly created or when there's only one progression
  useEffect(() => {
    if (progressions.length === 1) {
      // If there's only one progression, expand it (common when creating new songs)
      setExpandedProgressions(new Set([progressions[0].id]));
      setNewlyCreatedProgression(progressions[0].id);
    } else if (progressions.length > 1) {
      // Find progressions without chords (likely newly created)
      const emptyProgressions = progressions.filter(p => p.chords.length === 0).map(p => p.id);
      
      if (emptyProgressions.length > 0) {
        setExpandedProgressions(prev => {
          const newSet = new Set(prev);
          emptyProgressions.forEach(id => newSet.add(id));
          return newSet;
        });
        // Set the most recently created empty progression for focus
        if (emptyProgressions.length > 0) {
          setNewlyCreatedProgression(emptyProgressions[0]);
        }
      }
    }
  }, [progressions]);

  // Clear the newly created progression after it's been rendered
  useEffect(() => {
    if (newlyCreatedProgression) {
      const timer = setTimeout(() => {
        setNewlyCreatedProgression(null);
      }, 1000); // Clear after 1 second
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedProgression]);

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

  const handleAddProgression = () => {
    if (onAddProgression) {
      onAddProgression();
      // Scroll to the progressions section smoothly after a short delay to allow for rendering
      setTimeout(() => {
        if (progressionsRef.current) {
          // Find the newly added progression (empty progression at the bottom)
          const newProgressionElements = progressionsRef.current.querySelectorAll('[data-progression-id]');
          if (newProgressionElements.length > 0) {
            const lastProgression = newProgressionElements[newProgressionElements.length - 1] as HTMLElement;
            lastProgression.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          } else {
            // Fallback to scrolling to the progressions container
            progressionsRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }
      }, 150); // Increased delay to ensure DOM updates
    }
  };

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

  if (progressions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No progressions in this song yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={progressionsRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-gray-800">
            Chord Progressions ({progressions.length})
          </h3>
          {onAddProgression && (
            <button
              onClick={handleAddProgression}
              className="flex items-center justify-center w-5 h-5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
              title="Add new progression"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
        </div>
      </div>

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
              isNewlyCreated={newlyCreatedProgression === progression.id}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
