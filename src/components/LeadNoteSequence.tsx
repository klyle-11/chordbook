import type { LeadNote } from '../types/lead';

interface LeadNoteSequenceProps {
  notes: LeadNote[];
  onRemoveNote: (index: number) => void;
}

export default function LeadNoteSequence({ notes, onRemoveNote }: LeadNoteSequenceProps) {
  if (notes.length === 0) {
    return (
      <div className="py-3 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Hold a fret to add notes to the lead sequence
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 py-2">
      {notes.map((note, index) => (
        <div
          key={`${note.note}-${note.stringIndex}-${note.fret}-${index}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors group"
          style={{
            background: 'var(--lead-subtle)',
            color: 'var(--text)',
            border: '1px solid var(--lead)',
          }}
        >
          <span className="font-bold">{note.note}</span>
          <span style={{ color: 'var(--text-muted)' }}>
            s{note.stringIndex + 1}f{note.fret}
          </span>
          <button
            className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--danger)' }}
            onClick={() => onRemoveNote(index)}
            title="Remove note"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
