import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { Tuning } from '../lib/tunings';
import { getNotesFromVoicing, getFretsForNoteOnString } from '../lib/fretUtils';
import { saveVoicing } from '../lib/savedVoicingLibrary';

export interface ChordVoicingEditorRef {
  setFretForString: (stringIndex: number, fret: number) => void;
}

interface ChordVoicingEditorProps {
  tuning: Tuning;
  initialFrets?: (number | null)[];
  chordName?: string;
  onApply: (frets: (number | null)[]) => void;
  onCancel: () => void;
}

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// Map for flat → sharp equivalents
const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B',
  'D♭': 'C#', 'E♭': 'D#', 'F♭': 'E', 'G♭': 'F#', 'A♭': 'G#', 'B♭': 'A#', 'C♭': 'B',
};

function parseNoteInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Capitalize first letter, keep the rest
  const normalized = trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
  // Check flat alias
  if (FLAT_TO_SHARP[normalized]) return FLAT_TO_SHARP[normalized];
  // Check direct chromatic match
  if (CHROMATIC.includes(normalized)) return normalized;
  // Try just the first letter (e.g., user typed "c" → "C")
  const letter = trimmed[0].toUpperCase();
  if (CHROMATIC.includes(letter) && trimmed.length === 1) return letter;
  return null;
}

const ChordVoicingEditor = forwardRef<ChordVoicingEditorRef, ChordVoicingEditorProps>(({
  tuning,
  initialFrets,
  chordName,
  onApply,
  onCancel,
}, ref) => {
  const stringCount = tuning.displayStrings.length;
  const [frets, setFrets] = useState<(number | null)[]>(() => {
    if (initialFrets && initialFrets.length === stringCount) return [...initialFrets];
    return Array(stringCount).fill(null);
  });
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [lastFilledString, setLastFilledString] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Expose method so parent can push fret clicks from the fretboard
  useImperativeHandle(ref, () => ({
    setFretForString(stringIndex: number, fret: number) {
      setFrets(prev => {
        const next = [...prev];
        next[stringIndex] = fret;
        return next;
      });
      // Flash highlight on the filled row
      setLastFilledString(stringIndex);
      setTimeout(() => setLastFilledString(null), 600);
    },
  }));

  // Reset frets when tuning changes
  useEffect(() => {
    if (!initialFrets || initialFrets.length !== stringCount) {
      setFrets(Array(stringCount).fill(null));
    }
  }, [tuning.id, stringCount, initialFrets]);

  const derivedNotes = getNotesFromVoicing(tuning, frets);

  function handleFretChange(index: number, value: string) {
    const newFrets = [...frets];
    if (value === '' || value.toLowerCase() === 'x') {
      newFrets[index] = null;
      setFrets(newFrets);
      return;
    }

    // Try parsing as a number first
    const num = parseInt(value, 10);
    if (!isNaN(num) && String(num) === value.trim() && num >= 0 && num <= 24) {
      newFrets[index] = num;
      setFrets(newFrets);
      return;
    }

    // Try parsing as a note name
    const noteName = parseNoteInput(value);
    if (noteName) {
      const stringRoot = tuning.displayStrings[index];
      const possibleFrets = getFretsForNoteOnString(stringRoot, noteName).filter(f => f <= 24);
      if (possibleFrets.length > 0) {
        // Pick the lowest fret (most common voicing position)
        newFrets[index] = possibleFrets[0];
        setFrets(newFrets);
      }
    }
  }

  function handleInputKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    // Arrow up/down to navigate between strings
    if (e.key === 'ArrowDown' && index < stringCount - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
    }
    // Enter to apply
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (frets.some(f => f !== null)) {
        onApply(frets);
      }
    }
  }

  function toggleMute(index: number) {
    const newFrets = [...frets];
    newFrets[index] = newFrets[index] === null ? 0 : null;
    setFrets(newFrets);
  }

  async function handleSaveToLibrary() {
    if (!saveName.trim()) return;
    const notes = getNotesFromVoicing(tuning, frets);
    await saveVoicing({
      name: saveName.trim(),
      tuningId: tuning.id,
      frets: [...frets],
      notes,
    });
    setSaveStatus(`Saved "${saveName.trim()}" to library`);
    setShowSaveForm(false);
    setSaveName('');
    setTimeout(() => setSaveStatus(null), 2000);
  }

  const hasAnyFret = frets.some(f => f !== null);

  // Compute display value for each input — show the fret number, or empty for muted
  function displayValue(index: number): string {
    const f = frets[index];
    return f === null ? '' : String(f);
  }

  return (
    <div className="rounded-lg p-4 mt-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
          Voicing Editor {chordName && <span style={{ color: 'var(--text-secondary)' }}>— {chordName}</span>}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Type fret # or note name
          </span>
          <button
            onClick={onCancel}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* TAB-style string inputs */}
      <div className="space-y-1">
        {tuning.displayStrings.map((stringName, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded px-1 transition-colors"
            style={{
              background: lastFilledString === i ? 'var(--accent-subtle)' : 'transparent',
            }}
          >
            <span
              className="w-8 text-right text-sm font-mono font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {stringName}
            </span>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <input
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                value={displayValue(i)}
                onChange={e => handleFretChange(i, e.target.value)}
                onKeyDown={e => handleInputKeyDown(i, e)}
                onFocus={e => e.target.select()}
                placeholder="X"
                className="w-14 text-center text-sm py-1 rounded font-mono"
                style={{
                  background: lastFilledString === i ? 'var(--accent-subtle)' : 'var(--bg-card)',
                  border: `1px solid ${lastFilledString === i ? 'var(--accent)' : 'var(--border)'}`,
                  color: frets[i] === null ? 'var(--text-secondary)' : 'var(--text)',
                  transition: 'border-color 0.15s ease, background 0.3s ease',
                }}
                aria-label={`Fret for string ${stringName}`}
              />
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
            <button
              onClick={() => toggleMute(i)}
              className="text-xs px-2 py-1 rounded transition-colors font-mono"
              style={{
                background: frets[i] === null ? 'var(--danger)' : 'var(--bg-card)',
                color: frets[i] === null ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
              title={frets[i] === null ? 'Unmute (set to open)' : 'Mute string'}
            >
              {frets[i] === null ? 'X' : 'M'}
            </button>
            {/* Show derived note for this string */}
            {frets[i] !== null && (
              <span className="w-8 text-xs font-mono" style={{ color: 'var(--accent)' }}>
                {getNotesFromVoicing(tuning, frets.map((f, j) => j === i ? f : null)).join('')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Derived notes preview */}
      {hasAnyFret && (
        <div className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Notes: <span style={{ color: 'var(--text)', fontWeight: 500 }}>{derivedNotes.join(', ')}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onApply(frets)}
          disabled={!hasAnyFret}
          className="px-3 py-1.5 text-sm rounded transition-colors"
          style={{
            background: hasAnyFret ? 'var(--accent)' : 'var(--bg-card)',
            color: hasAnyFret ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            opacity: hasAnyFret ? 1 : 0.5,
          }}
        >
          Apply Voicing
        </button>
        <button
          onClick={() => setShowSaveForm(true)}
          disabled={!hasAnyFret}
          className="px-3 py-1.5 text-sm rounded transition-colors"
          style={{
            background: 'var(--bg-card)',
            color: hasAnyFret ? 'var(--text)' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            opacity: hasAnyFret ? 1 : 0.5,
          }}
        >
          Save to Library
        </button>
      </div>

      {/* Save form */}
      {showSaveForm && (
        <div className="mt-3 flex gap-2 items-center">
          <input
            type="text"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder={chordName ? `${chordName} voicing` : 'Voicing name'}
            className="flex-1 text-sm px-3 py-1.5 rounded"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSaveToLibrary(); }}
          />
          <button
            onClick={handleSaveToLibrary}
            disabled={!saveName.trim()}
            className="px-3 py-1.5 text-sm rounded transition-colors"
            style={{ background: 'var(--accent)', color: '#fff', opacity: saveName.trim() ? 1 : 0.5 }}
          >
            Save
          </button>
          <button
            onClick={() => { setShowSaveForm(false); setSaveName(''); }}
            className="px-3 py-1.5 text-sm rounded transition-colors"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Save status */}
      {saveStatus && (
        <div className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>{saveStatus}</div>
      )}
    </div>
  );
});

ChordVoicingEditor.displayName = 'ChordVoicingEditor';

export default ChordVoicingEditor;
