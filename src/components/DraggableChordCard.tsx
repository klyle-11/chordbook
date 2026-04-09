import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Chord, ChordVoicing, SavedVoicing } from '../types/chord';
import type { Tuning } from '../lib/tunings';
import { findVoicingsForNotes } from '../lib/savedVoicingLibrary';
import { ChordDiagram } from './ChordDiagram';

interface DraggableChordCardProps {
  chord: Chord;
  index: number;
  tuning: Tuning;
  onRemove: (index: number) => void;
  onUpdateVoicing?: (index: number, voicing: ChordVoicing | undefined) => void;
  activeLeadNotes?: string[];
  isSelected?: boolean;
  onSelect?: (index: number) => void;
}

export default function DraggableChordCard({
  chord,
  index,
  tuning,
  onRemove,
  onUpdateVoicing,
  activeLeadNotes,
  isSelected = false,
  onSelect,
}: DraggableChordCardProps) {
  const [savedVoicings, setSavedVoicings] = useState<SavedVoicing[]>([]);
  const [showVoicingPicker, setShowVoicingPicker] = useState(false);

  useEffect(() => {
    if (chord.notes.length === 0) return;
    let cancelled = false;
    findVoicingsForNotes(chord.notes, tuning.id).then(v => {
      if (!cancelled) setSavedVoicings(v);
    });
    return () => { cancelled = true; };
  }, [chord.notes, tuning.id]);

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

  function fretLabel(frets: (number | null)[]): string {
    return frets.map(f => f === null ? 'X' : f).join(' ');
  }

  function isActive(v: SavedVoicing): boolean {
    if (!chord.voicing || chord.voicing.tuningId !== tuning.id) return false;
    return v.frets.length === chord.voicing.frets.length &&
      v.frets.every((f, i) => f === chord.voicing!.frets[i]);
  }

  return (
    <div>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          background: 'var(--bg-card)',
          borderColor: isSelected ? 'var(--glow)' : isDragging ? 'var(--glow)' : 'var(--border)',
          boxShadow: isSelected ? '0 0 8px var(--glow-subtle)' : undefined,
        }}
        {...attributes}
        data-chord-diagram
        className={`rounded-lg p-2 transition-all duration-200 border-2 shadow-sm cursor-pointer ${
          isDragging ? 'opacity-70 shadow-2xl z-50 scale-105' : ''
        }`}
        onClick={() => onSelect?.(index)}
      >
      {/* Compact header: drag handle + action buttons */}
      <div className="flex items-center justify-between mb-1">
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-3 h-3" viewBox="0 0 10 10" fill="currentColor">
            <circle cx="3" cy="2" r="1" /><circle cx="7" cy="2" r="1" />
            <circle cx="3" cy="5" r="1" /><circle cx="7" cy="5" r="1" />
            <circle cx="3" cy="8" r="1" /><circle cx="7" cy="8" r="1" />
          </svg>
        </div>
        <div className="flex gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {savedVoicings.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowVoicingPicker(!showVoicingPicker)}
                className="px-1 py-0.5 rounded transition-colors"
                style={{
                  background: showVoicingPicker ? 'var(--accent)' : 'transparent',
                  color: showVoicingPicker ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.6rem',
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
            onClick={() => onRemove(index)}
            className="px-1 py-0.5 rounded transition-colors"
            style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}
            title="Remove chord"
          >
            ×
          </button>
        </div>
      </div>

      {/* Chord diagram (TAB when voicing exists, dot-style otherwise) */}
      <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
        <ChordDiagram
          chordName={chord.name}
          tuning={tuning}
          voicing={chord.voicing}
          activeLeadNotes={activeLeadNotes}
        />
      </div>
      </div>
    </div>
  );
}
