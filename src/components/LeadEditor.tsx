import { useState, useCallback } from 'react';
import type { Tuning, CapoSettings } from '../lib/tunings';
import type { LeadNote } from '../types/lead';
import LeadFretboardDiagram from './LeadFretboardDiagram';
import LeadNoteSequence from './LeadNoteSequence';
import { audioPlayer } from '../lib/audioPlayer';

interface LeadEditorProps {
  tuning: Tuning;
  capoSettings: CapoSettings;
  onSave: (name: string, notes: LeadNote[]) => void;
  onCancel: () => void;
  initialName?: string;
  initialNotes?: LeadNote[];
}

export default function LeadEditor({ tuning, capoSettings, onSave, onCancel, initialName = '', initialNotes = [] }: LeadEditorProps) {
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState<LeadNote[]>(initialNotes);

  const handleAddNote = useCallback((note: string, stringIndex: number, fret: number) => {
    setNotes(prev => [...prev, { note, stringIndex, fret }]);
  }, []);

  const handleRemoveNote = useCallback((index: number) => {
    setNotes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = () => {
    if (!name.trim() || notes.length === 0) return;
    onSave(name.trim(), notes);
  };

  const handlePreview = async () => {
    for (const n of notes) {
      await audioPlayer.playNote(n.note, 0.3, tuning.displayStrings[n.stringIndex], n.fret, n.stringIndex, tuning);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay-bg)' }}>
      <div
        className="w-full max-w-2xl mx-4 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out] max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {initialNotes.length > 0 ? 'Edit Lead' : 'New Lead'}
          </h2>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
            onClick={onCancel}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Lead name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Verse melody, Solo, Riff..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text)',
              }}
              autoFocus
            />
          </div>

          {/* Fretboard */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Fretboard
            </label>
            <LeadFretboardDiagram
              tuning={tuning}
              capoSettings={capoSettings}
              currentLeadNotes={notes}
              onAddNote={handleAddNote}
            />
          </div>

          {/* Note sequence */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Sequence ({notes.length} note{notes.length !== 1 ? 's' : ''})
              </label>
              {notes.length > 0 && (
                <button
                  className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                  style={{ color: 'var(--lead)' }}
                  onClick={handlePreview}
                >
                  Preview
                </button>
              )}
            </div>
            <LeadNoteSequence notes={notes} onRemoveNote={handleRemoveNote} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            style={{
              background: 'var(--lead)',
              color: '#000',
            }}
            onClick={handleSave}
            disabled={!name.trim() || notes.length === 0}
          >
            {initialNotes.length > 0 ? 'Save changes' : 'Create lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
