import { useState, useEffect, useRef } from 'react';
import type { NamedProgression, ChordPairing, TimeSignature } from '../types/song';
import type { ChordVoicing } from '../types/chord';
import type { Lead } from '../types/lead';
import type { LeadNote } from '../types/lead';
import type { Tuning, CapoSettings } from '../lib/tunings';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SortableChordGrid from './SortableChordGrid';
import { EditableText } from './EditableText';
import { AddChordPanel } from './AddChordPanel';
import { PairedProgressionPanel } from './PairedProgressionPanel';
import LeadSelector from './LeadSelector';
import LeadEditor from './LeadEditor';
import type { ProgressionAnalysis, ChordAnalysis, HarmonicContext } from '../lib/harmonicAnalysis';
import HarmonicAnalysisPanel from './HarmonicAnalysisPanel';

interface SortableProgressionItemProps {
  progression: NamedProgression;
  onEdit: (progressionId: string, field: 'name', value: string) => void;
  onDelete: (progressionId: string) => void;
  onChordReorder: (progressionId: string, oldIndex: number, newIndex: number) => void;
  onChordReplace: (progressionId: string, chordIndex: number) => void;
  onChordRemove: (progressionId: string, chordIndex: number) => void;
  onUpdateChordVoicing: (progressionId: string, chordIndex: number, voicing: ChordVoicing | undefined) => void;
  onAddChord: (progressionId: string, chordName: string) => void;
  onAddChordWithVoicing: (progressionId: string, name: string, notes: string[], voicing: ChordVoicing) => void;
  tuning: Tuning;
  capoSettings: CapoSettings;
  bpm: number;
  beatsPerMeasure: number;
  isNewlyCreated?: boolean;
  activeLeadNotes?: string[];
  nextProgressionFirstChord?: import('../types/chord').Chord;
  chordAnalyses?: ChordAnalysis[];
  harmonicContext?: HarmonicContext;
}

function SortableProgressionItem({
  progression,
  onEdit,
  onDelete,
  onChordReorder,
  onChordReplace,
  onChordRemove,
  onUpdateChordVoicing,
  onAddChord,
  onAddChordWithVoicing,
  tuning,
  capoSettings,
  bpm,
  beatsPerMeasure,
  isNewlyCreated = false,
  activeLeadNotes,
  nextProgressionFirstChord,
  chordAnalyses,
  harmonicContext,
}: SortableProgressionItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddChord, setShowAddChord] = useState(false);

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
      <div className="flex items-center p-3 gap-3">
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

      {/* Chord Diagrams + Add Form */}
      <div className="px-3 pb-3">
        {/* Add Chord toggle */}
        {!showAddChord ? (
          <div className="mb-3">
            <button
              onClick={() => setShowAddChord(true)}
              className="text-sm font-medium rounded px-2 py-1 transition-colors"
              style={{
                color: 'var(--accent)',
                background: 'transparent',
                border: '1px solid var(--accent)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--accent)';
              }}
            >
              + Add Chord
            </button>
          </div>
        ) : (
          <AddChordPanel
            tuning={tuning}
            onAddChord={async (chordName) => { await onAddChord(progression.id, chordName); setShowAddChord(false); }}
            onAddVoicing={(name, notes, voicing) => { onAddChordWithVoicing(progression.id, name, notes, voicing); setShowAddChord(false); }}
            onClose={() => setShowAddChord(false)}
          />
        )}

        {/* Chord Grid */}
        <SortableChordGrid
          progression={progression.chords}
          tuning={tuning}
          capoSettings={capoSettings}
          onReorder={(oldIndex, newIndex) => onChordReorder(progression.id, oldIndex, newIndex)}
          onReplace={(index) => onChordReplace(progression.id, index)}
          onRemove={(index) => onChordRemove(progression.id, index)}
          onUpdateVoicing={(index, voicing) => onUpdateChordVoicing(progression.id, index, voicing)}
          activeLeadNotes={activeLeadNotes}
          bpm={progression.bpm || bpm}
          beatsPerMeasure={beatsPerMeasure}
          nextProgressionFirstChord={nextProgressionFirstChord}
          chordAnalyses={chordAnalyses}
          harmonicContext={harmonicContext}
        />
      </div>
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
  onAddChordWithVoicing: (progressionId: string, name: string, notes: string[], voicing: ChordVoicing) => void;
  onUpdateChordBeats: (progressionId: string, chordIndex: number, beats: number) => void;
  onAddProgression?: () => void;
  onCreatePairing: (name: string, progressionIds: string[]) => string | null;
  onDeletePairing: (pairingId: string) => void;
  onRenamePairing: (pairingId: string, name: string) => void;
  onReorderPairingProgressions: (pairingId: string, oldIndex: number, newIndex: number) => void;
  tuning: Tuning;
  capoSettings: CapoSettings;
  bpm: number;
  songLeadIds: string[];
  allLeads: Lead[];
  activeLeadId: string | null;
  activeLeadNotes: string[];
  onActivateLead: (leadId: string | null) => void;
  onCreateLead: (name: string, notes: LeadNote[], tuningId: string) => void;
  onDeleteLead: (leadId: string) => void;
  onAssociateLeadWithSong: (leadId: string) => void;
  onDissociateLeadFromSong: (leadId: string) => void;
  songName: string;
  analysisEnabled?: boolean;
  progressionAnalysis?: ProgressionAnalysis | null;
  onToggleAnalysis?: () => void;
}

export default function SongProgressions({
  progressions,
  pairings,
  timeSignature,
  onReorderProgressions,
  onEditProgression,
  onUpdateProgressionBpm: _onUpdateProgressionBpm,
  onDeleteProgression,
  onChordReorder,
  onChordReplace,
  onChordRemove,
  onUpdateChordVoicing,
  onAddChord,
  onAddChordWithVoicing,
  onUpdateChordBeats,
  onAddProgression,
  onCreatePairing,
  onDeletePairing,
  onRenamePairing,
  onReorderPairingProgressions,
  tuning,
  capoSettings,
  bpm,
  songLeadIds,
  allLeads,
  activeLeadId,
  activeLeadNotes,
  onActivateLead,
  onCreateLead,
  onDeleteLead: _onDeleteLead,
  onAssociateLeadWithSong,
  onDissociateLeadFromSong,
  songName,
  analysisEnabled,
  progressionAnalysis,
  onToggleAnalysis,
}: SongProgressionsProps) {
  const [newlyCreatedProgression, setNewlyCreatedProgression] = useState<string | null>(null);
  const [pairingMode, setPairingMode] = useState(false);
  const [selectedForPairing, setSelectedForPairing] = useState<Set<string>>(new Set());
  const [pairingName, setPairingName] = useState('');
  const [showPairingNameInput, setShowPairingNameInput] = useState(false);
  const [activePairingId, setActivePairingId] = useState<string | null>(null);
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [showLeadEditor, setShowLeadEditor] = useState(false);
  const progressionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressions.length === 1) {
      setNewlyCreatedProgression(progressions[0].id);
    } else if (progressions.length > 1) {
      const emptyProgressions = progressions.filter(p => p.chords.length === 0).map(p => p.id);
      if (emptyProgressions.length > 0) {
        setNewlyCreatedProgression(emptyProgressions[0]);
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

      {/* Lead Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
          Leads:
        </span>
        {allLeads.filter(l => songLeadIds.includes(l.id)).map(lead => (
          <button
            key={lead.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: activeLeadId === lead.id ? 'var(--lead)' : 'var(--lead-subtle)',
              color: activeLeadId === lead.id ? '#000' : 'var(--text)',
              border: `1px solid var(--lead)`,
            }}
            onClick={() => onActivateLead(activeLeadId === lead.id ? null : lead.id)}
          >
            <span>{lead.name}</span>
            <span
              className="ml-1 opacity-60 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onDissociateLeadFromSong(lead.id); }}
              title="Remove from song"
            >
              &times;
            </span>
          </button>
        ))}
        <div style={{ position: 'relative' }}>
          <button
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              color: 'var(--lead)',
              border: '1px dashed var(--lead)',
              background: 'transparent',
            }}
            onClick={() => setShowLeadSelector(!showLeadSelector)}
          >
            + Lead
          </button>
          {showLeadSelector && (
            <LeadSelector
              songLeadIds={songLeadIds}
              allLeads={allLeads}
              activeLeadId={activeLeadId}
              currentTuning={tuning}
              onActivateLead={onActivateLead}
              onAssociateLead={onAssociateLeadWithSong}
              onDissociateLead={onDissociateLeadFromSong}
              onNewLead={() => setShowLeadEditor(true)}
              onClose={() => setShowLeadSelector(false)}
            />
          )}
        </div>
      </div>

      {/* Analysis Toggle Chip */}
      {onToggleAnalysis && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
            Analysis:
          </span>
          <button
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: analysisEnabled ? 'var(--analysis)' : 'var(--analysis-subtle)',
              color: analysisEnabled ? '#000' : 'var(--text)',
              border: '1px solid var(--analysis)',
            }}
            onClick={onToggleAnalysis}
          >
            {analysisEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {/* Harmonic Analysis Panel */}
      {analysisEnabled && progressionAnalysis && (
        <HarmonicAnalysisPanel analysis={progressionAnalysis} />
      )}

      {/* Lead Editor Modal */}
      {showLeadEditor && (
        <LeadEditor
          tuning={tuning}
          capoSettings={capoSettings}
          onSave={(name, notes) => {
            const taggedName = songName ? `${name} — ${songName}` : name;
            onCreateLead(taggedName, notes, tuning.id);
            setShowLeadEditor(false);
          }}
          onCancel={() => setShowLeadEditor(false)}
        />
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
          {progressions.map((progression, progIdx) => (
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
                onEdit={onEditProgression}
                onDelete={onDeleteProgression}
                onChordReorder={onChordReorder}
                onChordReplace={onChordReplace}
                onChordRemove={onChordRemove}
                onUpdateChordVoicing={onUpdateChordVoicing}
                onAddChord={onAddChord}
                onAddChordWithVoicing={onAddChordWithVoicing}
                tuning={tuning}
                capoSettings={capoSettings}
                bpm={bpm}
                beatsPerMeasure={timeSignature.beatsPerMeasure}
                isNewlyCreated={newlyCreatedProgression === progression.id}
                activeLeadNotes={activeLeadNotes}
                nextProgressionFirstChord={
                  progIdx < progressions.length - 1 && progressions[progIdx + 1].chords.length > 0
                    ? progressions[progIdx + 1].chords[0]
                    : undefined
                }
                chordAnalyses={
                  analysisEnabled && progressionAnalysis
                    ? progressionAnalysis.chords.slice(
                        progressions.slice(0, progIdx).reduce((sum, p) => sum + p.chords.length, 0),
                        progressions.slice(0, progIdx).reduce((sum, p) => sum + p.chords.length, 0) + progression.chords.length
                      )
                    : undefined
                }
                harmonicContext={
                  analysisEnabled && progressionAnalysis ? progressionAnalysis.context : undefined
                }
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
