import { useState, useEffect, useRef } from 'react';
import type { NamedProgression, ChordPairing, TimeSignature } from '../types/song';
import type { ChordVoicing } from '../types/chord';
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
import { PairedProgressionPanel } from './PairedProgressionPanel';

interface SortableProgressionItemProps {
  progression: NamedProgression;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (progressionId: string, field: 'name', value: string) => void;
  onDelete: (progressionId: string) => void;
  onChordReorder: (progressionId: string, oldIndex: number, newIndex: number) => void;
  onChordReplace: (progressionId: string, chordIndex: number) => void;
  onChordRemove: (progressionId: string, chordIndex: number) => void;
  onUpdateChordVoicing: (progressionId: string, chordIndex: number, voicing: ChordVoicing | undefined) => void;
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
  onUpdateChordVoicing,
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
      className="themed-card"
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
              onUpdateVoicing={(index, voicing) => onUpdateChordVoicing(progression.id, index, voicing)}
            />
          </div>
        </div>
      )}
    </div>

    {showDeleteConfirm && (
      <div className="fixed inset-0 themed-overlay flex items-center justify-center z-50 p-4">
        <div className="themed-dialog p-6 max-w-md w-full animate-fade-in">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
              Delete Progression
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Delete "<strong>{progression.name}</strong>"?
              {progression.chords.length > 0 && (
                <span className="block mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                  {progression.chords.length} chord{progression.chords.length !== 1 ? 's' : ''} will be removed.
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={handleDeleteCancel} className="themed-btn-secondary">Cancel</button>
            <button onClick={handleDeleteConfirm} className="themed-btn-danger">Delete</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

interface SongProgressionsProps {
  progressions: NamedProgression[];
  pairings: ChordPairing[];
  timeSignature: TimeSignature;
  onReorderProgressions: (oldIndex: number, newIndex: number) => void;
  onEditProgression: (progressionId: string, field: 'name', value: string) => void;
  onUpdateProgressionBpm: (progressionId: string, bpm: number) => void;
  onDeleteProgression: (progressionId: string) => void;
  onChordReorder: (progressionId: string, oldIndex: number, newIndex: number) => void;
  onChordReplace: (progressionId: string, chordIndex: number) => void;
  onChordRemove: (progressionId: string, chordIndex: number) => void;
  onUpdateChordVoicing: (progressionId: string, chordIndex: number, voicing: ChordVoicing | undefined) => void;
  onAddChord: (progressionId: string, chordName: string) => void;
  onUpdateChordBeats: (progressionId: string, chordIndex: number, beats: number) => void;
  onAddProgression?: () => void;
  onCreatePairing: (name: string, progressionIds: string[]) => string | null;
  onDeletePairing: (pairingId: string) => void;
  onRenamePairing: (pairingId: string, name: string) => void;
  onReorderPairingProgressions: (pairingId: string, oldIndex: number, newIndex: number) => void;
  tuning: Tuning;
  capoSettings: CapoSettings;
  bpm: number;
}

export default function SongProgressions({
  progressions,
  pairings,
  timeSignature,
  onReorderProgressions,
  onEditProgression,
  onUpdateProgressionBpm,
  onDeleteProgression,
  onChordReorder,
  onChordReplace,
  onChordRemove,
  onUpdateChordVoicing,
  onAddChord,
  onUpdateChordBeats,
  onAddProgression,
  onCreatePairing,
  onDeletePairing,
  onRenamePairing,
  onReorderPairingProgressions,
  tuning,
  capoSettings,
  bpm
}: SongProgressionsProps) {
  const [expandedProgressions, setExpandedProgressions] = useState<Set<string>>(new Set());
  const [newlyCreatedProgression, setNewlyCreatedProgression] = useState<string | null>(null);
  const [pairingMode, setPairingMode] = useState(false);
  const [selectedForPairing, setSelectedForPairing] = useState<Set<string>>(new Set());
  const [pairingName, setPairingName] = useState('');
  const [showPairingNameInput, setShowPairingNameInput] = useState(false);
  const [activePairingId, setActivePairingId] = useState<string | null>(null);
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

  const togglePairingSelection = (progressionId: string) => {
    setSelectedForPairing(prev => {
      const newSet = new Set(prev);
      if (newSet.has(progressionId)) {
        newSet.delete(progressionId);
      } else {
        newSet.add(progressionId);
      }
      return newSet;
    });
  };

  const handleCreatePairingConfirm = () => {
    const name = pairingName.trim() || `Pair ${pairings.length + 1}`;
    const newId = onCreatePairing(name, Array.from(selectedForPairing));
    if (newId) setActivePairingId(newId);
    setPairingMode(false);
    setSelectedForPairing(new Set());
    setPairingName('');
    setShowPairingNameInput(false);
  };

  const cancelPairingMode = () => {
    setPairingMode(false);
    setSelectedForPairing(new Set());
    setPairingName('');
    setShowPairingNameInput(false);
  };

  return (
    <div className="space-y-4" ref={progressionsRef}>
      {/* Pairing Chips */}
      {pairings.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
            Pairings:
          </span>
          {pairings.map(pairing => (
            <button
              key={pairing.id}
              className={`pairing-chip ${activePairingId === pairing.id ? 'pairing-chip--active' : ''}`}
              onClick={() => setActivePairingId(activePairingId === pairing.id ? null : pairing.id)}
            >
              <span>{pairing.name}</span>
              <span
                className="pairing-chip__remove"
                onClick={(e) => { e.stopPropagation(); onDeletePairing(pairing.id); if (activePairingId === pairing.id) setActivePairingId(null); }}
                title="Remove pairing"
              >
                &times;
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active Pairing Panel */}
      {activePairingId && (() => {
        const pairing = pairings.find(p => p.id === activePairingId);
        if (!pairing) return null;
        const pairedProgressions = pairing.progressionIds
          .map(id => progressions.find(p => p.id === id))
          .filter((p): p is NamedProgression => p !== undefined);
        return (
          <PairedProgressionPanel
            pairing={pairing}
            progressions={pairedProgressions}
            timeSignature={timeSignature}
            bpm={bpm}
            onUpdateChordBeats={onUpdateChordBeats}
            onRenamePairing={onRenamePairing}
            onDeletePairing={(id) => { onDeletePairing(id); setActivePairingId(null); }}
            onReorderPairingProgressions={onReorderPairingProgressions}
            onClose={() => setActivePairingId(null)}
          />
        );
      })()}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
            Chord Progressions ({progressions.length})
          </h3>
          {onAddProgression && !pairingMode && (
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
        {progressions.length >= 2 && !pairingMode && (
          <button
            className="themed-btn-secondary"
            style={{ fontSize: '0.8rem', padding: '4px 12px' }}
            onClick={() => setPairingMode(true)}
          >
            Pair
          </button>
        )}
        {pairingMode && (
          <span className="text-sm" style={{ color: 'var(--accent)', fontFamily: 'var(--font-ui)' }}>
            Select 2+ progressions to pair
          </span>
        )}
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
            <div key={progression.id} className="relative">
              {pairingMode && (
                <div
                  className="absolute inset-0 z-10 flex items-center cursor-pointer rounded-xl"
                  style={{
                    background: selectedForPairing.has(progression.id) ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent',
                    border: selectedForPairing.has(progression.id) ? '2px solid var(--accent)' : '2px solid transparent',
                    borderRadius: '0.75rem',
                  }}
                  onClick={() => togglePairingSelection(progression.id)}
                >
                  <div className="ml-4">
                    <div
                      style={{
                        width: 22, height: 22,
                        borderRadius: 4,
                        border: `2px solid ${selectedForPairing.has(progression.id) ? 'var(--accent)' : 'var(--border)'}`,
                        background: selectedForPairing.has(progression.id) ? 'var(--accent)' : 'var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {selectedForPairing.has(progression.id) && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <SortableProgressionItem
                progression={progression}
                isExpanded={!pairingMode && expandedProgressions.has(progression.id)}
                onToggle={() => !pairingMode && toggleExpanded(progression.id)}
                onEdit={onEditProgression}
                onDelete={onDeleteProgression}
                onChordReorder={onChordReorder}
                onChordReplace={onChordReplace}
                onChordRemove={onChordRemove}
                onUpdateChordVoicing={onUpdateChordVoicing}
                onAddChord={onAddChord}
                onUpdateProgressionBpm={onUpdateProgressionBpm}
                tuning={tuning}
                capoSettings={capoSettings}
                songBpm={bpm}
                isNewlyCreated={newlyCreatedProgression === progression.id}
              />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {/* Pairing Mode Action Bar */}
      {pairingMode && (
        <div className="pairing-select-bar">
          {showPairingNameInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={pairingName}
                onChange={e => setPairingName(e.target.value)}
                placeholder="Pairing name..."
                className="themed-input"
                style={{ width: 180, fontSize: '0.85rem', padding: '6px 10px' }}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleCreatePairingConfirm(); }}
              />
              <button className="themed-btn-primary" onClick={handleCreatePairingConfirm}>
                Create
              </button>
              <button className="themed-btn-secondary" onClick={cancelPairingMode}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="themed-btn-primary"
                disabled={selectedForPairing.size < 2}
                onClick={() => setShowPairingNameInput(true)}
              >
                Create Pair ({selectedForPairing.size} selected)
              </button>
              <button className="themed-btn-secondary" onClick={cancelPairingMode}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
